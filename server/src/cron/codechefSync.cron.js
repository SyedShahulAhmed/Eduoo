// src/cron/codechefSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchCodeChefProfile, refreshCodeChefToken } from "../services/codechef.service.js";
import { ENV } from "../config/env.js";

cron.schedule("0 */6 * * *", async () => {
  console.log("🔄 Running CodeChef sync cron (every 6 hours)...");
  try {
    const connections = await Connection.find({ platform: "codechef", connected: true });
    for (const conn of connections) {
      try {
        // Refresh expired token
        if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
          await refreshCodeChefToken(conn, ENV);
          console.log(`🔁 Refreshed token for user ${conn.userId}`);
        }

        // Fetch profile & log update
        const profile = await fetchCodeChefProfile(conn.accessToken);
        conn.lastSync = new Date();
        await conn.save();
        console.log(`✅ Synced CodeChef for ${profile.username} (${profile.rating}★)`);
      } catch (err) {
        console.error(`❌ CodeChef sync error for ${conn.userId}:`, err.message);
      }
    }
    console.log("✅ CodeChef sync job completed.");
  } catch (err) {
    console.error("❌ CodeChef cron top-level error:", err.message);
  }
});
