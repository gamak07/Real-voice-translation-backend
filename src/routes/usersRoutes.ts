import express from "express";
import { protect } from "../middleware/AuthMiddleware";
import { getMeController } from "../controllers/usersController";
const router = express.Router();

router.get("/me", protect, getMeController);

export default router;
