import express from "express";
import { verifyKeyMiddleware } from "discord-interactions";
import { ENV } from "../config/env.js";
import { buildDiscordSummary } from "../utils/buildDiscordSummary.js";
import { buildTodayReport } from "../utils/buildTodayReport.js";
import { buildStreakSummary } from "../utils/buildStreakSummary.js";
import { buildHelpMessage } from "../utils/buildHelpMessage.js";
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";
import fetch from "node-fetch";

const router = express.Router();

// Helper: Send follow-up (edit reply)
const sendFollowup = async (interactionToken, embed) => {
  try {
    await fetch(`https://discord.com/api/v10/webhooks/${ENV.DISCORD_CLIENT_ID}/${interactionToken}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    console.error("❌ Failed to send follow-up:", err.message);
  }
};

router.post(
  "/interactions",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    const interaction = req.body;

    // ✅ Discord verification ping
    if (interaction.type === 1) return res.json({ type: 1 });

    if (interaction.type === 2) {
      const command = interaction.data.name;
      const discordId = interaction.member.user.id;

      console.log(`🎯 Slash Command Received: /${command} from ${discordId}`);

      // ✅ Send immediate "thinking..." response to avoid timeout
      res.json({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      });

      try {
        const conn = await Connection.findOne({
          "metadata.discordId": discordId,
          platform: "discord",
        });

        if (!conn) {
          const embed = {
            color: 0xff0000,
            title: "❌ Not Connected",
            description: "Please connect your Discord account first in AICOO.",
          };
          return sendFollowup(interaction.token, embed);
        }

        let embed;

        switch (command) {
          case "getsummary": {
            console.log("⚙️ Building full summary...");
            ({ embed } = await buildDiscordSummary(conn.userId));
            break;
          }

          case "todayreport": {
            console.log("⚙️ Building today's report...");
            ({ embed } = await buildTodayReport(conn.userId));
            break;
          }

          case "streak": {
            console.log("⚙️ Building streak summary...");
            ({ embed } = await buildStreakSummary(conn.userId));
            break;
          }

          case "goals": {
            const goals = await Goal.find({ userId: conn.userId });
            if (!goals.length) {
              embed = {
                color: 0xffa500,
                title: "🎯 Your Goals",
                description: "You don’t have any goals yet. Set one in the app!",
              };
            } else {
              const completed = goals.filter((g) => g.status === "completed");
              const active = goals.filter((g) => g.status === "active");
              embed = {
                color: 0x57f287,
                title: "🎯 Your Goal Progress",
                description: `✅ **Completed:** ${completed.length}\n⏳ **Active:** ${active.length}`,
              };
            }
            break;
          }

          case "help": {
            ({ embed } = buildHelpMessage());
            break;
          }

          default: {
            embed = {
              color: 0xff0000,
              title: "🤔 Unknown Command",
              description: "Try `/help` for available commands.",
            };
          }
        }

        await sendFollowup(interaction.token, embed);
      } catch (err) {
        console.error("❌ Discord Command Error:", err);
        const embed = {
          color: 0xff0000,
          title: "❌ Error",
          description: err.message || "An unexpected error occurred.",
        };
        await sendFollowup(interaction.token, embed);
      }
    }
  }
);

export default router;
