// src/routes/connections/codechef.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectCodeforces,
  disconnectCodeforces,
  checkCodeforcesConnection,
} from "../../controllers/Integrations/codechef.controller.js";


const router = express.Router();

router.post("/connect", authMiddleware, connectCodeforces);
router.delete("/disconnect", authMiddleware, disconnectCodeforces);
router.get("/status", authMiddleware, checkCodeforcesConnection);


export default router;
