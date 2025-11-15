import mongoose from "mongoose";

const MetadataSchema = new mongoose.Schema(
  {
    dailyDashboardDbId: { type: String, default: null }
  },
  { _id: false }
);

const connectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    platform: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    tokenExpiresAt: { type: Date, default: null },

    profileId: { type: String, default: null },
    profileUrl: { type: String, default: null },

    connected: { type: Boolean, default: false },
    connectedAt: { type: Date, default: null },

    lastSync: { type: Date, default: null },
    lastError: { type: String, default: null },

    botId: { type: String, default: null },

    // ⭐ THESE MUST BE AT ROOT LEVEL
    notionDatabaseId: { type: String, default: null },
    notionReportsPageId: { type: String, default: null },
    notionHomePageId: { type: String, default: null },

    // ⭐ ONLY dashboard metadata goes here
    metadata: { type: MetadataSchema, default: {} },
  },
  { timestamps: true }
);

connectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export default mongoose.model("Connection", connectionSchema);
