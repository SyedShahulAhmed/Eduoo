import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";

export const buildStreakSummary = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;

    // Fetch latest data in parallel
    const [gitRes, lcRes] = await Promise.allSettled([
      githubToken ? fetchGitHubData(githubToken) : null,
      leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
    ]);

    const github = gitRes.status === "fulfilled" ? gitRes.value.report : null;
    const leetcode = lcRes.status === "fulfilled" ? lcRes.value.report : null;

    const today = new Date().toISOString().slice(0, 10);

    // ---------------------------------------------
    // GITHUB: check if today's commit exists
    // ---------------------------------------------
    let githubTodayDone = false;
    if (github?.recentActivity?.length) {
      githubTodayDone = github.recentActivity.includes(today);
    }

    // ---------------------------------------------
    // LEETCODE: check if today's submission exists
    // ---------------------------------------------
    let leetcodeTodayDone = false;
    if (leetcode?.submissionCalendar) {
      try {
        const calendar = JSON.parse(leetcode.submissionCalendar);
        const todayUnix = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
        leetcodeTodayDone = calendar[todayUnix] > 0;
      } catch {
        leetcodeTodayDone = false;
      }
    }

    // ----------------------------
    // PRETTY DISCORD DESCRIPTION
    // ----------------------------
    const lines = [];

    if (githubToken) {
      lines.push(
        `💻 **GitHub**  
• Streak: **${github?.commitStreak?.current || 0} days**  
• Today: ${githubTodayDone ? "💚 Completed" : "❌ Not completed"}`
      );
    }

    if (leetcodeUser) {
      lines.push(
        `🧠 **LeetCode**  
• Streak: **${leetcode?.streak || 0} days**  
• Today: ${leetcodeTodayDone ? "💚 Completed" : "❌ Not completed"}`
      );
    }

    const description = lines.length
      ? lines.join("\n\n")
      : "⚠️ No GitHub or LeetCode connections found.";

    const embed = {
      color: 0x00ff9d,
      title: "🔥 Today's Coding Streak Status",
      description,
      footer: { text: `Updated • ${new Date().toLocaleTimeString()}` },
      timestamp: new Date().toISOString(),
    };

    return { embed };
  } catch (err) {
    console.error("❌ buildStreakSummary Error:", err.message);
    throw new Error("Failed to build streak summary");
  }
};
