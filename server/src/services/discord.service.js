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
export const sendDiscordEmbed = async (webhookUrl, title, description, color = 0x5865f2) => {
  try {
    // Ensure clean text
    const desc = typeof description === "string" ? description.trim() : String(description);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: desc,
            color: Number(color), // must be decimal integer
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Discord embed failed:", res.status, text);
      throw new Error(`Discord embed failed: ${res.status}`);
    }

    console.log("✅ Embed sent successfully");
    return true;
  } catch (err) {
    console.error("❌ sendDiscordEmbed Error:", err);
    throw err;
  }
};

/**
 * Create a webhook in the first accessible text channel of the guild
 */
export const createWebhook = async (guildId, channelId) => {
  try {
    // ✅ Use Bot Token, not OAuth token
    const url = `https://discord.com/api/v10/channels/${channelId}/webhooks`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${ENV.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "AICOO Daily Summary",
        avatar: "https://i.imgur.com/n2s3B4M.png", // optional logo
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create webhook: ${error.message || res.statusText}`);
    }

    const data = await res.json();
    console.log("✅ Webhook created:", data.url);
    return data;
  } catch (err) {
    console.error("❌ Webhook creation failed:", err.message);
    return null;
  }
};

