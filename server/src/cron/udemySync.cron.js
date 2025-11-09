// src/cron/udemySync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchUdemyCourses } from "../services/udemy.service.js";

/**
 * Sync Udemy progress every 12 hours
 */
cron.schedule("0 */12 * * *", async () => {
  console.log("🔄 Running Udemy sync cron...");
  try {
    const conns = await Connection.find({ platform: "udemy", connected: true });
    for (const conn of conns) {
      try {
        const courses = await fetchUdemyCourses(conn.accessToken);
        conn.lastSync = new Date();
        conn.metadata = { courseCount: courses.length };
        await conn.save();
        console.log(`✅ Synced Udemy for ${conn.userId}: ${courses.length} courses`);
      } catch (err) {
        console.error(`❌ Udemy sync failed for ${conn.userId}:`, err.message);
        conn.lastError = err.message;
        await conn.save();
      }
    }
    console.log("✅ Udemy sync completed.");
  } catch (err) {
    console.error("❌ Udemy cron error:", err.message);
  }
});
