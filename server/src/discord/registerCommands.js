import fetch from "node-fetch";
import { ENV } from "../config/env.js";

const commands = [
  {
    name: "goals",
    description: "📊 View your active and completed goals",
  },
  {
    name: "getsummary",
    description: "🧾 Get your daily combined progress summary",
  },
];

const registerCommands = async () => {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/applications/${ENV.DISCORD_CLIENT_ID}/commands`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      }
    );

    if (!res.ok) throw new Error(`Error: ${res.status}`);
    console.log("✅ Slash commands registered successfully!");
  } catch (err) {
    console.error("❌ Command registration failed:", err.message);
  }
};

registerCommands();
