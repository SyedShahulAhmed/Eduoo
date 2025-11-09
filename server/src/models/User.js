import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullname: { type: String },
  username: { type: String, unique: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  avatarUrl: { type: String, default: "" },
  bio: { type: String, default: "" },
  isEmailVerified: { type: Boolean, default: false },
  googleId: { type: String },
  createdAt: { type: Date, default: Date.now },
  streaks: {
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: null },
  },
  achievements: { type: [String], default: [] },
  totalGoalsCompleted: { type: Number, default: 0 },
});

export default mongoose.model("User", userSchema);
