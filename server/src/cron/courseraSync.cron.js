// src/cron/courseraSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchCourseraCourses } from "../services/coursera.service.js";

/**
 * Coursera Sync every 12 hours
 */
cron.schedule("0 */12 * * *", async () => {
  console.log("🔄 Running Coursera sync cron...");
  try {
    const conns = await Connection.find({ platform: "coursera", connected: true });
    for (const conn of conns) {
      try {
        const courses = await fetchCourseraCourses(conn.accessToken);
        conn.lastSync = new Date();
        conn.metadata = { courseCount: courses.length };
        await conn.save();
        console.log(`✅ Synced Coursera for ${conn.userId}: ${courses.length} courses`);
      } catch (err) {
        console.error(`❌ Coursera sync failed for ${conn.userId}:`, err.message);
        conn.lastError = err.message;
        await conn.save();
      }
    }
    console.log("✅ Coursera sync completed.");
  } catch (err) {
    console.error("❌ Coursera cron error:", err.message);
  }
});
