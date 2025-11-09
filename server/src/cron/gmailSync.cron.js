// src/cron/gmailSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { sendGmailSummary } from "../services/gmail.service.js";

/**
 * Cron job to send weekly summary email (e.g., every Monday at 8AM)
 */
cron.schedule("0 8 * * MON", async () => {
  console.log("🔄 Running Gmail summary email cron (every Monday 08:00)...");
  try {
    const connections = await Connection.find({ platform: "gmail", connected: true });
    for (const conn of connections) {
      try {
        // Use userId to fetch email or have stored email in Connection/ User
        const userEmail = conn.email || conn.userId; // assume you map userId→email in your system
        await sendGmailSummary(conn.userId, userEmail, "Your AICOO weekly digest", "Here is your weekly AICOO digest...");
        console.log(`✅ Summary email sent for user ${conn.userId}`);
      } catch (err) {
        console.error(`❌ Gmail summary send failed for user ${conn.userId}:`, err.message);
      }
    }
    console.log("✅ Gmail summary cron complete.");
  } catch (err) {
    console.error("❌ Gmail cron top-level error:", err.message);
  }
});
