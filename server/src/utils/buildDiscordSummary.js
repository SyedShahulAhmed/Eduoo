// src/utils/buildDiscordSummary.js
import Connection from "../models/Connection.js";
import { getGitHubReport } from "../controllers/reports/github.report.js";
import { getLeetCodeReport } from "../controllers/reports/leetcode.report.js";
import { getCodeforcesReport } from "../controllers/reports/codeforces.report.js";
import { getCodechefReport } from "../controllers/reports/codechef.report.js";
import { getDuolingoReport } from "../controllers/reports/duolingo.report.js";
import { getSpotifyReport } from "../controllers/reports/spotify.report.js";

/**
 * 💎 Builds a professional, spaced daily summary embed for Discord.
 * Uses real platform data from backend report controllers.
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

  const sections = [];
  const active = [];

  try {
    const connections = await Connection.find({ userId, connected: true });

    for (const conn of connections) {
      const platform = conn.platform;
      const icon = icons[platform] || "📘";

      try {
        switch (platform) {
          case "github": {
            const { report } = await getGitHubReport({ user: { id: userId } });
            sections.push(
              `${icon} **GitHub**\n• Commits: ${report.recentCommits}\n• Top Languages: ${report.topLanguages.join(
                ", "
              )}\n• Followers: ${report.followers}`
            );
            active.push("GitHub");
            break;
          }

          case "leetcode": {
            const { report } = await getLeetCodeReport({ user: { id: userId } });
            sections.push(
              `${icon} **LeetCode**\n• Solved: ${report.totalSolved} (Easy: ${report.easySolved}, Medium: ${report.mediumSolved})\n• ${report.streak}-day streak • Acceptance: ${report.acceptanceRate.toFixed(
                2
              )}%`
            );
            active.push("LeetCode");
            break;
          }

          case "codeforces": {
            const { report } = await getCodeforcesReport({ user: { id: userId } });
            sections.push(
              `${icon} **Codeforces**\n• Rating: ${report.rating || "Unrated"} (${report.rank})\n• Contests: ${
                report.totalContests
              }\n• Last: ${report.lastContest?.name || "—"}`
            );
            active.push("Codeforces");
            break;
          }

          case "codechef": {
            const { report } = await getCodechefReport({ user: { id: userId } });
            sections.push(
              `${icon} **CodeChef**\n• ${report.stars} | Rating: ${report.rating}\n• Solved: ${report.problemsSolved}`
            );
            active.push("CodeChef");
            break;
          }

          case "duolingo": {
            const { report } = await getDuolingoReport({ user: { id: userId } });
            const langs = report.languages.map((l) => l.language).slice(0, 3).join(", ");
            sections.push(
              `${icon} **Duolingo**\n• ${report.totalXp.toLocaleString()} XP | ${report.streak}-day streak\n• Languages: ${langs}`
            );
            active.push("Duolingo");
            break;
          }

          case "spotify": {
            const { data } = await getSpotifyReport({ user: { id: userId } });
            const track = data.currentTrack?.name || "Nothing playing";
            const artist = data.currentTrack?.artist || "";
            sections.push(
              `${icon} **Spotify**\n• 🎧 Now Playing: ${track} ${artist ? `by ${artist}` : ""}\n• Recent Tracks: ${
                data.stats.totalRecentTracks
              }\n• Playlists: ${data.stats.totalPlaylists}`
            );
            active.push("Spotify");
            break;
          }

          default:
            break;
        }
      } catch (err) {
        sections.push(`⚠️ **${platform.toUpperCase()}** — Data unavailable (${err.message})`);
      }
    }

    // Format layout with padding between sections
    const description = sections.join("\n\n");

    // Final Discord embed
    const embed = {
      color: 0x5865f2,
      title: "📊 AICOO Daily Productivity Summary",
      description: description || "⚠️ No data found. Connect your integrations first.",
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

    return { embed };
  } catch (err) {
    console.error("❌ buildDiscordSummary Error:", err.message);
    throw new Error("Failed to build summary");
  }
};

// 🎯 Random motivational quotes
const randomMotivation = () => {
  const quotes = [
  "🔥 Keep showing up — momentum builds success.",
  "🌱 Progress, not perfection. Keep growing!",
  "💪 Every small effort counts toward greatness.",
  "🚀 Stay consistent. Big wins come from daily focus.",
  "✨ The journey matters more than the speed.",
  "🎯 Discipline is doing what needs to be done, even when you don’t feel like it.",
  "🏆 Success is the sum of small efforts, repeated day in and day out.",
  "🌅 Each new day is another chance to level up your goals.",
  "⚡ Action cures fear — start now, refine later.",
  "💥 You don’t have to be extreme, just consistent.",
];

  return quotes[Math.floor(Math.random() * quotes.length)];
};
