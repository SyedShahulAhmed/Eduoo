// src/routes/connections/gmail.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectGmail,
  gmailCallback,
  disconnectGmail,
  checkGmailConnection,
} from "../../controllers/Integrations/gmail.controller.js";
import { generateGmailReport } from "../../controllers/reports/gmail.report.js";

const router = express.Router();

// OAuth flow
router.get("/gmail/connect", connectGmail);
router.get("/gmail/callback", gmailCallback);

// Connection management
router.delete("/gmail/disconnect", authMiddleware, disconnectGmail);
router.get("/gmail/status", authMiddleware, checkGmailConnection);

// Reports / Summary email
router.post("/reports/gmail/send-summary", authMiddleware, generateGmailReport);

export default router;
