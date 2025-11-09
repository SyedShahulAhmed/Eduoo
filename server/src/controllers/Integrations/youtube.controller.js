// src/controllers/connections/youtube.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchYouTubeChannel, fetchYouTubeRecentVideos } from "../../services/youtube.service.js";

/**
 * Redirect user to Google OAuth for YouTube scopes
 */
export const connectYouTube = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const redirectUri = `${ENV.SERVER_URL}/api/connections/youtube/callback?token=${token}`;
    const scopes = encodeURIComponent("https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtubepartner.readonly");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${ENV.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&access_type=offline&prompt=consent`;

    return res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectYouTube Error:", err);
    res.status(500).json({ message: "YouTube connect failed", error: err.message });
  }
};

/**
 * Handle OAuth callback
 */
export const youtubeCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code) return res.status(400).json({ message: "Missing YouTube code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const body = new URLSearchParams({
      code,
      client_id: ENV.GOOGLE_CLIENT_ID,
      client_secret: ENV.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/youtube/callback`,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in || null;

    if (!accessToken) {
      console.error("⚠️ YouTube token exchange failed", tokenData);
      return res.status(400).json({ message: "Failed to get YouTube tokens", raw: tokenData });
    }

    await Connection.findOneAndUpdate(
      { userId, platform: "youtube" },
      {
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ YouTube connected for user: ${userId}`);
    return res.status(200).json({ message: "YouTube connected successfully ✅" });
  } catch (err) {
    console.error("❌ youtubeCallback Error:", err);
    res.status(500).json({ message: "YouTube callback failed", error: err.message });
  }
};

/**
 * Disconnect YouTube
 */
export const disconnectYouTube = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "youtube" },
      { connected: false, accessToken: null, refreshToken: null, tokenExpiresAt: null }
    );
    res.status(200).json({ message: "YouTube disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectYouTube Error:", err);
    res.status(500).json({ message: "Failed to disconnect YouTube", error: err.message });
  }
};

/**
 * Check connection status
 */
export const checkYouTubeConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "youtube" });
    if (!conn || !conn.connected) return res.status(200).json({ connected: false, message: "YouTube not connected" });

    // quick validation by fetching channel
    try {
      const channel = await fetchYouTubeChannel(conn.accessToken);
      return res.status(200).json({
        connected: true,
        lastSync: conn.lastSync,
        channelTitle: channel?.snippet?.title || null,
        message: "YouTube connected ✅",
      });
    } catch (err) {
      return res.status(200).json({ connected: false, message: "Access token invalid or expired" });
    }
  } catch (err) {
    console.error("❌ checkYouTubeConnection Error:", err);
    res.status(500).json({ message: "Failed to check YouTube connection", error: err.message });
  }
};

/**
 * Get YouTube report (profile, subscribers, recent videos)
 */
export const getYouTubeReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "youtube" });
    if (!conn?.accessToken) return res.status(400).json({ message: "YouTube not connected" });

    const channel = await fetchYouTubeChannel(conn.accessToken);
    const recent = await fetchYouTubeRecentVideos(conn.accessToken);

    res.status(200).json({
      message: "YouTube report generated successfully",
      report: {
        channel,
        recentVideos: recent,
      },
    });
  } catch (err) {
    console.error("❌ getYouTubeReport Error:", err);
    res.status(500).json({ message: "Failed to fetch YouTube report", error: err.message });
  }
};
