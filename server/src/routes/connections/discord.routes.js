import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectDiscord,
  discordCallback,
  disconnectDiscord,
  checkDiscordConnection,
} from "../../controllers/Integrations/discord.controller.js";
import { sendDailySummary } from "../../controllers/reports/discord.report.js";

const router = express.Router();

// OAuth Flow
router.get("/discord/connect", connectDiscord);
router.get("/discord/callback", discordCallback);

// Connection Management
router.get("/discord/status", authMiddleware, checkDiscordConnection);
router.delete("/discord/disconnect", authMiddleware, disconnectDiscord);

// Send message or daily summary (only if connected)
router.post("/discord/summary", authMiddleware, sendDailySummary);

export default router;
