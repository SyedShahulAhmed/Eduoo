// src/cron/spotifySync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { refreshSpotifyToken, fetchSpotifyProfile, fetchSpotifyRecentTracks } from "../services/spotify.service.js";

cron.schedule("*/30 * * * *", async () => {
  console.log("🔄 Running Spotify sync cron (every 30m)...");
  try {
    const connections = await Connection.find({ platform: "spotify", connected: true });

    for (const conn of connections) {
      try {
        // refresh token if expired
        if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
          await refreshSpotifyToken(conn);
          console.log(`🔁 Refreshed token for user ${conn.userId}`);
        }

        // fetch latest profile & recent tracks
        const profile = await fetchSpotifyProfile(conn.accessToken);
        const recent = await fetchSpotifyRecentTracks(conn.accessToken);

        // keep lastSync up to date
        conn.lastSync = new Date();
        await conn.save();

        console.log(`✅ Spotify synced for user ${conn.userId} — recent tracks: ${recent.length}`);
        // Optional: dispatch events, store metrics, create/update Goals, etc.
      } catch (err) {
        console.error(`❌ Error syncing Spotify for user ${conn.userId}:`, err.message);
      }
    }

    console.log("✅ Spotify cron completed.");
  } catch (err) {
    console.error("❌ Spotify cron top-level error:", err.message);
  }
});
