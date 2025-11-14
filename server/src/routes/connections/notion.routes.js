import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

import {
  connectNotion,
  notionCallback,
  disconnectNotion,
  checkNotionConnection,
  triggerUserSyncNow,
} from "../../controllers/Integrations/notion.controller.js";

const router = express.Router();

router.get("/connect", authMiddleware, connectNotion);
router.get("/callback", notionCallback);

router.delete("/disconnect", authMiddleware, disconnectNotion);
router.get("/status", authMiddleware, checkNotionConnection);

router.post("/sync-now", authMiddleware, triggerUserSyncNow);

export default router;
