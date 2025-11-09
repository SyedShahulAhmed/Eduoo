import express from "express";
import { changeUserPassword, getUserProfile, requestEmailChange, updateUserProfile, verifyEmailChange } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// GET /api/user/profile (Protected)
router.get("/profile", authMiddleware, getUserProfile);

// ✅ PUT profile (update text fields)
router.put("/profile", authMiddleware, updateUserProfile);
router.put("/password", authMiddleware, changeUserPassword);
router.post("/request-email-change", authMiddleware, requestEmailChange);
router.post("/verify-email-change", authMiddleware, verifyEmailChange);
// router.delete("/delete", authMiddleware, deleteAccount);
export default router;
