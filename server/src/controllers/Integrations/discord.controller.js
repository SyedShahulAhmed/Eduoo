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
    if (!token)
      return res.status(401).json({ message: "Authorization token missing" });

    // ✅ Must be the same redirect URI as in Discord Developer Portal
    const redirectUri = `${ENV.SERVER_URL}/api/connections/discord/callback`;

    // ✅ Scopes must be URL encoded (Discord rejects unencoded spaces)
    const scope = encodeURIComponent("identify email guilds webhook.incoming");

    // ✅ Construct final authorization URL
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${ENV.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&state=${token}`;

    console.log("🔗 Discord Auth URL:", authUrl);
    return res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectDiscord Error:", err);
    res
      .status(500)
      .json({ message: "Discord connect failed", error: err.message });
  }
};

/**
 * 2️⃣ Handle Discord OAuth callback
 */
export const discordCallback = async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state;
    const userId = req.user.id; // assuming authMiddleware adds this

    if (!code) return res.status(400).json({ message: "Missing code" });

    // Step 1: Exchange code for access_token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ENV.DISCORD_CLIENT_ID,
        client_secret: ENV.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: ENV.DISCORD_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description);

    // Step 2: Fetch Discord user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // Step 3: Fetch guilds to select a valid channel
    const guildRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const guilds = await guildRes.json();

    // Step 4: Pick one guild + create a webhook
    const guild = guilds[0];
    const guildId = guild.id;
    const channelId = guild.system_channel_id; // or pick first text channel
    const webhookUrl = await createWebhook(guildId, channelId, ENV.DISCORD_BOT_TOKEN);

    // Step 5: Save to DB
    const connection = await Connection.findOneAndUpdate(
      { userId, platform: "discord" },
      {
        connected: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        "metadata.discordId": user.id,
        "metadata.webhookUrl": webhookUrl, // ✅ permanent webhook URL
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: "✅ Discord connected successfully",
      connection,
    });
  } catch (err) {
    console.error("❌ Discord OAuth failed:", err.message);
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
    res
      .status(500)
      .json({ message: "Failed to disconnect Discord", error: err.message });
  }
};

/**
 * 4️⃣ Check Discord Connection
 */
export const checkDiscordConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "discord",
    });
    if (!conn || !conn.connected)
      return res
        .status(200)
        .json({ connected: false, message: "Discord not connected" });

    res.status(200).json({
      connected: true,
      username: conn.username,
      lastSync: conn.lastSync,
      message: "Discord connected ✅",
    });
  } catch (err) {
    res
      .status(500)
      .json({
        connected: false,
        message: "Error checking Discord connection",
        error: err.message,
      });
  }
};
