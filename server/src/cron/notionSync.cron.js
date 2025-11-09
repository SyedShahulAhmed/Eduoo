// src/cron/notionSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { fetchNotionUser, searchNotionDatabases } from "../services/notion.service.js";

/**
 * Periodic reconciliation: every 2 hours (backup for webhook/event-driven syncing)
 * NOTE: Preferred pattern is to trigger sync when AICOO Goals are created/updated (webhook or event bus).
 */
cron.schedule("0 */2 * * *", async () => {
  console.log("🔄 Running Notion reconciliation cron (every 2 hours)...");
  try {
    const conns = await Connection.find({ platform: "notion", connected: true });
    for (const conn of conns) {
      try {
        const user = await fetchNotionUser(conn.accessToken);
        const dbs = await searchNotionDatabases(conn.accessToken);
        conn.lastSync = new Date();
        await conn.save();
        console.log(`✅ Notion sync for user ${conn.userId} successful: user=${user.id}, dbCount=${dbs.length}`);
      } catch (err) {
        console.error(`❌ Notion sync failed for user ${conn.userId}:`, err.message);
      }
    }
    console.log("✅ Notion cron run complete.");
  } catch (err) {
    console.error("❌ Notion cron top-level error:", err.message);
  }
});
