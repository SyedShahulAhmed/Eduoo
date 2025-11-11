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
export const createWebhook = async (guildId, channelId, botToken) => {
  try {
    console.log("⚙️ Creating Discord webhook...");
    const url = `https://discord.com/api/v10/channels/${channelId}/webhooks`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Eduoo Summary Bot",
        avatar: ENV.BOT_AVATAR_URL || null,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Failed to create webhook: ${res.status} ${err}`);
      throw new Error("Failed to create webhook");
    }

    const webhook = await res.json();
    console.log(`✅ Webhook created: ${webhook.url}`);
    return webhook.url; // ✅ Return the webhook URL
  } catch (err) {
    console.error("❌ createWebhook error:", err.message);
    throw new Error("Failed to create webhook");
  }
};
