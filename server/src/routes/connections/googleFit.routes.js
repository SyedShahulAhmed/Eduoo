// src/routes/connections/googleFit.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectGoogleFit,
  googleFitCallback,
  disconnectGoogleFit,
  checkGoogleFitConnection,
} from "../../controllers/Integrations/googleFit.controller.js";
import { getGoogleFitReport, getGoogleFitAIInsights } from "../../controllers/reports/googleFit.report.js";

const router = express.Router();

// OAuth flow
router.get("/google-fit/connect", connectGoogleFit);
router.get("/google-fit/callback", googleFitCallback);

// Connection management
router.delete("/google-fit/disconnect", authMiddleware, disconnectGoogleFit);
router.get("/google-fit/status", authMiddleware, checkGoogleFitConnection);

// Reports & AI
router.get("/reports/google-fit", authMiddleware, getGoogleFitReport);
router.get("/reports/google-fit/insights", authMiddleware, getGoogleFitAIInsights);

export default router;
