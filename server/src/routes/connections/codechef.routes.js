// src/routes/connections/codechef.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectCodeChef,
  disconnectCodeChef,
  checkCodeChefConnection,
  codechefCallback,
} from "../../controllers/Integrations/codechef.controller.js";


const router = express.Router();

router.get("/connect", authMiddleware, connectCodeChef);
router.get("/callback", codechefCallback); // public callback (token passed in query as earlier)
router.delete("/disconnect", authMiddleware, disconnectCodeChef);
router.get("/status", authMiddleware, checkCodeChefConnection);


export default router;
