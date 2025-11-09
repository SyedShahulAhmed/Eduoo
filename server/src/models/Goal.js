import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ["daily","weekly", "monthly"], default: "weekly" },
  progress: { type: Number, default: 0 },
  target: { type: Number, default: 100 },
  status: { type: String, default: "active" }, // active | completed | paused
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Goal", goalSchema);
