// src/controllers/connections/notion.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchNotionUser, syncPendingGoalsForUser } from "../../services/notion.service.js";

/* =========================================================
   🔗 1. Redirect User → Notion OAuth
   ========================================================= */
export const connectNotion = async (req, res) => {
  try {
    // JWT from header or query
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;

    if (!token) {
      return res.status(401).json({ message: "❌ Authorization token missing" });
    }

    // MUST MATCH Notion dashboard
    const redirectUri = `${ENV.SERVER_URL}/api/connections/notion/callback`;

    const scopes = encodeURIComponent("users:read databases:read pages:write");

    // State holds the JWT
    const state = `token_${token}`;

    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${ENV.NOTION_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&owner=user&state=${state}&scope=${scopes}`;

    return res.redirect(url);
  } catch (err) {
    console.error("❌ connectNotion Error:", err);
    res.status(500).json({ message: "⚠️ Notion connect failed", error: err.message });
  }
};


/* =========================================================
   🔁 2. OAuth Callback (Notion → Server)
   ========================================================= */
export const notionCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ message: "❌ Missing Notion code" });
    }

    // Extract token from state
    if (!state || !state.startsWith("token_")) {
      return res.status(400).json({ message: "❌ Missing JWT token in state" });
    }

    const token = state.replace("token_", "");

    // Decode the JWT → get userId
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    // MUST MATCH redirect URI EXACTLY (no ?token)
    const redirectUri = `${ENV.SERVER_URL}/api/connections/notion/callback`;

    // Token exchange
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: ENV.NOTION_CLIENT_ID,
      client_secret: ENV.NOTION_CLIENT_SECRET,
    });

    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json({
        message: "❌ Failed to exchange code for token",
        raw: tokenData,
      });
    }

    // Save in DB
    await Connection.findOneAndUpdate(
      { userId, platform: "notion" },
      {
        connected: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        lastSync: new Date(),
      },
      { upsert: true }
    );

    return res.status(200).json({
      message: "🎉 Notion connected successfully!",
      notion: tokenData,
    });
  } catch (err) {
    console.error("❌ notionCallback Error:", err);
    res.status(500).json({
      message: "⚠️ Notion callback failed",
      error: err.message,
    });
  }
};


/* =========================================================
   🔌 3. Disconnect
   ========================================================= */
export const disconnectNotion = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "notion" },
      {
        connected: false,
        accessToken: null,
        refreshToken: null,
        notionDatabaseId: null,
      }
    );

    res.status(200).json({ message: "🔌 Notion disconnected!" });
  } catch (err) {
    console.error("❌ disconnectNotion Error:", err);
    res.status(500).json({
      message: "⚠️ Notion disconnect failed",
      error: err.message,
    });
  }
};


/* =========================================================
   🧪 4. Check Connection Status
   ========================================================= */
export const checkNotionConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
    });

    if (!conn || !conn.connected) {
      return res.status(200).json({
        connected: false,
        message: "🔴 Notion not connected",
      });
    }

    try {
      const user = await fetchNotionUser(conn.accessToken);
      return res.status(200).json({
        connected: true,
        notionUser: user,
        lastSync: conn.lastSync,
        message: "🟢 Notion connected",
      });
    } catch (err) {
      return res.status(200).json({
        connected: false,
        message: "⚠️ Token expired — reconnect Notion",
      });
    }
  } catch (err) {
    console.error("❌ checkNotionConnection Error:", err);
    res.status(500).json({
      message: "⚠️ Failed to check Notion status",
      error: err.message,
    });
  }
};


/* =========================================================
   ⚡ 5. Manual Sync Pending Goals
   ========================================================= */
export const triggerUserSyncNow = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
    });

    if (!conn || !conn.connected)
      return res.status(400).json({ message: "❌ Notion not connected" });

    const results = await syncPendingGoalsForUser(conn);

    res.status(200).json({
      message: "⚡ Manual Notion sync completed",
      syncedGoals: results.length,
      results,
    });
  } catch (err) {
    console.error("❌ triggerUserSyncNow Error:", err);
    res.status(500).json({
      message: "⚠️ Manual sync failed",
      error: err.message,
    });
  }
};
