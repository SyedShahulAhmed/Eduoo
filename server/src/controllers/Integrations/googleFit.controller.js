// src/controllers/connections/googleFit.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";

/** Redirect user to Google OAuth for Google Fit */
export const connectGoogleFit = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const redirectUri = `${ENV.SERVER_URL}/api/connections/google-fit/callback?token=${token}`;
    const scopes = encodeURIComponent([
      "https://www.googleapis.com/auth/fitness.activity.read",
      "https://www.googleapis.com/auth/fitness.activity.write", // optional
      "https://www.googleapis.com/auth/fitness.sleep.read",
      "https://www.googleapis.com/auth/fitness.body.read",
    ].join(" "));

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${ENV.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&access_type=offline&prompt=consent`;

    return res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectGoogleFit Error:", err);
    res.status(500).json({ message: "Google Fit connect failed", error: err.message });
  }
};

/** OAuth callback */
export const googleFitCallback = async (req, res) => {
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
      redirect_uri: `${ENV.SERVER_URL}/api/connections/google-fit/callback`,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("⚠️ Google Fit token exchange failed", tokenData);
      return res.status(400).json({ message: "Failed to get Google Fit tokens", raw: tokenData });
    }

    await Connection.findOneAndUpdate(
      { userId, platform: "google_fit" },
      {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Google Fit connected for user ${userId}`);
    return res.status(200).json({ message: "Google Fit connected successfully ✅" });
  } catch (err) {
    console.error("❌ googleFitCallback Error:", err);
    res.status(500).json({ message: "Google Fit callback failed", error: err.message });
  }
};

/** Disconnect */
export const disconnectGoogleFit = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "google_fit" },
      { connected: false, accessToken: null, refreshToken: null, tokenExpiresAt: null }
    );
    res.status(200).json({ message: "Google Fit disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectGoogleFit Error:", err);
    res.status(500).json({ message: "Failed to disconnect Google Fit", error: err.message });
  }
};

/** Check connection */
export const checkGoogleFitConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_fit" });
    if (!conn || !conn.connected) return res.status(200).json({ connected: false, message: "Google Fit not connected" });

    res.status(200).json({
      connected: true,
      lastSync: conn.lastSync,
      tokenExpiresAt: conn.tokenExpiresAt,
      message: "Google Fit connected ✅",
    });
  } catch (err) {
    console.error("❌ checkGoogleFitConnection Error:", err);
    res.status(500).json({ message: "Failed to check Google Fit connection", error: err.message });
  }
};
