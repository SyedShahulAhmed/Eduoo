import { ENV } from "../config/env.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs"
import OTP from "../models/OTP.js";
import { sendOTPEmail } from "../services/mail.service.js";

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile fetched successfully", user });
  } catch (error) {
    console.error("❌ getUserProfile Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
// ✅ Update profile details (text only)
export const updateUserProfile = async (req, res) => {
  try {
    const { fullName, username, bio } = req.body;
    const userId = req.user.id;

    // Find the logged-in user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if username is already taken (by another user)
    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing && existing._id.toString() !== userId)
        return res.status(400).json({ message: "Username already taken" });
    }

    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (username) user.username = username;
    if (bio) user.bio = bio;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        bio: user.bio,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("❌ updateUserProfile Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// ✅ Change user password
export const changeUserPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 1️⃣ Validate inputs
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Old and new passwords are required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Old password is incorrect" });

    // 3️⃣ Prevent using same password again
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      return res.status(400).json({ message: "New password must be different" });

    // 4️⃣ Validate new password strength (same rule as signup)
    const regex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.",
      });
    }

    // 5️⃣ Hash and update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("❌ changeUserPassword Error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * 1️⃣ Request OTP for new email
 * Route: POST /api/user/request-email-change
 * Body: { newEmail }
 */
export const requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.user.id;

    if (!newEmail)
      return res.status(400).json({ message: "New email is required" });

    // Check if email already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser)
      return res.status(400).json({ message: "This email is already registered" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + ENV.OTP_EXPIRY_MINUTES * 60000);

    // Save OTP with email + userId
    await OTP.deleteMany({ email: newEmail });
    await OTP.create({ email: newEmail, otpHash, expiresAt, attempts: 0 });

    // Send OTP via email
    await sendOTPEmail(newEmail, otp);

    res.status(200).json({
      message: `OTP sent to ${newEmail}. Please verify to change your email.`,
      expiresIn: `${ENV.OTP_EXPIRY_MINUTES} minutes`,
    });
  } catch (error) {
    console.error("❌ requestEmailChange Error:", error);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

/**
 * 2️⃣ Verify OTP & change email
 * Route: POST /api/user/verify-email-change
 * Body: { newEmail, otp }
 */
export const verifyEmailChange = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    const userId = req.user.id;

    if (!newEmail || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const record = await OTP.findOne({ email: newEmail });
    if (!record)
      return res.status(400).json({ message: "No OTP found or expired" });

    // Check expiry
    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired. Please try again." });
    }

    // Compare OTP
    const isMatch = await bcrypt.compare(otp.toString(), record.otpHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= ENV.OTP_RESEND_LIMIT) {
        await OTP.deleteOne({ _id: record._id });
        return res.status(403).json({ message: "Too many failed attempts" });
      }

      return res.status(400).json({ message: "Invalid OTP. Try again." });
    }

    // Update email in User collection
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { email: newEmail, isEmailVerified: true },
      { new: true }
    ).select("-password");

    // Delete used OTP
    await OTP.deleteOne({ _id: record._id });

    res.status(200).json({
      message: "Email changed successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("❌ verifyEmailChange Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};