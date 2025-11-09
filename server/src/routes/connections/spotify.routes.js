// src/routes/connections/spotify.routes.js
import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  connectSpotify,
  spotifyCallback,
  disconnectSpotify,
  checkSpotifyConnection,
} from "../../controllers/Integrations/spotify.controller.js";


const router = express.Router();
router.get("/connect", authMiddleware, connectSpotify);
router.get("/callback", spotifyCallback);
router.delete("/disconnect", authMiddleware, disconnectSpotify);
router.get("/status", authMiddleware, checkSpotifyConnection);

export default router;
