import fetch from "node-fetch";

/**
 * Send simple message to a Discord webhook.
 */
export const sendDiscordMessage = async (webhookUrl, content) => {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return res.ok;
  } catch (err) {
    console.error("❌ sendDiscordMessage Error:", err.message);
    return false;
  }
};

/**
 * Send embed-style message.
 */
export const sendDiscordEmbed = async (
  webhookUrl,
  title,
  description,
  color = 0x5865f2a
) => {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{ title, description, color }],
    }),
  });
  if (!res.ok) throw new Error(`Discord embed failed: ${res.status}`);
  return true;
};

/**
 * Create a webhook in a user's Discord channel (using their OAuth access token)
 */
export const createWebhook = async (channelId, accessToken) => {
  const res = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/webhooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "AICOO Bot" }),
    }
  );

  if (!res.ok) {
    console.error("❌ Failed to create webhook:", res.status);
    throw new Error("Failed to create webhook");
  }

  const webhook = await res.json();
  console.log(`✅ Webhook created in channel ${channelId}`);
  return webhook;
};
