// src/utils/buildDiscordSummary.js
import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchCodechefData } from "../services/codechef.service.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";

/**
 * ✨ Build a professional daily productivity summary for Discord.
 * Uses connected platform tokens and renders a clean, spaced summary.
 */
export const buildDiscordSummary = async (userId) => {
  const icons = {
    github: "💻",
    leetcode: "🧠",
    codeforces: "⚔️",
    codechef: "🍴",
    duolingo: "🗣️",
    spotify: "🎵",
  };

  const lines = [];
  const active = [];
  const errors = [];

  try {
    const connections = await Connection.find({ userId, connected: true });
    if (!connections?.length) throw new Error("No connected integrations found.");

    for (const conn of connections) {
      const { platform, accessToken, metadata } = conn;
      const icon = icons[platform] || "📘";

      try {
        switch (platform) {
          case "github": {
            const data = await fetchGitHubData(accessToken);
            lines.push(
              `${icon} **GitHub**\n• ${data.recentCommits} commits this month\n• Top languages: ${data.topLanguages.join(", ")}\n• Followers: ${data.followers}`
            );
            active.push("GitHub");
            break;
          }

          case "leetcode": {
            const data = await fetchLeetCodeData(metadata.username);
            lines.push(
              `${icon} **LeetCode**\n• ${data.totalSolved} problems solved\n• ${data.streak || 0}-day streak\n• Acceptance rate: ${data.acceptanceRate}%`
            );
            active.push("LeetCode");
            break;
          }

          case "codeforces": {
            const data = await fetchCodeforcesData(metadata.username);
            lines.push(
              `${icon} **Codeforces**\n• Rating: ${data.rating} (${data.rank})\n• Total Contests: ${data.totalContests}\n• Last Contest: ${data.lastContest?.name || "—"}`
            );
            active.push("Codeforces");
            break;
          }

          case "codechef": {
            const data = await fetchCodechefData(metadata.username);
            lines.push(
              `${icon} **CodeChef**\n• ${data.stars} | Rating: ${data.rating}\n• Global Rank: ${data.globalRank}\n• Problems Solved: ${data.problemsSolved}`
            );
            active.push("CodeChef");
            break;
          }

          case "duolingo": {
            const data = await fetchDuolingoProfile(metadata.username);
            lines.push(
              `${icon} **Duolingo**\n• ${data.totalXp} XP | ${data.streak}-day streak\n• Languages: ${data.languages
                .map((l) => l.language)
                .slice(0, 3)
                .join(", ")}`
            );
            active.push("Duolingo");
            break;
          }

          case "spotify": {
            const data = await fetchSpotifyData(accessToken);
            const topArtist = data.topArtists[0] || "Unknown";
            lines.push(
              `${icon} **Spotify**\n• ${data.recentTracks.length} tracks played today\n• Top Artist: ${topArtist}\n• Playlists: ${data.stats.totalPlaylists}`
            );
            active.push("Spotify");
            break;
          }

          default:
            break;
        }
      } catch (err) {
        errors.push(`${platform}: ${err.message}`);
      }
    }

    // 🪄 Join all sections with clear spacing
    const description = lines.length
      ? lines.join("\n\n")
      : "⚠️ No recent activity found.";

    // 🧠 Build embed
    const embed = {
      color: 0x5865f2,
      title: "📊 AICOO Daily Productivity Summary",
      description,
      fields: [
        {
          name: "💡 Motivation",
          value: randomMotivation(),
        },
      ],
      footer: {
        text: `Connected: ${active.join(", ") || "None"} • ${new Date().toLocaleTimeString()}`,
      },
      timestamp: new Date().toISOString(),
    };

    return { embed, errors };
  } catch (err) {
    console.error("❌ buildDiscordSummary Error:", err.message);
    throw new Error("Failed to build Discord summary");
  }
};

// helper functions
const randomMotivation = () => {
  const quotes = [
    "🚀 Consistency beats intensity — one step at a time!",
    "✨ Small progress every day adds up to big results.",
    "🔥 Keep showing up — momentum builds success.",
    "💪 Today’s small win is tomorrow’s big leap.",
    "🌱 Growth happens quietly. Keep moving forward.",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
};
