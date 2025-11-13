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
        description: "⚠️ No connected platforms found. Please connect at least one integration.",
        footer: { text: "Connect integrations to start tracking progress!" },
      },
    };
  }

  const safe = async (fn, ...args) => {
    try {
      return await Promise.race([
        fn(...args),
        new Promise((_, reject) => setTimeout(() => reject("timeout"), 5000)),
      ]);
    } catch {
      return null;
    }
  };

  const fetchSection = async (conn) => {
    const { platform } = conn;
    const icon = icons[platform] || "📘";

    switch (platform) {

      case "github": {
        const r = await safe(fetchGitHubData, conn.accessToken);
        if (!r) return null;

        return `${icon} **GitHub**
• 🧾 Commits (Latest): **${r.recentCommits || 0}**
• 🏷️ Top Languages: **${r.topLanguages.join(", ") || "N/A"}**
• 👥 Followers: **${r.followers}**
• 🔥 Streak: **${r.commitStreak?.current || 0} days**`;
      }

      case "leetcode": {
        const username = conn.metadata?.username || conn.profileId;
        const r = await safe(fetchLeetCodeData, username);
        if (!r) return null;

        return `${icon} **LeetCode**
• 🧠 Solved: **${r.totalSolved}**
• 🔥 Streak: **${r.streak} days**
• 📊 Acceptance: **${r.acceptanceRate?.toFixed(2)}%**`;
      }

      case "codeforces": {
        const username = conn.metadata?.username || conn.profileId;
        const r = await safe(fetchCodeforcesData, username);
        if (!r) return null;

        return `${icon} **Codeforces**
• ⭐ Rating: **${r.rating}** (${r.rank})
• 🏆 Contests: **${r.totalContests}**
• 📈 Average Δ: **${r.avgChange}**`;
      }

      case "codechef": {
        const username = conn.metadata?.username || conn.profileId;
        const r = await safe(fetchCodechefData, username);
        if (!r) return null;

        return `${icon} **CodeChef**
• 🌟 Rating: **${r.stars} | ${r.rating}**
• 🧮 Solved: **${r.problemsSolved}**`;
      }

      case "duolingo": {
        const username = conn.metadata?.username || conn.profileId;
        const r = await safe(fetchDuolingoProfile, username);
        if (!r) return null;

        const langs = r.languages.map(l => l.language).join(", ");

        return `${icon} **Duolingo**
• 🔥 Streak: **${r.streak} days**
• 🏆 XP: **${r.totalXp.toLocaleString()}**
• 🌍 Languages: **${langs}**`;
      }

      case "spotify": {
        const r = await safe(fetchSpotifyData, conn.accessToken);
        if (!r) return null;

        const ct = r.currentTrack;
        const nowPlaying = ct ? `${ct.name} — ${ct.artist}` : "Nothing playing";

        return `${icon} **Spotify**
• 🎧 Now Playing: **${nowPlaying}**
• 🎶 Playlists: **${r.stats.totalPlaylists}**`;
      }

      default:
        return null;
    }
  };

  const results = await Promise.all(connections.map(fetchSection));
  const finalSections = results.filter(Boolean).join("\n\n");

  const embed = {
    color: 0x5865f2,
    title: "📊 AICOO Daily Productivity Summary",
    description: finalSections || "⚠️ No data available.",
    fields: [{ name: "💡 Motivation", value: randomMotivation() }],
    footer: { text: `Updated • ${new Date().toLocaleString()}` },
    timestamp: new Date().toISOString(),
  };

  return { embed };
};

const randomMotivation = () => {
  const quotes = [
    "🔥 Keep showing up — momentum builds success.",
    "🌱 Progress, not perfection. Keep growing!",
    "💪 Small steps daily → big gains tomorrow.",
    "🚀 Stay consistent. Big wins come from focus.",
    "✨ You are closer than you think.",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
};
