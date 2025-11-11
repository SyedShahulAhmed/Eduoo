import cron from "node-cron";
import Connection from "../models/Connection.js";
import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import { sendDiscordEmbed } from "../services/discord.service.js"; // assuming this sends embeds to Discord webhook

/**
 * 🕒 Runs every day at 9 AM IST (3:30 AM UTC)
 * Sends personalized daily summary to all connected Discord users
 */
cron.schedule("30 3 * * *", async () => {
  console.log("📢 Running Daily Discord Summary job...");

  try {
    // Find all users with a connected Discord integration
    const discordConnections = await Connection.find({ platform: "discord", connected: true });

    for (const discordConn of discordConnections) {
      const userId = discordConn.userId;
      const webhookUrl = discordConn.metadata?.webhookUrl;

      if (!webhookUrl) {
        console.warn(`⚠️ No webhook URL for user ${userId}`);
        continue;
      }

      try {
        // Build the user’s summary
        const { embed } = await buildDiscordSummary(userId);

        // Send the embed to the user’s Discord webhook
        await sendDiscordEmbed(webhookUrl, embed);
        console.log(`✅ Summary sent to Discord user: ${userId}`);
      } catch (err) {
        console.error(`❌ Failed to send summary for user ${userId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("❌ Daily summary cron error:", err.message);
  }
});
