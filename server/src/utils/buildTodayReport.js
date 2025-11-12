import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";

export const buildTodayReport = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map(c => [c.platform, c]));

    // Pull credentials/usernames from DB
    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;
    const duolingoUser = connMap.duolingo?.metadata?.profileId;
    const spotifyToken = connMap.spotify?.accessToken;

    const [gitHub, leetCode, duolingo, spotify] = await Promise.allSettled([
      githubToken ? fetchGitHubData(githubToken) : null,
      leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
      duolingoUser ? fetchDuolingoProfile(duolingoUser) : null,
      spotifyToken ? fetchSpotifyData(spotifyToken) : null,
    ]);

    const today = new Date().toISOString().split("T")[0];

    const commitsToday =
      gitHub.value?.recentActivity?.includes(today) ? 1 : 0;

    const lcSolvedToday = leetCode.value
      ? Object.entries(
          JSON.parse(leetCode.value.submissionCalendar || "{}")
        ).filter(([ts]) => {
          const date = new Date(ts * 1000).toISOString().split("T")[0];
          return date === today;
        }).length
      : 0;

    const xpToday = duolingo.value?.streak ? "✅ Continued" : "❌ Missed";
    const spotifyTracks =
      spotify.value?.stats?.totalRecentTracks ?? 0;

    const desc = `
📅 **Today's Activity**
💻 GitHub — ${commitsToday} commit${commitsToday !== 1 ? "s" : ""}
🧠 LeetCode — ${lcSolvedToday} problem${lcSolvedToday !== 1 ? "s" : ""}
🗣️ Duolingo — ${xpToday} streak
🎵 Spotify — ${spotifyTracks} track${spotifyTracks !== 1 ? "s" : ""} played
`;

    const embed = {
      color: 0xfee75c,
      title: "📅 Today's Productivity Snapshot",
      description: desc,
      footer: { text: "AI-Generated Summary • AICOO" },
      timestamp: new Date().toISOString(),
    };

    return { embed };
  } catch (err) {
    console.error("❌ buildTodayReport Error:", err.message);
    throw err;
  }
};
