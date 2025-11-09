// src/cron/googleDriveSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchGoogleDriveFiles } from "../services/googleDrive.service.js";

/**
 * Google Drive Sync — Daily at midnight
 */
cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Running Google Drive sync cron (daily backup)...");
  try {
    const connections = await Connection.find({ platform: "google_drive", connected: true });

    for (const conn of connections) {
      try {
        const files = await fetchGoogleDriveFiles(conn.accessToken);
        conn.lastSync = new Date();
        await conn.save();
        console.log(`✅ Synced ${files.length} Drive files for user ${conn.userId}`);
      } catch (err) {
        console.error(`❌ Drive sync failed for user ${conn.userId}:`, err.message);
      }
    }

    console.log("✅ Google Drive sync complete.");
  } catch (err) {
    console.error("❌ Google Drive cron error:", err.message);
  }
});
