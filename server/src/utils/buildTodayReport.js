import { getGitHubReport } from "../controllers/reports/github.report.js";
import { getLeetCodeReport } from "../controllers/reports/leetcode.report.js";
import { getDuolingoReport } from "../controllers/reports/duolingo.report.js";
import { getSpotifyReport } from "../controllers/reports/spotify.report.js";

export const buildTodayReport = async (userId) => {
  try {
    const [gitHub, leetCode, duolingo, spotify] = await Promise.allSettled([
      getGitHubReport({ user: { id: userId } }),
      getLeetCodeReport({ user: { id: userId } }),
      getDuolingoReport({ user: { id: userId } }),
      getSpotifyReport({ user: { id: userId } }),
    ]);

    const today = new Date().toISOString().split("T")[0];

    const commitsToday =
      gitHub.value?.report?.recentActivity?.includes(today) ? 1 : 0;
    const lcSolvedToday = Object.entries(
      JSON.parse(leetCode.value?.report?.submissionCalendar || "{}")
    ).filter(([ts]) => {
      const date = new Date(ts * 1000).toISOString().split("T")[0];
      return date === today;
    }).length;

    const xpToday = duolingo.value?.report?.streak ? "✅ Continued" : "❌ Missed";
    const spotifyTracks = spotify.value?.data?.stats?.totalRecentTracks || 0;

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
