import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";

export const buildStreakSummary = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

    const hasGithub = !!connMap.github;
    const hasLeetCode = !!connMap.leetcode;

    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;

    const [gitRes, lcRes] = await Promise.allSettled([
      hasGithub ? fetchGitHubData(githubToken) : null,
      hasLeetCode ? fetchLeetCodeData(leetcodeUser) : null,
    ]);

    const github = gitRes.status === "fulfilled" ? gitRes.value : null;
    const leetcode = lcRes.status === "fulfilled" ? lcRes.value : null;

    const today = new Date().toISOString().split("T")[0];

    let desc = "🔥 **Today’s Coding Streak Status**\n\n";

    if (hasGithub) {
      const gitStreak = github?.commitStreak?.current ?? 0;
      const githubToday = github?.recentActivity?.includes(today)
        ? "💚 Completed"
        : "❌ Not completed";

      desc += `💻 **GitHub**
• Streak: **${gitStreak} days**
• Today: ${githubToday}\n\n`;
    }

    if (hasLeetCode) {
      const lcStreak = leetcode?.streak ?? 0;

      let lcToday = "❌ Not completed";
      try {
        if (leetcode?.submissionCalendar) {
          const cal = JSON.parse(leetcode.submissionCalendar);
          const ts = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
          if (cal[ts] > 0) lcToday = "💚 Completed";
        }
      } catch {}

      desc += `🧠 **LeetCode**
• Streak: **${lcStreak} days**
• Today: ${lcToday}\n\n`;
    }

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
