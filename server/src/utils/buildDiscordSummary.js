// src/utils/buildDiscordSummary.js
import fetch from "node-fetch";
import { ENV } from "../config/env.js";
import Connection from "../models/Connection.js";

/**
 * 🧩 Builds a clean, professional daily summary embed for Discord.
 * It aggregates data from all connected platforms via the /api/reports endpoints.
 */
export const buildDiscordSummary = async (userId) => {
  const BASE_URL = ENV.SERVER_URL || "https://eduoo.onrender.com/api/reports";

  // emoji map for each platform
  const icons = {
    github: "💻",
    leetcode: "🧠",
    codeforces: "⚔️",
    codechef: "🍴",
    duolingo: "🗣️",
    spotify: "🎵",
  };

  // store fetched summaries
  const summaryBlocks = [];
  const activePlatforms = [];
  const errors = [];

  try {
    // 1️⃣ get all connected integrations
    const connections = await Connection.find({ userId, connected: true });

    // 2️⃣ fetch each report from backend
    for (const conn of connections) {
      const platform = conn.platform.toLowerCase();
      const icon = icons[platform] || "📘";
      const reportUrl = `${BASE_URL}/${platform}`;

      try {
        const res = await fetch(reportUrl, {
          headers: {
            Authorization: `Bearer ${conn.userToken || ENV.INTERNAL_API_KEY || ""}`,
          },
        });

        const json = await res.json();

        // if report returns AI insight or summary text
        const summaryText =
          json?.data?.summary ||
          json?.data?.insight ||
          json?.message ||
          "No new activity today.";

        summaryBlocks.push(`${icon} **${capitalize(platform)}:** ${summaryText}`);
        activePlatforms.push(capitalize(platform));
      } catch (err) {
        errors.push(`${platform}: ${err.message}`);
      }
    }

    // 3️⃣ Build the main embed message
    const embed = {
      color: 0x5865f2,
      title: "📊 AICOO Daily Productivity Summary",
      description:
        summaryBlocks.length > 0
          ? summaryBlocks.join("\n\n")
          : "⚠️ No active data available. Connect your platforms to start tracking your progress.",
      fields: [
        {
          name: "💡 Motivation",
          value:
            randomMotivation(),
        },
      ],
      footer: {
        text: `Connected: ${activePlatforms.join(", ") || "None"} • ${new Date().toLocaleTimeString()}`,
      },
      timestamp: new Date().toISOString(),
    };

    // 4️⃣ return structured embed
    return { embed, activePlatforms, errors };
  } catch (err) {
    console.error("❌ buildDiscordSummary Error:", err.message);
    throw new Error("Failed to build Discord summary");
  }
};

/** helper: capitalize first letter */
const capitalize = (str = "") => str.charAt(0).toUpperCase() + str.slice(1);

/** helper: random motivational line */
const randomMotivation = () => {
  const lines = [
    "✨ Small progress every day adds up to big results.",
    "🚀 Consistency beats intensity — one step at a time!",
    "💪 You’re building habits that future you will thank for.",
    "🔥 Keep the streak alive — even one task counts today!",
    "🌱 Growth is invisible until it’s undeniable. Keep going!",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
};
