import express from "express";
import { verifyKeyMiddleware } from "discord-interactions";
import { ENV } from "../config/env.js";
import Connection from "../models/Connection.js";
import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import Goal from "../models/Goal.js";

const router = express.Router();

router.post(
  "/interactions",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    const interaction = req.body;

    // Verify Discord ping
    if (interaction.type === 1) return res.json({ type: 1 });

    if (interaction.type === 2) {
      const command = interaction.data.name;
      const discordId = interaction.member.user.id;

      // Find connected user in DB
      const conn = await Connection.findOne({
        "metadata.discordId": discordId,
        platform: "discord",
      });
      if (!conn)
        return res.json({
          type: 4,
          data: { content: "❌ Please connect your Discord account first." },
        });

      if (command === "getsummary") {
        try {
          const { embed } = await buildDiscordSummary(conn.userId);
          return res.json({ type: 4, data: { embeds: [embed] } });
        } catch (err) {
          return res.json({
            type: 4,
            data: { content: `❌ Error: ${err.message}` },
          });
        }
      }

      if (command === "goals") {
        const goals = await Goal.find({ userId: conn.userId });
        const completed = goals.filter((g) => g.status === "completed").length;
        const pending = goals.filter((g) => g.status === "active").length;

        return res.json({
          type: 4,
          data: {
            embeds: [
              {
                color: 0x57f287,
                title: "🎯 Your Goal Progress",
                description: `✅ Completed: ${completed}\n⏳ Pending: ${pending}`,
                footer: { text: "AICOO Productivity Bot" },
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });
      }

      return res.json({
        type: 4,
        data: { content: "🤔 Unknown command." },
      });
    }
  }
);

export default router;
