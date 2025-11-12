import fetch from "node-fetch";
import { ENV } from "../config/env.js";

const commands = [
  { name: "getsummary", description: "📊 AI-powered daily productivity summary" },
  { name: "todayreport", description: "📅 View today's productivity stats" },
  { name: "streak", description: "🔥 Check your current streaks" },
  { name: "goals", description: "🎯 Check your goal progress" },
  { name: "help", description: "ℹ️ List all available commands" },
];


const registerCommands = async () => {
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

  if (res.ok) console.log("✅ Slash commands registered");
  else console.error("❌ Failed to register commands", await res.text());
};

registerCommands();
