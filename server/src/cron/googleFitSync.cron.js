// src/cron/googleFitSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchSteps, fetchActiveMinutes, fetchSleep, refreshGoogleToken } from "../services/googleFit.service.js";
import { ENV } from "../config/env.js";

/** Sync every 6 hours */
cron.schedule("0 */6 * * *", async () => {
  console.log("🔄 Running Google Fit sync cron (every 6 hours)...");
  try {
    const conns = await Connection.find({ platform: "google_fit", connected: true });

    for (const conn of conns) {
      try {
        // refresh if expired
        if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
          try {
            await refreshGoogleToken(conn);
            console.log(`🔁 Refreshed Google token for ${conn.userId}`);
          } catch (err) {
            console.warn(`⚠️ Failed to refresh token for ${conn.userId}: ${err.message}`);
          }
        }

        const steps = await fetchSteps(conn.userId, 7);
        const active = await fetchActiveMinutes(conn.userId, 7);
        const sleep = await fetchSleep(conn.userId, 7);

        conn.lastSync = new Date();
        conn.metadata = {
          recentSteps: steps.slice(-3),
          avgActiveMinutes: active.reduce((s, a) => s + a.activeMinutes, 0) / Math.max(1, active.length),
        };
        await conn.save();
        console.log(`✅ Synced Google Fit for ${conn.userId}`);
      } catch (err) {
        console.error(`❌ Google Fit sync failed for ${conn.userId}:`, err.message);
        conn.lastError = err.message;
        await conn.save();
      }
    }
    console.log("✅ Google Fit cron finished.");
  } catch (err) {
    console.error("❌ Google Fit cron top-level error:", err.message);
  }
});
