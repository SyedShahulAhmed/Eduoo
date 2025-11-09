import express from "express";
import {authMiddleware} from "../../middlewares/auth.middleware.js"
import {checkGitHubConnection, connectGitHub, disconnectGitHub, githubCallback} from "../../controllers/Integrations/github.controller.js"

const router = express.Router();

// GitHub OAuth Flow
router.get("/connect", authMiddleware, connectGitHub);
router.get("/callback", githubCallback);
router.delete("/disconnect", authMiddleware, disconnectGitHub);
router.get("/status", authMiddleware, checkGitHubConnection);



export default router;
