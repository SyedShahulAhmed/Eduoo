// src/controllers/reports/discord.report.js
import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";
import { sendDiscordEmbed, createWebhook } from "../../services/discord.service.js";
import { ENV } from "../../config/env.js";
import fetch from "node-fetch";

/** ✅ Send daily goal summary to Discord (auto-create webhook if missing) */
export const sendDailySummary = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "discord",
    });

    if (!connection || !connection.connected) {
      return res.status(400).json({ message: "Discord not connected" });
    }

    // 🧠 Step 1: Auto-create webhook if missing
    if (!connection.metadata?.webhookUrl) {
      console.log("⚙️ No webhook found. Attempting to create one...");

      // 1️⃣ Fetch user's Discord guilds (servers)
      const guildRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${connection.accessToken}` },
      });
      const guilds = await guildRes.json();

      if (!Array.isArray(guilds)) {
        console.error("❌ Discord guilds response:", guilds);
        return res
          .status(400)
          .json({ message: "Failed to fetch Discord servers", error: guilds });
      }

      const guild = guilds[0];
      if (!guild)
        return res.status(400).json({ message: "No Discord servers found." });

      // 2️⃣ Fetch channels of the first guild
      const chRes = await fetch(
        `https://discord.com/api/guilds/${guild.id}/channels`,
        {
          headers: { Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}` },
        }
      );
      const channels = await chRes.json();

      if (!Array.isArray(channels)) {
        console.error("❌ Discord channels response:", channels);
        return res
          .status(400)
          .json({ message: "Failed to fetch Discord channels", error: channels });
      }

      const textChannel = channels.find((c) => c.type === 0); // 0 = text
      if (!textChannel)
        return res.status(400).json({ message: "No text channel found." });

      // 3️⃣ Create webhook for that text channel
      const webhook = await createWebhook(textChannel.id, ENV.DISCORD_BOT_TOKEN);
      connection.metadata.webhookUrl = webhook.url;
      await connection.save();
      console.log("✅ Webhook created successfully:", webhook.url);
    }

    // 🧩 Step 2: Gather user's goals
    const goals = await Goal.find({ userId: req.user.id });
    const completed = goals.filter((g) => g.status === "completed").length;
    const pending = goals.filter((g) => g.status === "active").length;

    // 🧠 Step 3: AI motivational quote (Gemini)
    const prompt = `Write one short motivational quote for daily growth and consistency.`;
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const aiData = await aiRes.json();
    const motivation =
      aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Keep showing up — even small progress counts 🌱";

    // 🧾 Step 4: Create a Discord message embed
    const embed = `
📅 **AICOO Daily Summary**
🎯 Completed Goals: **${completed}**
⏳ Pending Goals: **${pending}**
💬 Motivation: ${motivation}
    `;

    // ✅ Step 5: Send to Discord via webhook
    await sendDiscordEmbed(connection.metadata.webhookUrl, "AICOO Daily Report", embed);

    res.status(200).json({ message: "Daily summary sent to Discord ✅" });
  } catch (err) {
    console.error("❌ sendDailySummary Error:", err);
    res.status(500).json({ message: "Failed to send summary", error: err.message });
  }
};
