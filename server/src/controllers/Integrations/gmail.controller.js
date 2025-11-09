// src/controllers/connections/gmail.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";

/** 1️⃣ Redirect user to Gmail OAuth */
export const connectGmail = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const redirectUri = `${ENV.SERVER_URL}/api/connections/gmail/callback?token=${token}`;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.send");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${ENV.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent`;

    return res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectGmail Error:", err);
    res.status(500).json({ message: "Gmail connect failed", error: err.message });
  }
};

/** 2️⃣ Handle OAuth callback */
export const gmailCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code) return res.status(400).json({ message: "Missing Gmail code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const body = new URLSearchParams({
      code,
      client_id: ENV.GOOGLE_CLIENT_ID,
      client_secret: ENV.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/gmail/callback`,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) throw new Error("Failed to get Gmail access token");

    await Connection.findOneAndUpdate(
      { userId, platform: "gmail" },
      {
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt: new Date(Date.now() + (expiresIn || 0) * 1000),
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Gmail connected for user ${userId}`);
    res.status(200).json({ message: "Gmail connected successfully ✅" });
  } catch (err) {
    console.error("❌ gmailCallback Error:", err);
    res.status(500).json({ message: "Gmail callback failed", error: err.message });
  }
};

/** 3️⃣ Disconnect Gmail */
export const disconnectGmail = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "gmail" },
      { connected: false, accessToken: null, refreshToken: null, tokenExpiresAt: null }
    );
    res.status(200).json({ message: "Gmail disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectGmail Error:", err);
    res.status(500).json({ message: "Failed to disconnect Gmail", error: err.message });
  }
};

/** 4️⃣ Check Gmail connection status */
export const checkGmailConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "gmail" });

    if (!conn || !conn.connected) {
      return res.status(200).json({ connected: false, message: "Gmail not connected" });
    }

    res.status(200).json({
      connected: true,
      lastSync: conn.lastSync,
      tokenExpiresAt: conn.tokenExpiresAt,
      message: "Gmail connected ✅",
    });
  } catch (err) {
    console.error("❌ checkGmailConnection Error:", err);
    res.status(500).json({ message: "Failed to check Gmail connection", error: err.message });
  }
};
