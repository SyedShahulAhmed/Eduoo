// src/routes/connections/googleCalendar.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectGoogleCalendar,
  googleCalendarCallback,
  disconnectGoogleCalendar,
  checkGoogleCalendarConnection,
} from "../../controllers/Integrations/googleCalendar.controller.js";
import {
  getGoogleCalendarReport,
  getGoogleCalendarAIInsights,
} from "../../controllers/reports/googleCalendar.report.js";

const router = express.Router();

// OAuth Flow
router.get("/google-calendar/connect", connectGoogleCalendar);
router.get("/google-calendar/callback", googleCalendarCallback);

// Connection Management
router.delete("/google-calendar/disconnect", authMiddleware, disconnectGoogleCalendar);
router.get("/google-calendar/status", authMiddleware, checkGoogleCalendarConnection);

// Reports & AI
router.get("/reports/google-calendar", authMiddleware, getGoogleCalendarReport);
router.get("/reports/google-calendar/insights", authMiddleware, getGoogleCalendarAIInsights);

export default router;
