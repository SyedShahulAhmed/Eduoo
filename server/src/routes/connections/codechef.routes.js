import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectCodechef,
  disconnectCodechef,
  checkCodechefConnection,
} from "../../controllers/Integrations/codechef.controller.js";

const router = express.Router();

router.post("/connect", authMiddleware, connectCodechef);
router.delete("/disconnect", authMiddleware, disconnectCodechef);
router.get("/status", authMiddleware, checkCodechefConnection);

export default router;
