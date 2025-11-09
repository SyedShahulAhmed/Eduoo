// src/controllers/connections/notion.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchNotionUser } from "../../services/notion.service.js";

/**
 * Redirect user to Notion OAuth
 * Supports token query param for browser-based connect flow (like GitHub pattern)
 */
export const connectNotion = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const redirectUri = `${ENV.SERVER_URL}/api/connections/notion/callback?token=${token}`;
    const scopes = encodeURIComponent("users:read databases:read pages:write");
    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${ENV.NOTION_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&owner=user&state=notion_${Date.now()}&scope=${scopes}`;

    return res.redirect(url);
  } catch (err) {
    console.error("❌ connectNotion Error:", err);
    res.status(500).json({ message: "Notion connect failed", error: err.message });
  }
};

/**
 * Handle Notion OAuth callback
 */
export const notionCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code) return res.status(400).json({ message: "Missing Notion code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    // decode user JWT
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    // Exchange code for access token
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/notion/callback`,
      client_id: ENV.NOTION_CLIENT_ID,
      client_secret: ENV.NOTION_CLIENT_SECRET,
    });

    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    const botId = tokenData?.bot_id || null; // optional
    // Notion may not give refresh tokens in all apps; support if present
    const refreshToken = tokenData?.refresh_token || null;

    if (!accessToken) {
      console.error("⚠️ Notion token exchange failure", tokenData);
      return res.status(400).json({ message: "Failed to get Notion tokens", raw: tokenData });
    }

    // Save connection
    await Connection.findOneAndUpdate(
      { userId, platform: "notion" },
      {
        accessToken,
        refreshToken,
        botId,
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Notion connected for user ${userId}`);
    return res.status(200).json({ message: "Notion connected successfully ✅" });
  } catch (err) {
    console.error("❌ notionCallback Error:", err);
    res.status(500).json({ message: "Notion callback failed", error: err.message });
  }
};

/**
 * Disconnect Notion
 */
export const disconnectNotion = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "notion" },
      { connected: false, accessToken: null, refreshToken: null }
    );
    res.status(200).json({ message: "Notion disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectNotion Error:", err);
    res.status(500).json({ message: "Failed to disconnect Notion", error: err.message });
  }
};

/**
 * Check Notion connection status
 */
export const checkNotionConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "notion" });
    if (!conn || !conn.connected) {
      return res.status(200).json({ connected: false, message: "Notion not connected" });
    }

    // Try fetching basic Notion user info to confirm token validity
    try {
      const user = await fetchNotionUser(conn.accessToken);
      return res.status(200).json({
        connected: true,
        lastSync: conn.lastSync,
        notionUser: { id: user.id, name: user.name, bot: !!conn.botId },
        message: "Notion connected ✅",
      });
    } catch (err) {
      // token may be invalid
      return res.status(200).json({
        connected: false,
        message: "Notion token may be invalid; please reconnect",
        error: err.message,
      });
    }
  } catch (err) {
    console.error("❌ checkNotionConnection Error:", err);
    res.status(500).json({ message: "Failed to check Notion connection", error: err.message });
  }
};
