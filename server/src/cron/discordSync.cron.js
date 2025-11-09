// src/cron/discordSync.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";
import { sendDiscordEmbed } from "../services/discord.service.js";

/**
 * Send daily summaries to connected Discord users at 9 AM
 */
cron.schedule("0 9 * * *", async () => {
  console.log("🔔 Running Discord Daily Summary Cron...");
  try {
    const conns = await Connection.find({ platform: "discord", connected: true });

    for (const conn of conns) {
      if (!conn.metadata?.webhookUrl) continue;

      const goals = await Goal.find({ userId: conn.userId, status: "active" });
      const text =
        goals.length > 0
          ? goals.map((g) => `• ${g.title} (${g.progress}% done)`).join("\n")
          : "No active goals today — take a break or set new ones!";

      await sendDiscordEmbed(conn.metadata.webhookUrl, "☀️ Daily AICOO Goals", text);
      console.log(`✅ Sent Discord summary for user ${conn.userId}`);
    }
  } catch (err) {
    console.error("❌ Discord cron error:", err.message);
  }
});
