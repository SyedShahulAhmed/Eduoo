import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    /* 👤 AICOO User */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* 🎯 Goal Details */
    title: { type: String, required: true },
    type: { type: String, enum: ["daily", "weekly", "monthly"], default: "weekly" },
    progress: { type: Number, default: 0 },
    target: { type: Number, default: 100 },
    status: { type: String, default: "active" }, // active | completed | paused
    createdAt: { type: Date, default: Date.now },

    /* 📝 Notion Sync Fields */
    notionPageId: { type: String, default: null }, // page created/updated in Notion
    syncedAt: { type: Date, default: null },       // last sync timestamp
    needsSync: { type: Boolean, default: false },  // auto-marked when goal changes
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);
