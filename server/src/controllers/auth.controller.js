import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { sendOTPEmail } from "../services/mail.service.js";
import { ENV } from "../config/env.js";
// ---------------------------------------------------------------------------
// SEND OTP
// ---------------------------------------------------------------------------
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // 1️⃣ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2️⃣ Hash it
    const otpHash = await bcrypt.hash(otp, 10);

    // 3️⃣ Set expiry
    const expiryMinutes = parseInt(ENV.OTP_EXPIRY_MINUTES || "5");
    const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

    // 4️⃣ Remove old OTPs for this email
    await OTP.deleteMany({ email });

    // 5️⃣ Save new OTP
    await OTP.create({
      email,
      otpHash,
      expiresAt,
      attempts: 0,
    });

    // 6️⃣ Send email
    await sendOTPEmail(email, otp);

    // 7️⃣ Respond
    res.status(200).json({
      message: "OTP sent successfully",
      email,
      expiresIn: `${expiryMinutes} minutes`,
    });
  } catch (error) {
    console.error("❌ sendOTP Error:", error);
    res
      .status(500)
      .json({ message: "Failed to send OTP", error: error.message });
  }
};

// ---------------------------------------------------------------------------
// PLACEHOLDERS (to fill in later)
// ---------------------------------------------------------------------------
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // 1️⃣ Find the OTP record
    const record = await OTP.findOne({ email });
    if (!record) {
      return res.status(400).json({ message: "No OTP found or already used" });
    }

    // 2️⃣ Check if expired
    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: record._id });
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new one." });
    }

    // 3️⃣ Compare OTP with hashed OTP
    const isMatch = await bcrypt.compare(otp.toString(), record.otpHash);
    if (!isMatch) {
      // increment attempt counter
      record.attempts += 1;
      await record.save();

      if (record.attempts >= ENV.OTP_RESEND_LIMIT) {
        await OTP.deleteOne({ _id: record._id });
        return res
          .status(403)
          .json({ message: "Too many failed attempts. Request a new OTP." });
      }

      return res
        .status(400)
        .json({ message: "Invalid OTP. Please try again." });
    }

    // 4️⃣ Success → mark user as verified if exists
    const user = await User.findOne({ email });
    if (user) {
      user.isEmailVerified = true;
      await user.save();
    }

    // 5️⃣ Delete OTP record (used)
    await OTP.deleteOne({ _id: record._id });

    res.status(200).json({ message: "OTP verified successfully", email });
  } catch (error) {
    console.error("❌ verifyOTP Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const signupUser = async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;

    // 1️⃣ Ensure OTP verified first
    const otpExists = await OTP.findOne({ email });
    if (otpExists) {
      return res
        .status(400)
        .json({ message: "Please verify OTP before signup." });
    }

    // 2️⃣ Check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ message: "Email already registered." });

    const existingUsername = await User.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ message: "Username already taken." });

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create user
    const user = await User.create({
      fullname,
      username,
      email,
      password: hashedPassword,
      isEmailVerified: true,
      createdAt: new Date(),
    });

    // 5️⃣ Create tokens
    const token = jwt.sign({ id: user._id }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ id: user._id }, ENV.REFRESH_TOKEN_SECRET, {
      expiresIn: "30d",
    });

    // 6️⃣ Send response
    res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("❌ signupUser Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return res
        .status(400)
        .json({ message: "Email/Username and Password are required" });
    }

    // 1️⃣ Find user by email or username
    const user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid credentials" });

    // 3️⃣ Check email verification
    if (!user.isEmailVerified)
      return res.status(403).json({ message: "Email not verified" });

    // 4️⃣ Generate new tokens
    const token = jwt.sign({ id: user._id }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ id: user._id }, ENV.REFRESH_TOKEN_SECRET, {
      expiresIn: "30d",
    });

    // 5️⃣ Send response
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("❌ loginUser Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account found with this email" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + ENV.OTP_EXPIRY_MINUTES * 60000);

    // Remove existing OTPs for this email
    await OTP.deleteMany({ email });

    // Save OTP in DB
    await OTP.create({ email, otpHash, expiresAt, attempts: 0 });

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(200).json({
      message: `OTP sent to ${email}. It will expire in ${ENV.OTP_EXPIRY_MINUTES} minutes.`,
    });
  } catch (error) {
    console.error("❌ forgotPassword Error:", error);
    res
      .status(500)
      .json({ message: "Failed to send reset OTP", error: error.message });
  }
};

/**
 * 2️⃣ Reset Password — Verify OTP and set new password
 * Route: POST /api/auth/reset-password
 * Body: { email, otp, newPassword }
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required" });

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord)
      return res.status(400).json({ message: "No OTP found or expired" });

    // Check expiry
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }

    // Validate OTP
    const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      if (otpRecord.attempts >= ENV.OTP_RESEND_LIMIT) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(403).json({ message: "Too many failed attempts" });
      }

      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Validate password strength
    const regex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(newPassword))
      return res.status(400).json({
        message:
          "Password must be at least 8 chars and include uppercase, lowercase, number, and special char.",
      });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in user record
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    // Delete OTP after success
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("❌ resetPassword Error:", error);
    res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
};