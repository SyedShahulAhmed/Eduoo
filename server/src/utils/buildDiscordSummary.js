import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchCodechefData } from "../services/codechef.service.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
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

  try {
    const connections = await Connection.find({ userId, connected: true });

    if (!connections.length)
      throw new Error("No connected platforms found for this user.");

    for (const conn of connections) {
      const platform = conn.platform;
      const icon = icons[platform] || "📘";

      try {
        switch (platform) {
          // ===== GITHUB =====
          case "github": {
            const token = conn.accessToken;
            if (!token) throw new Error("Missing GitHub token.");
            const data = await fetchGitHubData(token);
            sections.push(
              `${icon} **GitHub**\n• Commits: ${data.recentCommits}\n• Top Languages: ${data.topLanguages.join(
                ", "
              )}\n• Followers: ${data.followers}`
            );
            active.push("GitHub");
            break;
          }

          // ===== LEETCODE =====
          case "leetcode": {
            const username =
              conn.metadata?.username ||
              conn.profileId ||
              conn.metadata?.profileId;
            if (!username) throw new Error("Missing LeetCode username.");
            const data = await fetchLeetCodeData(username);
            sections.push(
              `${icon} **LeetCode**\n• Solved: ${data.totalSolved} (Easy: ${data.easySolved}, Medium: ${data.mediumSolved})\n• ${data.streak || 0}-day streak • Acceptance: ${data.acceptanceRate.toFixed(
                2
              )}%`
            );
            active.push("LeetCode");
            break;
          }

          // ===== CODEFORCES =====
          case "codeforces": {
            const username =
              conn.metadata?.username ||
              conn.profileId ||
              conn.accessToken;
            if (!username) throw new Error("Missing Codeforces handle.");
            const data = await fetchCodeforcesData(username);
            sections.push(
              `${icon} **Codeforces**\n• Rating: ${data.rating || "Unrated"} (${data.rank})\n• Contests: ${
                data.totalContests
              }\n• Last Contest: ${data.lastContest?.name || "—"}`
            );
            active.push("Codeforces");
            break;
          }

          // ===== CODECHEF =====
          case "codechef": {
            const username =
              conn.metadata?.username ||
              conn.profileId ||
              conn.accessToken;
            if (!username) throw new Error("Missing CodeChef username.");
            const data = await fetchCodechefData(username);
            sections.push(
              `${icon} **CodeChef**\n• ${data.stars} | Rating: ${data.rating}\n• Solved: ${data.problemsSolved}`
            );
            active.push("CodeChef");
            break;
          }

          // ===== DUOLINGO =====
          case "duolingo": {
            const username =
              conn.metadata?.username ||
              conn.profileId ||
              conn.metadata?.profileId;
            if (!username) throw new Error("Missing Duolingo username.");
            const data = await fetchDuolingoProfile(username);
            const langs = data.languages.map((l) => l.language).join(", ");
            sections.push(
              `${icon} **Duolingo**\n• ${data.totalXp.toLocaleString()} XP | ${data.streak}-day streak\n• Languages: ${langs}`
            );
            active.push("Duolingo");
            break;
          }

          // ===== SPOTIFY =====
          case "spotify": {
            const token = conn.accessToken;
            if (!token) throw new Error("Missing Spotify token.");
            const data = await fetchSpotifyData(token);
            const track = data.currentTrack?.name || "Nothing playing";
            const artist = data.currentTrack?.artist || "";
            sections.push(
              `${icon} **Spotify**\n• 🎧 Now Playing: ${track}${
                artist ? ` by ${artist}` : ""
              }\n• Recent Tracks: ${data.stats.totalRecentTracks}\n• Playlists: ${data.stats.totalPlaylists}`
            );
            active.push("Spotify");
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error(`⚠️ ${platform} fetch failed:`, err.message);
        sections.push(`⚠️ **${platform.toUpperCase()}** — ${err.message}`);
      }
    }

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
    console.error("❌ buildDiscordSummary Fatal Error:", err.message);
    throw new Error("Failed to build Discord summary");
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
