// src/cron/hackerrankSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchHackerRankProfile } from "../services/hackerrank.service.js";

/**
 * Sync every 24 hours
 */
cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Running HackerRank sync job (daily)...");
  try {
    const connections = await Connection.find({ platform: "hackerrank", connected: true });
    for (const conn of connections) {
      try {
        const data = await fetchHackerRankProfile(conn.username);
        conn.lastSync = new Date();
        await conn.save();
        console.log(`✅ Synced HackerRank for ${conn.username} — Score: ${data.score}`);
      } catch (err) {
        console.error(`❌ Error syncing ${conn.username}:`, err.message);
      }
    }
    console.log("✅ HackerRank sync completed.");
  } catch (err) {
    console.error("❌ HackerRank cron error:", err.message);
  }
});
