import express from "express";
import { verifyKeyMiddleware } from "discord-interactions";
import { ENV } from "../config/env.js";
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";

import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import { buildTodayReport } from "../utils/buildTodayReport.js";
import { buildStreakSummary } from "../utils/buildStreakSummary.js";
import { buildHelpMessage } from "../utils/buildHelpMessage.js";

const router = express.Router();

/**
 * Handles all Discord slash commands.
 * Uses verifyKeyMiddleware to validate Discord requests.
 */
router.post(
  "/",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    let interaction = req.body;

    try {
      // Some body parsers might leave req.body as a buffer
      if (Buffer.isBuffer(req.body)) {
        interaction = JSON.parse(req.body.toString());
      }
    } catch (err) {
      console.error("❌ Failed to parse interaction body:", err);
      return res.status(400).json({ error: "Invalid request body" });
    }

    // ✅ Discord PING verification
    if (interaction?.type === 1) {
      return res.json({ type: 1 });
    }

    // ✅ Slash command handler
    if (interaction?.type === 2) {
      const command = interaction.data?.name;
      const discordId = interaction.member?.user?.id;

      console.log(`🎯 Slash Command Received: /${command} from ${discordId}`);

      try {
        // ✅ Find linked user via Discord ID
        const conn = await Connection.findOne({
          "metadata.discordId": discordId,
          platform: "discord",
        });

        if (!conn) {
          return res.json({
            type: 4,
            data: {
              content:
                "❌ Please connect your Discord account first via the Eduoo app.",
            },
          });
        }

        const userId = conn.userId;

        // 🧩 Command Routing
        switch (command) {
          /** 1️⃣ /getsummary — Full report */
          case "getsummary": {
            try {
              const { embed } = await withTimeout(
                buildDiscordSummary(userId),
                10_000,
                "Summary generation timed out."
              );
              return res.json({ type: 4, data: { embeds: [embed] } });
            } catch (err) {
              console.error("❌ getsummary error:", err.message);
              return res.json({
                type: 4,
                data: { content: `⚠️ Failed to generate summary: ${err.message}` },
              });
            }
          }

          /** 2️⃣ /todayreport — Today's snapshot */
          case "todayreport": {
            try {
              const { embed } = await withTimeout(
                buildTodayReport(userId),
                10_000,
                "Today's report timed out."
              );
              return res.json({ type: 4, data: { embeds: [embed] } });
            } catch (err) {
              console.error("❌ todayreport error:", err.message);
              return res.json({
                type: 4,
                data: { content: `⚠️ Failed to generate today's report.` },
              });
            }
          }

          /** 3️⃣ /streak — Active streaks */
          case "streak": {
            try {
              const { embed } = await withTimeout(
                buildStreakSummary(userId),
                8_000,
                "Streak summary timed out."
              );
              return res.json({ type: 4, data: { embeds: [embed] } });
            } catch (err) {
              console.error("❌ streak error:", err.message);
              return res.json({
                type: 4,
                data: { content: `⚠️ Failed to fetch streak summary.` },
              });
            }
          }

          /** 4️⃣ /goals — Active + completed goals */
          case "goals": {
            try {
              const goals = await Goal.find({ userId });

              if (!goals.length) {
                return res.json({
                  type: 4,
                  data: {
                    embeds: [
                      {
                        color: 0xffa500,
                        title: "🎯 Your Goals",
                        description:
                          "You don’t have any goals yet. Set one in the app!",
                        footer: { text: "AICOO Goal Tracker" },
                      },
                    ],
                  },
                });
              }

              const completed = goals.filter((g) => g.status === "completed");
              const active = goals.filter((g) => g.status === "active");

              const desc = `
✅ **Completed:** ${completed.length}
⏳ **Active:** ${active.length}
📅 **Total Goals:** ${goals.length}
`;

              const embed = {
                color: 0x57f287,
                title: "🎯 Your Goal Progress",
                description: desc,
                footer: { text: "AICOO Productivity Bot" },
                timestamp: new Date().toISOString(),
              };

              return res.json({ type: 4, data: { embeds: [embed] } });
            } catch (err) {
              console.error("❌ goals command error:", err.message);
              return res.json({
                type: 4,
                data: { content: `⚠️ Failed to fetch goals.` },
              });
            }
          }

          /** 5️⃣ /help — Command guide */
          case "help": {
            const { embed } = buildHelpMessage();
            return res.json({ type: 4, data: { embeds: [embed] } });
          }

          /** Unknown command fallback */
          default:
            return res.json({
              type: 4,
              data: { content: "🤔 Unknown command. Try `/help`." },
            });
        }
      } catch (err) {
        console.error("❌ Discord Command Handler Error:", err.message);
        return res.json({
          type: 4,
          data: { content: `❌ Internal error: ${err.message}` },
        });
      }
    }

    // If we reach here, invalid payload
    return res.status(400).send("Invalid interaction request.");
  }
);

/** 🕒 Utility: Timeout wrapper to avoid Discord 3s+ timeout */
const withTimeout = (promise, ms, msg) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(msg || "Timed out")), ms)
    ),
  ]);
};

export default router;
