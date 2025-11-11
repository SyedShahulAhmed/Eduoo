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
    if (!guildId || !channelId)
      throw new Error("Missing guildId or channelId for webhook creation");

    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/webhooks`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bot ${ENV.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Eduoo Daily Summary",
          avatar: "https://i.imgur.com/n2s3B4M.png", // optional
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Webhook creation failed:", data);
      throw new Error(data.message || "Failed to create webhook");
    }

    console.log(`✅ Webhook created successfully in channel ${channelId}: ${data.url}`);
    return data;
  } catch (err) {
    console.error("❌ createWebhook Error:", err.message);
    return null;
  }
};
