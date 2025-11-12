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
 */
router.post(
  "/",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    let interaction = req.body;

    // Handle raw buffer (for ngrok / body-parser issues)
    if (Buffer.isBuffer(req.body)) {
      try {
        interaction = JSON.parse(req.body.toString());
      } catch (err) {
        console.error("❌ Invalid body parse:", err);
        return res.status(400).json({ error: "Invalid interaction body" });
      }
    }

    // ✅ Discord ping verification
    if (interaction?.type === 1) return res.json({ type: 1 });

    // ✅ Slash command handler
    if (interaction?.type === 2) {
      const command = interaction.data?.name;
      const discordId = interaction.member?.user?.id;

      console.log(`🎯 Slash Command Received: /${command} from ${discordId}`);

      // 🔍 Verify Discord connection
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
          // Send deferred reply first (to prevent Discord timeout)
          res.json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE

          try {
            const { embed } = await withTimeout(
              buildDiscordSummary(userId),
              12_000,
              "Summary generation timed out."
            );

            // Send follow-up message
            await sendFollowup(interaction.token, { embeds: [embed] });
          } catch (err) {
            console.error("❌ getsummary error:", err.message);
            await sendFollowup(interaction.token, {
              content: `⚠️ Failed to generate summary: ${err.message}`,
            });
          }
          return;
        }

        /** 2️⃣ /todayreport — Today's snapshot */
        case "todayreport": {
          try {
            const { embed } = await withTimeout(
              buildTodayReport(userId),
              8_000,
              "Today's report timed out."
            );
            return res.json({ type: 4, data: { embeds: [embed] } });
          } catch (err) {
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
          } catch {
            return res.json({
              type: 4,
              data: { content: `⚠️ Failed to fetch streak summary.` },
            });
          }
        }

        /** 4️⃣ /goals — Active + completed goals */
        case "goals": {
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

          const embed = {
            color: 0x57f287,
            title: "🎯 Your Goal Progress",
            description: `
✅ **Completed:** ${completed.length}
⏳ **Active:** ${active.length}
📅 **Total Goals:** ${goals.length}
            `,
            footer: { text: "AICOO Productivity Bot" },
            timestamp: new Date().toISOString(),
          };

          return res.json({ type: 4, data: { embeds: [embed] } });
        }

        /** 5️⃣ /help — Command guide */
        case "help": {
          const { embed } = buildHelpMessage();
          return res.json({ type: 4, data: { embeds: [embed] } });
        }

        default:
          return res.json({
            type: 4,
            data: { content: "🤔 Unknown command. Try `/help`." },
          });
      }
    }

    return res.status(400).send("Invalid interaction request.");
  }
);

/** 🕒 Utility: Timeout wrapper */
const withTimeout = (promise, ms, msg) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(msg || "Timed out")), ms)
    ),
  ]);

/** 🔁 Send follow-up message to Discord after deferred reply */
const sendFollowup = async (token, payload) => {
  await fetch(`https://discord.com/api/v10/webhooks/${ENV.DISCORD_CLIENT_ID}/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

export default router;
