import cron from "node-cron";
import Connection from "../models/Connection.js";
import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import { sendDiscordEmbed } from "../services/discord.service.js";

// ⏰ Run every day at 9 AM IST (3:30 UTC)
cron.schedule("30 3 * * *", async () => {
  console.log("🕘 Sending daily Discord reports...");
  const discordConnections = await Connection.find({
    platform: "discord",
    connected: true,
  });

  for (const conn of discordConnections) {
    try {
      const { embed } = await buildDiscordSummary(conn.userId);
      const webhookUrl = conn.metadata?.webhookUrl;
      if (!webhookUrl) {
        console.warn(`⚠️ No webhook for ${conn.userId}`);
        continue;
      }

      await sendDiscordEmbed(webhookUrl, embed.title, embed.description);
      console.log(`✅ Sent daily summary to ${conn.userId}`);
    } catch (err) {
      console.error(`❌ Failed for ${conn.userId}:`, err.message);
    }
  }
});
