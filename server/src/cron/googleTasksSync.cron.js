// src/cron/googleTasksSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchGoogleTasks } from "../services/googleTasks.service.js";

/**
 * Cron: Pull Google Tasks every 2 hours for analytics
 */
cron.schedule("0 */2 * * *", async () => {
  console.log("🔄 Running Google Tasks sync...");
  try {
    const conns = await Connection.find({ platform: "google_tasks", connected: true });

    for (const conn of conns) {
      try {
        const tasks = await fetchGoogleTasks(conn.userId);
        conn.lastSync = new Date();
        conn.metadata = { taskCount: tasks.length };
        await conn.save();
        console.log(`✅ Synced Google Tasks for ${conn.userId}: ${tasks.length} tasks`);
      } catch (err) {
        console.error(`❌ Google Tasks sync failed for ${conn.userId}:`, err.message);
        conn.lastError = err.message;
        await conn.save();
      }
    }
  } catch (err) {
    console.error("❌ Google Tasks cron error:", err.message);
  }
});
