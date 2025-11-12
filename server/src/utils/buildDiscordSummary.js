import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchCodechefData } from "../services/codechef.service.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";

/**
 * Builds the unified Discord summary embed.
 * Fully safe — never throws uncaught errors.
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

    if (!connections.length) {
      const embed = {
        color: 0xffa500,
        title: "📊 AICOO Daily Productivity Summary",
        description: "⚠️ No connected platforms found. Please connect at least one integration.",
        footer: { text: "Connect your integrations to start tracking progress!" },
      };
      return { embed };
    }

    // Helper to safely call async fetchers
    const safeFetch = async (fn, ...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        console.error("❌ Fetch Error:", err.message);
        return null;
      }
    };

    for (const conn of connections) {
      const platform = conn.platform;
      const icon = icons[platform] || "📘";

      switch (platform) {
        /** =================== GITHUB =================== */
        case "github": {
          const token = conn.accessToken;
          if (!token) {
            sections.push(`⚠️ **GitHub** — Missing access token.`);
            break;
          }
          const data = await safeFetch(fetchGitHubData, token);
          if (!data) {
            sections.push(`⚠️ **GitHub** — Failed to fetch data.`);
            break;
          }
          sections.push(
            `${icon} **GitHub**\n• Commits: ${data.recentCommits}\n• Top Languages: ${data.topLanguages.join(", ")}\n• Followers: ${data.followers}`
          );
          active.push("GitHub");
          break;
        }

        /** =================== LEETCODE =================== */
        case "leetcode": {
          const username = conn.metadata?.username || conn.profileId || conn.metadata?.profileId;
          if (!username) {
            sections.push(`⚠️ **LeetCode** — Missing username.`);
            break;
          }
          const data = await safeFetch(fetchLeetCodeData, username);
          if (!data) {
            sections.push(`⚠️ **LeetCode** — Failed to fetch data.`);
            break;
          }
          sections.push(
            `${icon} **LeetCode**\n• Solved: ${data.totalSolved} (Easy: ${data.easySolved}, Medium: ${data.mediumSolved})\n• ${data.streak || 0}-day streak • Acceptance: ${data.acceptanceRate?.toFixed(2) ?? 0}%`
          );
          active.push("LeetCode");
          break;
        }

        /** =================== CODEFORCES =================== */
        case "codeforces": {
          const username = conn.metadata?.username || conn.profileId || conn.accessToken;
          if (!username) {
            sections.push(`⚠️ **Codeforces** — Missing handle.`);
            break;
          }
          const data = await safeFetch(fetchCodeforcesData, username);
          if (!data) {
            sections.push(`⚠️ **Codeforces** — Failed to fetch data.`);
            break;
          }
          sections.push(
            `${icon} **Codeforces**\n• Rating: ${data.rating || "Unrated"} (${data.rank})\n• Contests: ${data.totalContests}\n• Last Contest: ${data.lastContest?.name || "—"}`
          );
          active.push("Codeforces");
          break;
        }

        /** =================== CODECHEF =================== */
        case "codechef": {
          const username = conn.metadata?.username || conn.profileId || conn.accessToken;
          if (!username) {
            sections.push(`⚠️ **CodeChef** — Missing username.`);
            break;
          }
          const data = await safeFetch(fetchCodechefData, username);
          if (!data) {
            sections.push(`⚠️ **CodeChef** — Failed to fetch data.`);
            break;
          }
          sections.push(
            `${icon} **CodeChef**\n• ${data.stars} | Rating: ${data.rating}\n• Solved: ${data.problemsSolved}`
          );
          active.push("CodeChef");
          break;
        }

        /** =================== DUOLINGO =================== */
        case "duolingo": {
          const username = conn.metadata?.username || conn.profileId || conn.metadata?.profileId;
          if (!username) {
            sections.push(`⚠️ **Duolingo** — Missing username.`);
            break;
          }
          const data = await safeFetch(fetchDuolingoProfile, username);
          if (!data) {
            sections.push(`⚠️ **Duolingo** — Failed to fetch data.`);
            break;
          }
          const langs = data.languages.map((l) => l.language).join(", ");
          sections.push(
            `${icon} **Duolingo**\n• ${data.totalXp.toLocaleString()} XP | ${data.streak}-day streak\n• Languages: ${langs}`
          );
          active.push("Duolingo");
          break;
        }

        /** =================== SPOTIFY =================== */
        case "spotify": {
          const token = conn.accessToken;
          if (!token) {
            sections.push(`⚠️ **Spotify** — Missing access token.`);
            break;
          }
          const data = await safeFetch(fetchSpotifyData, token);
          if (!data) {
            sections.push(`⚠️ **Spotify** — Failed to fetch data.`);
            break;
          }
          const track = data.currentTrack?.name || "Nothing playing";
          const artist = data.currentTrack?.artist ? ` by ${data.currentTrack.artist}` : "";
          sections.push(
            `${icon} **Spotify**\n• 🎧 Now Playing: ${track}${artist}\n• Recent Tracks: ${data.stats.totalRecentTracks}\n• Playlists: ${data.stats.totalPlaylists}`
          );
          active.push("Spotify");
          break;
        }

        default:
          break;
      }
    }

    // ✅ Combine and format output
    const description = sections.join("\n\n");

    const embed = {
      color: 0x5865f2,
      title: "📊 AICOO Daily Productivity Summary",
      description: description || "⚠️ No data available for your integrations.",
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
    console.error("❌ buildDiscordSummary Fatal Error:", err);
    const embed = {
      color: 0xff0000,
      title: "❌ Summary Generation Failed",
      description: `Error: ${err.message || "Unknown error occurred."}`,
      footer: { text: "AICOO Summary Builder" },
      timestamp: new Date().toISOString(),
    };
    return { embed };
  }
};

/** 🎯 Random motivational quotes */
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
