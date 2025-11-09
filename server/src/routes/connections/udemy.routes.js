// src/routes/connections/udemy.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectUdemy,
  disconnectUdemy,
  checkUdemyConnection,
} from "../../controllers/Integrations/udemy.controller.js";


const router = express.Router();

router.post("/connect", authMiddleware, connectUdemy);
router.delete("/disconnect", authMiddleware, disconnectUdemy);
router.get("/status", authMiddleware, checkUdemyConnection);


export default router;
