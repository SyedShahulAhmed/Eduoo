// src/cron/googleCalendarSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchGoogleCalendarEvents } from "../services/googleCalendar.service.js";

/**
 * Google Calendar Sync — every 2 hours
 * (For example: refresh cached event data or summaries)
 */
cron.schedule("0 */2 * * *", async () => {
  console.log("🔄 Running Google Calendar sync cron (every 2 hours)...");
  try {
    const connections = await Connection.find({ platform: "google_calendar", connected: true });

    for (const conn of connections) {
      try {
        const events = await fetchGoogleCalendarEvents(conn.accessToken);
        conn.lastSync = new Date();
        await conn.save();
        console.log(`✅ Synced ${events.length} events for user ${conn.userId}`);
      } catch (err) {
        console.error(`❌ Google Calendar sync failed for ${conn.userId}:`, err.message);
      }
    }

    console.log("✅ Google Calendar sync complete.");
  } catch (err) {
    console.error("❌ Google Calendar cron error:", err.message);
  }
});
