// src/controllers/reports/discord.report.js
import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";
import {
  sendDiscordEmbed,
  createWebhook,
} from "../../services/discord.service.js";
import { ENV } from "../../config/env.js";
import fetch from "node-fetch";

/** ✅ Auto-create webhook if missing, then send summary */
export const sendDailySummary = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "discord",
    });
    if (!conn || !conn.connected)
      return res.status(400).json({ message: "Discord not connected" });

    // 🧠 Step 1: Ensure webhook exists
    if (!conn.metadata?.webhookUrl) {
      // Fetch guilds where user authorized the app
      const guildsRes = await fetch(
        "https://discord.com/api/users/@me/guilds",
        {
          headers: { Authorization: `Bearer ${conn.accessToken}` },
        }
      );
      const guilds = await guildsRes.json();
      const guild = guilds?.[0];
      if (!guild)
        return res.status(400).json({ message: "No Discord server found" });

      // Find first text channel
      const channelsRes = await fetch(
        `https://discord.com/api/guilds/${guild.id}/channels`,
        {
          headers: { Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}` },
        }
      );
      const channels = await channelsRes.json();
      const textChannel = channels.find((ch) => ch.type === 0); // text channel

      if (!textChannel)
        return res.status(400).json({ message: "No text channel available" });

      // Create webhook
      const webhook = await createWebhook(
        textChannel.id,
        ENV.DISCORD_BOT_TOKEN
      );
      conn.metadata.webhookUrl = webhook.url;
      await conn.save();
    }

    // 🧩 Step 2: Gather goals
    const goals = await Goal.find({ userId: req.user.id });
    const completed = goals.filter((g) => g.status === "completed").length;
    const pending = goals.filter((g) => g.status === "active").length;

    // 🧠 Step 3: Generate motivation
    const prompt = `
Generate a short motivational quote about daily consistency and progress.
Return only one sentence.
    `;
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const aiData = await aiRes.json();
    const motivation =
      aiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Keep building — your consistency creates breakthroughs 💪";

    // 🧾 Step 4: Create embedded summary
    const embed = `
📘 **AICOO Daily Summary**
🎯 Goals Completed: **${completed}**
⏳ Goals Pending: **${pending}**
💡 Motivation: ${motivation}
    `;

    // ✅ Step 5: Send message
    await sendDiscordEmbed(
      conn.metadata.webhookUrl,
      "AICOO Daily Report",
      embed
    );

    res.status(200).json({ message: "Daily summary sent to Discord ✅" });
  } catch (err) {
    console.error("❌ sendDailySummary Error:", err);
    res
      .status(500)
      .json({ message: "Failed to send summary", error: err.message });
  }
};
