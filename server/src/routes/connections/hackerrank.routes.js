// src/routes/connections/hackerrank.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectHackerRank,
  disconnectHackerRank,
  checkHackerRankConnection,
} from "../../controllers/Integrations/hackerrank.controller.js";

const router = express.Router();

// HackerRank connect/disconnect/status
router.post("/connect", authMiddleware,connectHackerRank);
router.delete("/disconnect", authMiddleware, disconnectHackerRank);
router.get("/status", authMiddleware, checkHackerRankConnection);



export default router;
