import express from "express";
import { verifyKeyMiddleware } from "discord-interactions";
import { ENV } from "../../config/env.js";

const router = express.Router();

router.post(
  "/interactions",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    const interaction = req.body;

    // 1️⃣ PING check (verification)
    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    // 2️⃣ Slash commands
    if (interaction.type === 2) {
      const { name } = interaction.data;

      // 🎯 /goals Command
      if (name === "goals") {
        const embed = {
          color: 0x57f287, // Discord green
          title: "🎯 Your Goal Progress",
          description:
            "━━━━━━━━━━━━━━━━━━\n" +
            "✅ **Completed:** 4\n" +
            "⏳ **Pending:** 18\n\n" +
            "📅 Keep pushing forward — consistency builds success!",
          footer: {
            text: "AICOO Productivity Bot",
          },
          timestamp: new Date().toISOString(),
        };

        return res.json({
          type: 4,
          data: {
            embeds: [embed],
          },
        });
      }

      // 📊 /getsummary Command
      if (name === "getsummary") {
        const embed = {
          color: 0x5865f2, // Discord blurple
          title: "📊 AICOO Combined Report",
          description:
            "━━━━━━━━━━━━━━━━━━\n" +
            "💻 **GitHub:** 10 commits\n" +
            "🧠 **LeetCode:** 5 problems solved\n" +
            "🎵 **Spotify:** 2h focus music\n" +
            "📚 **Notion:** 3 tasks updated\n" +
            "━━━━━━━━━━━━━━━━━━\n" +
            "🔥 Keep up the amazing streak!",
          footer: {
            text: "AICOO Productivity Bot",
          },
          timestamp: new Date().toISOString(),
        };

        return res.json({
          type: 4,
          data: {
            embeds: [embed],
          },
        });
      }

      // ❓ Unknown command fallback
      return res.json({
        type: 4,
        data: {
          content: "🤔 Unknown command. Try `/goals` or `/getsummary`.",
        },
      });
    }
  }
);

export default router;
