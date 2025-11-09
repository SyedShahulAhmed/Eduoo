// src/routes/connections/googleTasks.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectGoogleTasks,
  googleTasksCallback,
  disconnectGoogleTasks,
  checkGoogleTasksConnection,
} from "../../controllers/Integrations/googleTasks.controller.js";
import {
  getGoogleTasksReport,
  syncGoalsToGoogleTasks,
} from "../../controllers/reports/googleTasks.report.js";

const router = express.Router();

// OAuth Flow
router.get("/google-tasks/connect", connectGoogleTasks);
router.get("/google-tasks/callback", googleTasksCallback);

// Connection Management
router.delete("/google-tasks/disconnect", authMiddleware, disconnectGoogleTasks);
router.get("/google-tasks/status", authMiddleware, checkGoogleTasksConnection);

// Reports
router.get("/reports/google-tasks", authMiddleware, getGoogleTasksReport);
router.post("/reports/google-tasks/sync", authMiddleware, syncGoalsToGoogleTasks);

export default router;
