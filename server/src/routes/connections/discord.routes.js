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
router.get("/connect", connectDiscord);
router.get("/callback", discordCallback);

// Connection Management
router.get("/status", authMiddleware, checkDiscordConnection);
router.delete("/disconnect", authMiddleware, disconnectDiscord);



export default router;
