import express from "express";
import {
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  aiSuggestGoals,
} from "../controllers/goals.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createGoal);
router.get("/", authMiddleware, getGoals);
router.put("/:id", authMiddleware, updateGoal);
router.delete("/:id", authMiddleware, deleteGoal);
router.get("/ai-suggest", authMiddleware, aiSuggestGoals);

export default router;
