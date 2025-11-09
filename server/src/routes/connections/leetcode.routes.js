import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectLeetCode,
  disconnectLeetCode,
  getLeetCodeStatus,
} from "../../controllers/Integrations/leetcode.controller.js";
import {getLeetCodeAIInsights,getLeetCodeReport,createGoalsFromLeetCodeInsights} from "../../controllers/reports/leetcode.report.js"
const router = express.Router();

router.post("/connect", authMiddleware, connectLeetCode);
router.get("/status", authMiddleware, getLeetCodeStatus);
router.delete("/disconnect", authMiddleware, disconnectLeetCode);

router.get("/leetcode", authMiddleware, getLeetCodeReport);
router.get("/leetcode/insights", authMiddleware, getLeetCodeAIInsights);
router.post("/leetcode/goals", authMiddleware, createGoalsFromLeetCodeInsights);

export default router;
