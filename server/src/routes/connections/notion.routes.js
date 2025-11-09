// src/routes/connections/notion.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectNotion,
  notionCallback,
  disconnectNotion,
  checkNotionConnection,
} from "../../controllers/Integrations/notion.controller.js";

import {
  getNotionReport,
  pushGoalToNotion,
  getNotionAIInsights,
} from "../../controllers/reports/notion.report.js";

const router = express.Router();

// OAuth flow
router.get("/notion/connect", connectNotion);
router.get("/notion/callback", notionCallback);

// Connection management
router.delete("/notion/disconnect", authMiddleware, disconnectNotion);
router.get("/notion/status", authMiddleware, checkNotionConnection);

// Reports & push
router.get("/reports/notion", authMiddleware, getNotionReport);
router.post("/notion/push-goal", authMiddleware, pushGoalToNotion);
router.get("/reports/notion/insights", authMiddleware, getNotionAIInsights);

export default router;
