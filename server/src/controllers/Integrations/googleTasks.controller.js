// src/controllers/connections/googleTasks.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";

/**
 * Redirect user to Google OAuth (Tasks scope)
 */
export const connectGoogleTasks = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const redirectUri = `${ENV.SERVER_URL}/api/connections/google-tasks/callback?token=${token}`;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/tasks.readonly");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${ENV.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}&access_type=offline&prompt=consent`;

    return res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectGoogleTasks Error:", err);
    res.status(500).json({ message: "Failed to initiate Google Tasks connect", error: err.message });
  }
};

/**
 * Handle Google OAuth callback
 */
export const googleTasksCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code) return res.status(400).json({ message: "Missing code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const body = new URLSearchParams({
      code,
      client_id: ENV.GOOGLE_CLIENT_ID,
      client_secret: ENV.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/google-tasks/callback`,
      grant_type: "authorization_code",
    });

    const resToken = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await resToken.json();

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    if (!accessToken) throw new Error("Failed to retrieve access token");

    await Connection.findOneAndUpdate(
      { userId, platform: "google_tasks" },
      {
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Google Tasks connected for user ${userId}`);
    res.status(200).json({ message: "Google Tasks connected successfully ✅" });
  } catch (err) {
    console.error("❌ googleTasksCallback Error:", err);
    res.status(500).json({ message: "Google Tasks connection failed", error: err.message });
  }
};

/**
 * Disconnect Google Tasks
 */
export const disconnectGoogleTasks = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "google_tasks" },
      { connected: false, accessToken: null, refreshToken: null }
    );
    res.status(200).json({ message: "Google Tasks disconnected successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to disconnect Google Tasks", error: err.message });
  }
};

/**
 * Check Google Tasks connection
 */
export const checkGoogleTasksConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "google_tasks",
    });

    if (!conn || !conn.connected) {
      return res
        .status(200)
        .json({ connected: false, message: "Google Tasks not connected" });
    }

    res.status(200).json({
      connected: true,
      lastSync: conn.lastSync,
      message: "Google Tasks connected ✅",
    });
  } catch (err) {
    res.status(500).json({
      connected: false,
      message: "Error checking Google Tasks connection",
      error: err.message,
    });
  }
};
