// src/routes/connections/googleDrive.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectGoogleDrive,
  googleDriveCallback,
  disconnectGoogleDrive,
  checkGoogleDriveConnection,
} from "../../controllers/Integrations/googleDrive.controller.js";
import {
  getGoogleDriveReport,
  getGoogleDriveAIInsights,
} from "../../controllers/reports/googleDrive.report.js";

const router = express.Router();

// OAuth Flow
router.get("/google-drive/connect", connectGoogleDrive);
router.get("/google-drive/callback", googleDriveCallback);

// Connection management
router.delete("/google-drive/disconnect", authMiddleware, disconnectGoogleDrive);
router.get("/google-drive/status", authMiddleware, checkGoogleDriveConnection);

// Reports
router.get("/reports/google-drive", authMiddleware, getGoogleDriveReport);
router.get("/reports/google-drive/insights", authMiddleware, getGoogleDriveAIInsights);

export default router;
