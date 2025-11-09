// src/controllers/connections/googleDrive.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchGoogleDriveFiles } from "../../services/googleDrive.service.js";

/**
 * 1️⃣ Redirect user to Google Drive OAuth
 */
export const connectGoogleDrive = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const redirectUri = `${ENV.SERVER_URL}/api/connections/google-drive/callback?token=${token}`;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${ENV.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}&access_type=offline&prompt=consent`;

    res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectGoogleDrive Error:", err);
    res.status(500).json({ message: "Google Drive connect failed", error: err.message });
  }
};

/**
 * 2️⃣ Handle OAuth callback
 */
export const googleDriveCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code) return res.status(400).json({ message: "Missing Google code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const body = new URLSearchParams({
      code,
      client_id: ENV.GOOGLE_CLIENT_ID,
      client_secret: ENV.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/google-drive/callback`,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await response.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    if (!access_token) throw new Error("Failed to obtain Google Drive access token");

    await Connection.findOneAndUpdate(
      { userId, platform: "google_drive" },
      {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Google Drive connected for user ${userId}`);
    res.status(200).json({ message: "Google Drive connected successfully ✅" });
  } catch (err) {
    console.error("❌ googleDriveCallback Error:", err);
    res.status(500).json({ message: "Google Drive callback failed", error: err.message });
  }
};

/**
 * 3️⃣ Disconnect Google Drive
 */
export const disconnectGoogleDrive = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "google_drive" },
      { connected: false, accessToken: null, refreshToken: null }
    );
    res.status(200).json({ message: "✅ Google Drive disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectGoogleDrive Error:", err);
    res.status(500).json({ message: "Failed to disconnect Google Drive", error: err.message });
  }
};

/**
 * 4️⃣ Check connection status
 */
export const checkGoogleDriveConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_drive" });
    if (!conn || !conn.connected)
      return res.status(200).json({ connected: false, message: "Google Drive not connected" });

    try {
      const files = await fetchGoogleDriveFiles(conn.accessToken);
      res.status(200).json({
        connected: true,
        lastSync: conn.lastSync,
        filesCount: files.length,
        message: "✅ Google Drive connected",
      });
    } catch {
      res.status(200).json({ connected: false, message: "Token may be expired or invalid" });
    }
  } catch (err) {
    console.error("❌ checkGoogleDriveConnection Error:", err);
    res.status(500).json({ message: "Failed to check Google Drive connection", error: err.message });
  }
};
