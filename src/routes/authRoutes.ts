import express from "express";
import {
  loginController,
  oauthCallbackController,
  signUpController,
  verifyEmailController,
} from "../controllers/authController";
import passport from "../config/passport";

const router = express.Router();

router.post("/signup", signUpController);
router.post("/login", loginController);
router.get("/verify-email", verifyEmailController);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=Google authentication failed`,
    session: false,
  }),
  oauthCallbackController,
);

// ─── GitHub OAuth ──────────────────────────────────────────────────────────────
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=GitHub authentication failed`,
    session: false,
  }),
  oauthCallbackController,
);

export default router;
