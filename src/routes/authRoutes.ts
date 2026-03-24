import express from "express";
import { signUpController } from "../controllers/authController";

const router = express.Router()

router.post("/signup", signUpController)

export default router