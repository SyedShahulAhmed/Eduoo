import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { createWebhook } from "../../services/discord.service.js";

/**
 * 1️⃣ Redirect user to Discord OAuth
 */
export const connectDiscord = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    // ✅ Use fixed redirect URL
    const redirectUri = `${ENV.SERVER_URL}/api/connections/discord/callback`;

    // ✅ Pass JWT safely via state (Discord supports it)
    const scope = encodeURIComponent("identify email guilds webhook.incoming");
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${ENV.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&state=${token}`;

    return res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectDiscord Error:", err);
    res.status(500).json({ message: "Discord connect failed", error: err.message });
  }
};

/**
 * 2️⃣ Handle Discord OAuth callback
 */
export const discordCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ message: "Missing code" });
    if (!state) return res.status(400).json({ message: "Missing state token" });

    const decoded = jwt.verify(state, ENV.JWT_SECRET);
    const userId = decoded.id;

    // Exchange code for token
    const params = new URLSearchParams({
      client_id: ENV.DISCORD_CLIENT_ID,
      client_secret: ENV.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/discord/callback`,
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token)
      return res.status(400).json({ message: "Failed to retrieve Discord access token" });

    // Fetch user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();

    // Save Discord connection
    const connection = await Connection.findOneAndUpdate(
      { userId, platform: "discord" },
      {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        connected: true,
        username: discordUser.username,
        metadata: { discordId: discordUser.id },
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Discord connected for user ${userId} (${discordUser.username})`);
    return res.status(200).json({ message: "Discord connected successfully ✅", connection });
  } catch (err) {
    console.error("❌ discordCallback Error:", err);
    res.status(500).json({ message: "Discord OAuth failed", error: err.message });
  }
};

/**
 * 3️⃣ Disconnect Discord
 */
export const disconnectDiscord = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "discord" },
      { connected: false, accessToken: null, refreshToken: null, metadata: {} }
    );
    res.status(200).json({ message: "Discord disconnected successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to disconnect Discord", error: err.message });
  }
};

/**
 * 4️⃣ Check Discord Connection
 */
export const checkDiscordConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "discord" });
    if (!conn || !conn.connected)
      return res.status(200).json({ connected: false, message: "Discord not connected" });

    res.status(200).json({
      connected: true,
      username: conn.username,
      lastSync: conn.lastSync,
      message: "Discord connected ✅",
    });
  } catch (err) {
    res.status(500).json({ connected: false, message: "Error checking Discord connection", error: err.message });
  }
};
