import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectDuolingo,
  disconnectDuolingo,
  checkDuolingoConnection,
} from "../../controllers/Integrations/duolingo.controller.js";


const router = express.Router();

// Duolingo Connection Routes
router.post("/connect",authMiddleware, connectDuolingo);
router.delete("/disconnect", authMiddleware, disconnectDuolingo);
router.get("/status", authMiddleware, checkDuolingoConnection);



export default router;
