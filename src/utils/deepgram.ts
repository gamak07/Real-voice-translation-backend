import { DeepgramClient } from "@deepgram/sdk";

const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! });

export const createDeepgramLiveSession = async (
  sourceLanguage: string,
  onTranscript: (transcript: string) => void,
  onError: (error: Error) => void,
) => {
  // v5 uses client.listen.v1.connect() and is async
  const connection = await deepgram.listen.v1.connect({
    Authorization: `Token ${process.env.DEEPGRAM_API_KEY!}`,
    model: "nova-3",
    language: sourceLanguage,
    punctuate: "true",
    smart_format: "true",
    encoding: "linear16",
    sample_rate: 16000,
    interim_results: "true",
  });

  // Fires when connection is opened
  connection.on("open", () => {
    console.log("Deepgram connection opened");
  });

  // Fires when Deepgram returns a transcript
  connection.on("message", (data: any) => {
    if (data.type === "Results") {
      const transcript = data?.channel?.alternatives[0]?.transcript;
      const isFinal = data?.is_final;

      if (transcript && isFinal) {
        onTranscript(transcript);
      }
    }
  });

  connection.on("error", (error: Error) => {
    console.error("Deepgram error:", error);
    onError(error);
  });

  connection.on("close", () => {
    console.log("Deepgram connection closed");
  });

  // Connect and wait for the connection to open
  connection.connect();
  await connection.waitForOpen();

  return connection;
};
