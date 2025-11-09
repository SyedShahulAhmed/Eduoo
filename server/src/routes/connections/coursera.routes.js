// src/routes/connections/coursera.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectCoursera,
  disconnectCoursera,
  checkCourseraConnection,
} from "../../controllers/Integrations/coursera.controller.js";
import {
  getCourseraReport,
  getCourseraAIInsights,
  createGoalsFromCourseraInsights,
} from "../../controllers/reports/coursera.report.js";

const router = express.Router();

router.post("/coursera/connect", authMiddleware, connectCoursera);
router.delete("/coursera/disconnect", authMiddleware, disconnectCoursera);
router.get("/coursera/status", authMiddleware, checkCourseraConnection);

router.get("/reports/coursera", authMiddleware, getCourseraReport);
router.get("/reports/coursera/insights", authMiddleware, getCourseraAIInsights);
router.post("/reports/coursera/goals", authMiddleware, createGoalsFromCourseraInsights);

export default router;
