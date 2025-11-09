// src/controllers/reports/discord.report.js
import { sendDiscordEmbed } from "../../services/discord.service.js";
import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";

/**
 * Send daily AI summary to Discord
 */
export const sendDailySummary = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "discord" });
    if (!conn || !conn.metadata?.webhookUrl)
      return res.status(400).json({ message: "Discord webhook not set" });

    const goals = await Goal.find({ userId: req.user.id, status: "active" });

    const embedText = goals.length
      ? goals.map((g) => `🎯 **${g.title}** — ${g.progress}% done`).join("\n")
      : "No active goals today.";

    await sendDiscordEmbed(
      conn.metadata.webhookUrl,
      "📘 AICOO Daily Summary",
      embedText
    );

    res.status(200).json({ message: "Daily summary sent to Discord ✅" });
  } catch (err) {
    console.error("❌ sendDailySummary Error:", err);
    res.status(500).json({ message: "Failed to send Discord summary", error: err.message });
  }
};

/**
 * Test message endpoint
 */
export const testDiscordMessage = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "discord" });
    if (!conn?.metadata?.webhookUrl)
      return res.status(400).json({ message: "No Discord webhook found" });

    await sendDiscordEmbed(
      conn.metadata.webhookUrl,
      "🤖 AICOO Bot Test",
      "Connection working successfully! 🎉"
    );

    res.status(200).json({ message: "Test message sent successfully" });
  } catch (err) {
    console.error("❌ testDiscordMessage Error:", err);
    res.status(500).json({ message: "Failed to send test message", error: err.message });
  }
};
