import express from "express";
import fetch from "node-fetch";
import { verifyKeyMiddleware } from "discord-interactions";
import { ENV } from "../config/env.js";
import Connection from "../models/Connection.js";
import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import Goal from "../models/Goal.js";

const router = express.Router();

/**
 * ⚙️ Discord Interaction Handler (with async follow-up support)
 */
router.post(
  "/interactions",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    const interaction = req.body;

    // 1️⃣ Handle ping check instantly
    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    // 2️⃣ Slash commands
    if (interaction.type === 2) {
      const command = interaction.data.name;
      const discordId = interaction.member.user.id;

      // Find user by Discord connection
      const conn = await Connection.findOne({
        "metadata.discordId": discordId,
        platform: "discord",
      });

      if (!conn) {
        return res.json({
          type: 4,
          data: {
            content: "❌ Please connect your Discord account first.",
            flags: 64, // ephemeral (only user sees)
          },
        });
      }

      // 🧩 Immediate ACK so Discord doesn’t timeout
      res.json({
        type: 5, // “Deferred channel message with source”
      });

      // 3️⃣ Async follow-up
      if (command === "getsummary") {
        try {
          const { embed } = await buildDiscordSummary(conn.userId);

          await fetch(
            `https://discord.com/api/v10/webhooks/${ENV.DISCORD_CLIENT_ID}/${interaction.token}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [embed],
              }),
            }
          );
        } catch (err) {
          await fetch(
            `https://discord.com/api/v10/webhooks/${ENV.DISCORD_CLIENT_ID}/${interaction.token}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: `❌ Error fetching summary: ${err.message}`,
              }),
            }
          );
        }
      }

      if (command === "goals") {
        try {
          const goals = await Goal.find({ userId: conn.userId });
          const completed = goals.filter((g) => g.status === "completed").length;
          const pending = goals.filter((g) => g.status === "active").length;

          const embed = {
            color: 0x57f287,
            title: "🎯 Your Goal Progress",
            description: `✅ Completed: ${completed}\n⏳ Pending: ${pending}`,
            footer: { text: "AICOO Productivity Bot" },
            timestamp: new Date().toISOString(),
          };

          await fetch(
            `https://discord.com/api/v10/webhooks/${ENV.DISCORD_CLIENT_ID}/${interaction.token}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ embeds: [embed] }),
            }
          );
        } catch (err) {
          await fetch(
            `https://discord.com/api/v10/webhooks/${ENV.DISCORD_CLIENT_ID}/${interaction.token}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: `❌ Error fetching goals: ${err.message}`,
              }),
            }
          );
        }
      }
    }
  }
);

export default router;
