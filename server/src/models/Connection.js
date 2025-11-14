import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    // Linked AICOO User
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Platform (e.g., github, spotify, notion)
    platform: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // OAuth tokens
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },

    // Optional platform profile info
    profileId: { type: String, default: null },
    profileUrl: { type: String, default: null },

    // Status
    connected: { type: Boolean, default: false },
    connectedAt: { type: Date, default: null },

    // Sync info
    lastSync: { type: Date, default: null },
    tokenExpiresAt: { type: Date, default: null },
    lastError: { type: String, default: null },

    // Notion-specific fields
    botId: { type: String, default: null },
    notionDatabaseId: { type: String, default: null },
    notionReportsPageId: { type: String, default: null },
    notionHomePageId: { type: String, default: null },

    // Notion / Dashboard metadata (ONE metadata object ONLY)
    metadata: {
      type: new mongoose.Schema(
        {
          dailyDashboardDbId: { type: String, default: null },
        },
        { _id: false }
      ),
      default: {},
    },
  },
  { timestamps: true }
);

// Unique per platform per user
connectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export default mongoose.model("Connection", connectionSchema);
