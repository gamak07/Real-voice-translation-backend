import express from "express";
import {
  loginController,
  signUpController,
  verifyEmailController,
} from "../controllers/authController";

const router = express.Router();

router.post("/signup", signUpController);
router.post("/login", loginController);
router.get("/verify-email", verifyEmailController);

export default router;
