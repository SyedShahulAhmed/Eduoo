import Connection from "../models/Connection.js";
import { fetchCodechefData } from "../services/codechef.service.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";

export const buildDiscordSummary = async (userId) => {
  const icons = {
    github: "💻",
    leetcode: "🧠",
    codeforces: "⚔️",
    codechef: "🍴",
    duolingo: "🗣️",
    spotify: "🎵",
  };

  const connections = await Connection.find({ userId, connected: true });
  if (!connections.length) {
    return {
      embed: {
        color: 0xffa500,
        title: "📊 AICOO Daily Productivity Summary",
        description:
          "⚠️ No connected platforms found. Please connect at least one integration.",
        footer: { text: "Connect integrations to start tracking progress!" },
      },
    };
  }

  const withTimeout = (promise, ms = 5000) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout fetching data")), ms)
      ),
    ]);

  const fetchPromises = connections.map(async (conn) => {
    const { platform } = conn;
    const icon = icons[platform] || "📘";

    const safeFetch = async (fn, ...args) => {
      try {
        return await withTimeout(fn(...args), 5000);
      } catch {
        return null;
      }
    };

    try {
      switch (platform) {
        case "github": {
          const token = conn.accessToken;
          const data = await safeFetch(fetchGitHubData, token);
          if (!data) throw new Error("Failed to fetch");
          return `${icon} **GitHub**\n• Commits: ${data.recentCommits}\n• Top: ${data.topLanguages.join(", ")}\n• Followers: ${data.followers}`;
        }
        case "leetcode": {
          const username = conn.metadata?.username || conn.profileId;
          const data = await safeFetch(fetchLeetCodeData, username);
          if (!data) throw new Error("Failed to fetch");
          return `${icon} **LeetCode**\n• Solved: ${data.totalSolved}\n• Streak: ${data.streak}\n• Acceptance: ${data.acceptanceRate?.toFixed(2) ?? 0}%`;
        }
        case "codeforces": {
          const username = conn.metadata?.username || conn.profileId;
          const data = await safeFetch(fetchCodeforcesData, username);
          if (!data) throw new Error("Failed to fetch");
          return `${icon} **Codeforces**\n• Rating: ${data.rating}\n• Rank: ${data.rank}\n• Contests: ${data.totalContests}`;
        }
        case "codechef": {
          const username = conn.metadata?.username || conn.profileId;
          const data = await safeFetch(fetchCodechefData, username);
          if (!data) throw new Error("Failed to fetch");
          return `${icon} **CodeChef**\n• ${data.stars} | Rating: ${data.rating}\n• Solved: ${data.problemsSolved}`;
        }
        case "duolingo": {
          const username = conn.metadata?.username || conn.profileId;
          const data = await safeFetch(fetchDuolingoProfile, username);
          if (!data) throw new Error("Failed to fetch");
          const langs = data.languages.map((l) => l.language).join(", ");
          return `${icon} **Duolingo**\n• XP: ${data.totalXp.toLocaleString()} | Streak: ${data.streak}\n• Languages: ${langs}`;
        }
        case "spotify": {
          const token = conn.accessToken;
          const data = await safeFetch(fetchSpotifyData, token);
          if (!data) throw new Error("Failed to fetch");
          const track = data.currentTrack?.name || "Nothing playing";
          const artist = data.currentTrack?.artist
            ? ` by ${data.currentTrack.artist}`
            : "";
          return `${icon} **Spotify**\n• 🎧 Now Playing: ${track}${artist}\n• Playlists: ${data.stats.totalPlaylists}`;
        }
        default:
          return `⚠️ Unsupported platform: ${platform}`;
      }
    } catch (err) {
      return `⚠️ **${platform.toUpperCase()}** — ${err.message}`;
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  const sections = results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value)
    .join("\n\n");

  const embed = {
    color: 0x5865f2,
    title: "📊 AICOO Daily Productivity Summary",
    description: sections || "⚠️ No data available for your integrations.",
    fields: [{ name: "💡 Motivation", value: randomMotivation() }],
    footer: {
      text: `Updated • ${new Date().toLocaleTimeString()}`,
    },
    timestamp: new Date().toISOString(),
  };

  return { embed };
};

const randomMotivation = () => {
  const quotes = [
    "🔥 Keep showing up — momentum builds success.",
    "🌱 Progress, not perfection. Keep growing!",
    "💪 Every small effort counts toward greatness.",
    "🚀 Stay consistent. Big wins come from daily focus.",
    "✨ The journey matters more than the speed.",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
};
