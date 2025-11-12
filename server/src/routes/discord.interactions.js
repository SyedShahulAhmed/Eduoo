import express from "express";
import { verifyKeyMiddleware } from "discord-interactions";
import { ENV } from "../config/env.js";
import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import { buildTodayReport } from "../utils/buildTodayReport.js";
import { buildStreakSummary } from "../utils/buildStreakSummary.js";
import { buildHelpMessage } from "../utils/buildHelpMessage.js";
import Connection from "../models/Connection.js";

const router = express.Router();

router.post(
  "/interactions",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    const interaction = req.body;

    // Discord verification ping
    if (interaction.type === 1) return res.json({ type: 1 });

    if (interaction.type === 2) {
      const command = interaction.data.name;
      const discordId = interaction.member.user.id;

      try {
        const conn = await Connection.findOne({
          "metadata.discordId": discordId,
          platform: "discord",
        });

        if (!conn)
          return res.json({
            type: 4,
            data: { content: "❌ Please connect your Discord account first." },
          });

        switch (command) {
          case "getsummary": {
            const { embed } = await buildDiscordSummary(conn.userId);
            return res.json({ type: 4, data: { embeds: [embed] } });
          }

          case "todayreport": {
            const { embed } = await buildTodayReport(conn.userId);
            return res.json({ type: 4, data: { embeds: [embed] } });
          }

          case "streak": {
            const { embed } = await buildStreakSummary(conn.userId);
            return res.json({ type: 4, data: { embeds: [embed] } });
          }

          case "help": {
            const { embed } = buildHelpMessage();
            return res.json({ type: 4, data: { embeds: [embed] } });
          }

          default:
            return res.json({
              type: 4,
              data: { content: "🤔 Unknown command. Try `/help`" },
            });
        }
      } catch (err) {
        console.error("❌ Discord Command Error:", err);
        return res.json({
          type: 4,
          data: { content: `❌ Error: ${err.message}` },
        });
      }
    }
  }
);

export default router;
