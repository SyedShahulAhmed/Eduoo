// src/routes/connections/discord.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectDiscord,
  discordCallback,
  disconnectDiscord,
  checkDiscordConnection,
} from "../../controllers/Integrations/discord.controller.js";
import {
  sendDailySummary,
  testDiscordMessage,
} from "../../controllers/reports/discord.report.js";

const router = express.Router();

// OAuth Flow
router.get("/discord/connect", connectDiscord);
router.get("/discord/callback", discordCallback);

// Connection Management
router.delete("/discord/disconnect", authMiddleware, disconnectDiscord);
router.get("/discord/status", authMiddleware, checkDiscordConnection);

// Reports / Bot Messages
router.post("/reports/discord/test", authMiddleware, testDiscordMessage);
router.post("/reports/discord/daily", authMiddleware, sendDailySummary);

export default router;
