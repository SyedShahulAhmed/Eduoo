import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    /** Linked AICOO User */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /** Platform identifier (e.g. 'github', 'spotify', 'leetcode', etc.) */
    platform: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /** OAuth tokens (if applicable) */
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },

    /** Username or profile ID for non-OAuth platforms */
    profileId: { type: String, default: null }, // ✅ renamed for consistency with controllers
    profileUrl: { type: String, default: null }, // 🌐 optional (for frontend use)

    /** Whether connection is active */
    connected: { type: Boolean, default: false },

    /** Optional extra metadata for analytics or platform stats */
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    /** Last successful sync timestamp */
    lastSync: { type: Date, default: null },

    /** When the OAuth token expires (if relevant) */
    tokenExpiresAt: { type: Date, default: null },

    /** Optional error tracking */
    lastError: { type: String, default: null },

    /** When the connection was established */
    connectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/** Ensure one unique connection per platform per user */
connectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export default mongoose.model("Connection", connectionSchema);
