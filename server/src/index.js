import cron from "node-cron";
import Connection from "../models/Connection.js";
import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import { sendDiscordEmbed } from "../services/discord.service.js";

/**
 * 🧠 TEMP: Runs every 1 minute for testing
 * Later change to daily at 9 AM IST → "30 3 * * *"
 */
cron.schedule("* * * * *", async () => {
  console.log("🕒 Running test: Discord summary cron every minute...");

  try {
    const discordConnections = await Connection.find({ platform: "discord", connected: true });

    for (const discordConn of discordConnections) {
      const userId = discordConn.userId;
      const webhookUrl = discordConn.metadata?.webhookUrl;

      if (!webhookUrl) {
        console.warn(`⚠️ No webhook URL found for user ${userId}`);
        continue;
      }

      try {
        const { embed } = await buildDiscordSummary(userId);
        await sendDiscordEmbed(webhookUrl, embed);
        console.log(`✅ Test summary sent to Discord for user ${userId}`);
      } catch (err) {
        console.error(`❌ Error sending Discord summary for ${userId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("❌ Cron loop error:", err.message);
  }
});
