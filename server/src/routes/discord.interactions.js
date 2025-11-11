import express from "express";
import { verifyKeyMiddleware } from "discord-interactions";
import { ENV } from "../config/env.js";

const router = express.Router();

/**
 * 🧩 Discord interaction endpoint with verification
 */
router.post(
  "/interactions",
  verifyKeyMiddleware(ENV.DISCORD_PUBLIC_KEY),
  async (req, res) => {
    const interaction = req.body;

    // 1️⃣ PING → PONG
    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    // 2️⃣ Slash commands
    if (interaction.type === 2) {
      const { name } = interaction.data;

      if (name === "goals") {
        return res.json({
          type: 4,
          data: { content: "🎯 You currently have 4 completed and 18 pending goals." },
        });
      }

      if (name === "getsummary") {
        return res.json({
          type: 4,
          data: { content: "📊 AICOO Combined Report: GitHub: 10 commits, LeetCode: 5 solved." },
        });
      }

      return res.json({
        type: 4,
        data: { content: "🤔 Unknown command. Try /goals or /getsummary." },
      });
    }
  }
);

export default router;
