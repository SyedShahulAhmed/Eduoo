import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";

export const buildTodayReport = async (userId) => {
  try {
    const [gitHub, leetCode, duolingo, spotify] = await Promise.allSettled([
      fetchGitHubData({ user: { id: userId } }),
      fetchLeetCodeData({ user: { id: userId } }),
      fetchDuolingoProfile({ user: { id: userId } }),
      fetchSpotifyData({ user: { id: userId } }),
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
