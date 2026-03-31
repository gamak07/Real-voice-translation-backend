import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { parse } from "url";
import { createDeepgramLiveSession } from "../utils/deepgram";
import { translateText } from "../utils/deepl";

type DeepgramConnection = Awaited<ReturnType<typeof createDeepgramLiveSession>>;

interface JwtPayload {
  userId: string;
}

interface ClientMessage {
  type: "config";
  sourceLanguage: string;
  targetLanguage: string;
}

const sendToClient = (ws: WebSocket, payload: object) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

export const setupWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    console.log("New WebSocket connection");

    // ─── Authenticate via token in query params ────────────────────────────────
    const { query } = parse(req.url || "", true);
    const token = query.token as string;

    if (!token) {
      sendToClient(ws, { type: "error", message: "Unauthorized. Token missing." });
      ws.close();
      return;
    }

    try {
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    } catch {
      sendToClient(ws, { type: "error", message: "Unauthorized. Invalid token." });
      ws.close();
      return;
    }

    let sourceLanguage = "en";
    let targetLanguage = "de";
    let deepgramConnection: DeepgramConnection | null = null;

    ws.on("message", async (data: Buffer | string) => {
      // ─── Handle config message (text) ───────────────────────────────────────
      if (typeof data === "string" || !Buffer.isBuffer(data)) {
        try {
          const message: ClientMessage = JSON.parse(data.toString());

          if (message.type === "config") {
            sourceLanguage = message.sourceLanguage;
            targetLanguage = message.targetLanguage;

            // ✅ Close existing Deepgram session if language changes
            if (deepgramConnection) {
              deepgramConnection.socket.close(); // v5: finish() not requestClose()
              deepgramConnection = null;
            }

            // ✅ await the async session creation
            deepgramConnection = await createDeepgramLiveSession(
              sourceLanguage,
              async (transcript) => {
                sendToClient(ws, { type: "transcript", text: transcript });

                try {
                  const translatedText = await translateText(
                    transcript,
                    targetLanguage,
                    sourceLanguage
                  );
                  sendToClient(ws, { type: "translation", text: translatedText });
                } catch (error) {
                  console.error("Translation error:", error);
                  sendToClient(ws, { type: "error", message: "Translation failed" });
                }
              },
              (error) => {
                sendToClient(ws, { type: "error", message: error.message });
              }
            );

            sendToClient(ws, { type: "ready", message: "Session configured. Ready to translate." });
          }
        } catch {
          sendToClient(ws, { type: "error", message: "Invalid message format" });
        }
        return;
      }

      // ─── Handle audio data (binary) ─────────────────────────────────────────
      // ✅ v5: send audio via connection.socket.send() not connection.send()
      if (Buffer.isBuffer(data) && deepgramConnection) {
        deepgramConnection.socket.send(data);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
      if (deepgramConnection) {
        deepgramConnection.socket.close(); // ✅ v5: finish() not requestClose()
        deepgramConnection = null;
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  console.log("WebSocket server initialized");
  return wss;
};