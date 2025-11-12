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

  const sections = [];
  const active = [];

  // ✅ Timeout wrapper
  const withTimeout = (promise, ms = 5000) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout fetching data")), ms)
      ),
    ]);

  try {
    const connections = await Connection.find({ userId, connected: true });

    if (!connections.length) {
      return {
        embed: {
          color: 0xffa500,
          title: "📊 AICOO Daily Productivity Summary",
          description:
            "⚠️ No connected platforms found. Please connect at least one integration.",
          footer: {
            text: "Connect your integrations to start tracking progress!",
          },
        },
      };
    }

    const safeFetch = async (fn, ...args) => {
      try {
        return await withTimeout(fn(...args));
      } catch (err) {
        console.error("❌ Fetch Error:", err.message);
        return null;
      }
    };

    for (const conn of connections) {
      const { platform } = conn;
      const icon = icons[platform] || "📘";

      try {
        switch (platform) {
          case "github": {
            const token = conn.accessToken;
            if (!token)
              throw new Error("Missing GitHub token");
            const data = await safeFetch(fetchGitHubData, token);
            if (!data) throw new Error("Failed to fetch data");
            sections.push(
              `${icon} **GitHub**\n• Commits: ${data.recentCommits}\n• Top Languages: ${data.topLanguages.join(", ")}\n• Followers: ${data.followers}`
            );
            active.push("GitHub");
            break;
          }

          case "leetcode": {
            const username =
              conn.metadata?.username || conn.profileId || conn.metadata?.profileId;
            if (!username)
              throw new Error("Missing LeetCode username");
            const data = await safeFetch(fetchLeetCodeData, username);
            if (!data) throw new Error("Failed to fetch data");
            sections.push(
              `${icon} **LeetCode**\n• Solved: ${data.totalSolved} (Easy: ${data.easySolved}, Medium: ${data.mediumSolved})\n• ${data.streak || 0}-day streak • Acceptance: ${data.acceptanceRate?.toFixed(2) ?? 0}%`
            );
            active.push("LeetCode");
            break;
          }

          case "codeforces": {
            const username =
              conn.metadata?.username || conn.profileId || conn.accessToken;
            if (!username)
              throw new Error("Missing Codeforces handle");
            const data = await safeFetch(fetchCodeforcesData, username);
            if (!data) throw new Error("Failed to fetch data");
            sections.push(
              `${icon} **Codeforces**\n• Rating: ${data.rating || "Unrated"} (${data.rank})\n• Contests: ${data.totalContests}\n• Last Contest: ${data.lastContest?.name || "—"}`
            );
            active.push("Codeforces");
            break;
          }

          case "codechef": {
            const username =
              conn.metadata?.username || conn.profileId || conn.accessToken;
            if (!username)
              throw new Error("Missing CodeChef username");
            const data = await safeFetch(fetchCodechefData, username);
            if (!data) throw new Error("Failed to fetch data");
            sections.push(
              `${icon} **CodeChef**\n• ${data.stars} | Rating: ${data.rating}\n• Solved: ${data.problemsSolved}`
            );
            active.push("CodeChef");
            break;
          }

          case "duolingo": {
            const username =
              conn.metadata?.username || conn.profileId || conn.metadata?.profileId;
            if (!username)
              throw new Error("Missing Duolingo username");
            const data = await safeFetch(fetchDuolingoProfile, username);
            if (!data) throw new Error("Failed to fetch data");
            const langs = data.languages.map((l) => l.language).join(", ");
            sections.push(
              `${icon} **Duolingo**\n• ${data.totalXp.toLocaleString()} XP | ${data.streak}-day streak\n• Languages: ${langs}`
            );
            active.push("Duolingo");
            break;
          }

          case "spotify": {
            const token = conn.accessToken;
            if (!token)
              throw new Error("Missing Spotify token");
            const data = await safeFetch(fetchSpotifyData, token);
            if (!data) throw new Error("Failed to fetch data");
            const track = data.currentTrack?.name || "Nothing playing";
            const artist = data.currentTrack?.artist ? ` by ${data.currentTrack.artist}` : "";
            sections.push(
              `${icon} **Spotify**\n• 🎧 Now Playing: ${track}${artist}\n• Recent Tracks: ${data.stats.totalRecentTracks}\n• Playlists: ${data.stats.totalPlaylists}`
            );
            active.push("Spotify");
            break;
          }
        }
      } catch (err) {
        sections.push(`⚠️ **${platform.toUpperCase()}** — ${err.message}`);
      }
    }

    const description = sections.join("\n\n");

    const embed = {
      color: 0x5865f2,
      title: "📊 AICOO Daily Productivity Summary",
      description: description || "⚠️ No data available for your integrations.",
      fields: [
        { name: "💡 Motivation", value: randomMotivation() },
      ],
      footer: {
        text: `Connected: ${active.join(", ") || "None"} • ${new Date().toLocaleTimeString()}`,
      },
      timestamp: new Date().toISOString(),
    };

    return { embed };
  } catch (err) {
    console.error("❌ buildDiscordSummary Fatal Error:", err);
    return {
      embed: {
        color: 0xff0000,
        title: "❌ Summary Generation Failed",
        description: `Error: ${err.message || "Unknown error occurred."}`,
        footer: { text: "AICOO Summary Builder" },
        timestamp: new Date().toISOString(),
      },
    };
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
