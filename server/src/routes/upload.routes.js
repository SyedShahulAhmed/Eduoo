import express from "express";
import { uploadAvatar } from "../controllers/upload.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protected route → JWT required
router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);

export default router;
