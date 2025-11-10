import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";
import { sendDiscordEmbed } from "../../services/discord.service.js";

/**
 * 5️⃣ Send AI Goals Summary to Discord (only if connected)
 */
export const sendDailySummary = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "discord",
      connected: true,
    });

    if (!conn || !conn.accessToken)
      return res.status(400).json({ message: "Discord not connected" });

    const goals = await Goal.find({ userId: req.user.id, status: "active" });
    const summary = goals.length
      ? goals.map((g) => `🎯 **${g.title}** — ${g.progress}% done`).join("\n")
      : "No active goals yet. Keep hustling! 💪";

    // Use a saved webhook if available
    if (!conn.metadata?.webhookUrl)
      return res.status(400).json({ message: "No webhook found for this user." });

    await sendDiscordEmbed(conn.metadata.webhookUrl, "📘 AICOO Daily Summary", summary);

    res.status(200).json({ message: "Daily summary sent to Discord ✅" });
  } catch (err) {
    console.error("❌ sendDailySummary Error:", err);
    res.status(500).json({ message: "Failed to send Discord summary", error: err.message });
  }
};
