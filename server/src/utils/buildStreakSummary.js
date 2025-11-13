import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";

export const buildStreakSummary = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;

    const [gitRes, lcRes] = await Promise.allSettled([
      githubToken ? fetchGitHubData(githubToken) : null,
      leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
    ]);

    const github = gitRes.status === "fulfilled" ? gitRes.value : null;
    const leetcode = lcRes.status === "fulfilled" ? lcRes.value : null;

    const today = new Date().toISOString().split("T")[0];

    // --- GitHub ---
    const gitData = github?.report;
    const gitStreak = gitData?.commitStreak?.current ?? 0;
    const githubToday = gitData?.recentActivity?.includes(today)
      ? "💚 Completed"
      : "❌ Not completed";

    // --- LeetCode ---
    const lcData = leetcode?.report;
    const lcStreak = lcData?.streak ?? 0;

    let lcToday = "❌ Not completed";
    if (lcData?.submissionCalendar) {
      const cal = JSON.parse(lcData.submissionCalendar);
      const todayTs = Math.floor(new Date(today).getTime() / 1000);
      if (cal[todayTs] > 0) lcToday = "💚 Completed";
    }

    const desc = `
💻 **GitHub**
• Streak: **${gitStreak} days**
• Today: ${githubToday}

🧠 **LeetCode**
• Streak: **${lcStreak} days**
• Today: ${lcToday}
`;

    return {
      embed: {
        color: 0x57f287,
        title: "🔥 Today's Coding Streak Status",
        description: desc.trim(),
        footer: { text: `Updated • ${new Date().toLocaleTimeString()}` },
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error("❌ buildStreakSummary Error:", err);
    throw new Error("Failed to build streak summary");
  }
};
