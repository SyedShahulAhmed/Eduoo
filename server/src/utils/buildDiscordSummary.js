// src/utils/buildDiscordSummary.js
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchCodechefData } from "../services/codechef.service.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";
import Connection from "../models/Connection.js";

/**
 * 🧩 Build live AICOO summary for a user's connected platforms
 */
export const buildDiscordSummary = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });

    const summaryLines = [];
    const activePlatforms = [];
    const errors = [];

    for (const conn of connections) {
      try {
        switch (conn.platform) {
          case "github": {
            const data = await fetchGitHubData(conn.accessToken);
            summaryLines.push(
              `💻 **GitHub:** ${data.recentCommits} commits, top langs: ${data.topLanguages.join(", ")}`
            );
            activePlatforms.push("GitHub");
            break;
          }

          case "leetcode": {
            const data = await fetchLeetCodeData(conn.metadata.username);
            summaryLines.push(
              `🧠 **LeetCode:** ${data.totalSolved} solved (${data.streak || 0}-day streak)`
            );
            activePlatforms.push("LeetCode");
            break;
          }

          case "codeforces": {
            const data = await fetchCodeforcesData(conn.metadata.username);
            summaryLines.push(
              `⚔️ **Codeforces:** ${data.rating} (${data.rank}), ${data.totalContests} contests`
            );
            activePlatforms.push("Codeforces");
            break;
          }

          case "codechef": {
            const data = await fetchCodechefData(conn.metadata.username);
            summaryLines.push(
              `🍴 **CodeChef:** ${data.rating} (${data.stars}), Global Rank: ${data.globalRank}`
            );
            activePlatforms.push("CodeChef");
            break;
          }

          case "duolingo": {
            const data = await fetchDuolingoProfile(conn.metadata.username);
            summaryLines.push(
              `🗣️ **Duolingo:** ${data.totalXp} XP (${data.streak}-day streak)`
            );
            activePlatforms.push("Duolingo");
            break;
          }

          case "spotify": {
            const data = await fetchSpotifyData(conn.accessToken);
            summaryLines.push(
              `🎵 **Spotify:** ${data.stats.totalRecentTracks} songs recently played`
            );
            activePlatforms.push("Spotify");
            break;
          }
        }
      } catch (err) {
        errors.push(`${conn.platform}: ${err.message}`);
      }
    }

    // ✅ Build final embed for Discord
    const embed = {
      color: 0x5865f2,
      title: "📊 AICOO Combined Report",
      description:
        summaryLines.length > 0
          ? summaryLines.join("\n")
          : "⚠️ No active connections found. Connect GitHub, LeetCode, etc. to see data!",
      footer: {
        text:
          activePlatforms.length > 0
            ? `Connected: ${activePlatforms.join(", ")}`
            : "No active integrations",
      },
      timestamp: new Date().toISOString(),
    };

    return { embed, activePlatforms, errors };
  } catch (err) {
    console.error("❌ buildDiscordSummary Error:", err.message);
    throw new Error("Failed to build Discord summary");
  }
};
