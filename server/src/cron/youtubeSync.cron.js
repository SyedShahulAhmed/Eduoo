// src/cron/youtubeSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchYouTubeChannel, fetchYouTubeRecentVideos, exchangeRefreshToken } from "../services/youtube.service.js";

/**
 * Sync YouTube every 6 hours
 */
cron.schedule("0 */6 * * *", async () => {
  console.log("🔄 Running YouTube sync cron (every 6 hours)...");
  try {
    const conns = await Connection.find({ platform: "youtube", connected: true });

    for (const conn of conns) {
      try {
        // Refresh token if expired
        if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
          try {
            await exchangeRefreshToken(conn);
            console.log(`🔁 Refreshed YouTube token for user ${conn.userId}`);
          } catch (err) {
            console.warn(`⚠️ Failed to refresh token for ${conn.userId}:`, err.message);
          }
        }

        const channel = await fetchYouTubeChannel(conn.userId);
        const recent = await fetchYouTubeRecentVideos(conn.userId);

        conn.lastSync = new Date();
        conn.metadata = { channelTitle: channel?.snippet?.title, subscriberCount: channel?.statistics?.subscriberCount, recentCount: (recent || []).length };
        await conn.save();

        console.log(`✅ Synced YouTube for user ${conn.userId}, recent videos: ${recent.length}`);
      } catch (err) {
        console.error(`❌ YouTube sync failed for ${conn.userId}:`, err.message);
        conn.lastError = err.message;
        await conn.save();
      }
    }
    console.log("✅ YouTube cron completed.");
  } catch (err) {
    console.error("❌ YouTube cron top-level error:", err.message);
  }
});
