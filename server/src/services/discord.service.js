// src/services/discord.service.js
import fetch from "node-fetch";

/**
 * Send message via Discord webhook
 */
export const sendDiscordMessage = async (webhookUrl, content) => {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`Failed to send Discord message: ${res.status}`);
    return true;
  } catch (err) {
    console.error("❌ sendDiscordMessage Error:", err.message);
    return false;
  }
};

/**
 * Send embed message
 */
export const sendDiscordEmbed = async (webhookUrl, title, description, color = 0x5865f2) => {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{ title, description, color }],
      }),
    });
    if (!res.ok) throw new Error(`Failed to send Discord embed: ${res.status}`);
    return true;
  } catch (err) {
    console.error("❌ sendDiscordEmbed Error:", err.message);
    return false;
  }
};

/**
 * Utility to create a Discord webhook (bot-based)
 */
export const createWebhook = async (channelId, accessToken) => {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "AICOO Bot" }),
  });
  if (!res.ok) throw new Error("Failed to create webhook");
  return await res.json();
};
