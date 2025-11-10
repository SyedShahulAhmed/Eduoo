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
    const { code, state } = req.query;
    if (!code || !state)
      return res.status(400).json({ message: "Missing code or state" });

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
    const accessToken = tokenData.access_token;
    if (!accessToken)
      return res
        .status(400)
        .json({ message: "Failed to retrieve Discord token" });

    // Fetch user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const discordUser = await userRes.json();

    // ✅ 1️⃣ Try to get user's default guild (server)
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guilds = await guildsRes.json();
    const firstGuild = guilds?.[0];

    let webhookUrl = null;
    if (firstGuild) {
      try {
        // ✅ 2️⃣ Create webhook in first text channel of that guild
        const channelsRes = await fetch(
          `https://discord.com/api/guilds/${firstGuild.id}/channels`,
          { headers: { Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}` } }
        );
        const channels = await channelsRes.json();
        const textChannel = channels.find((ch) => ch.type === 0); // type 0 = text

        if (textChannel) {
          const webhook = await createWebhook(
            textChannel.id,
            ENV.DISCORD_BOT_TOKEN
          );
          webhookUrl = webhook.url;
        }
      } catch (err) {
        console.error("⚠️ Webhook creation failed:", err.message);
      }
    }

    // ✅ 3️⃣ Save connection
    const connection = await Connection.findOneAndUpdate(
      { userId, platform: "discord" },
      {
        accessToken,
        refreshToken: tokenData.refresh_token,
        connected: true,
        username: discordUser.username,
        metadata: {
          discordId: discordUser.id,
          webhookUrl, // saved here
        },
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Discord connected for user ${userId}`);
    res.status(200).json({
      message: "Discord connected successfully ✅",
      connection,
    });
  } catch (err) {
    console.error("❌ discordCallback Error:", err);
    res
      .status(500)
      .json({ message: "Discord OAuth failed", error: err.message });
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
