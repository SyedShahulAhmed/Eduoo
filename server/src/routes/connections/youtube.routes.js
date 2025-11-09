// src/routes/connections/youtube.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectYouTube,
  youtubeCallback,
  disconnectYouTube,
  checkYouTubeConnection,
  getYouTubeReport,
} from "../../controllers/Integrations/youtube.controller.js";
import { getYouTubeAIInsights, createGoalsFromYouTubeInsights } from "../../controllers/reports/youtube.report.js";

const router = express.Router();

// OAuth flow
router.get("/youtube/connect", connectYouTube);
router.get("/youtube/callback", youtubeCallback);

// Connection management
router.delete("/youtube/disconnect", authMiddleware, disconnectYouTube);
router.get("/youtube/status", authMiddleware, checkYouTubeConnection);

// Reports & Insights
router.get("/reports/youtube", authMiddleware, getYouTubeReport);
router.get("/reports/youtube/insights", authMiddleware, getYouTubeAIInsights);
router.post("/reports/youtube/goals", authMiddleware, createGoalsFromYouTubeInsights);

export default router;
