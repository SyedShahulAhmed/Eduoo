import express from "express";
import { forgotPassword, loginUser, resetPassword, sendOTP, signupUser, verifyOTP } from "../controllers/auth.controller.js";
import { validateSignup } from "../middlewares/validate.middleware.js";

const router = express.Router();

// POST /api/auth/send-otp
router.post("/send-otp", sendOTP);

// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOTP);

// POST /api/auth/signup
router.post("/signup", validateSignup, signupUser);

// POST /api/auth/login
router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);


export default router;
