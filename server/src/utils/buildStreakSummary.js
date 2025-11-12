import Connection from "../models/Connection.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";

export const buildStreakSummary = async (userId) => {
  try {
    // 🧠 1️⃣ Load all user connections
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map(c => [c.platform, c]));

    // 🎯 2️⃣ Extract usernames / tokens from DB
    const duolingoUser = connMap.duolingo?.metadata?.profileId;
    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;

    // 3️⃣ Parallel API calls (skip missing platforms)
    const [duolingo, github, leetcode] = await Promise.allSettled([
      duolingoUser ? fetchDuolingoProfile(duolingoUser) : null,
      githubToken ? fetchGitHubData(githubToken) : null,
      leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
    ]);

    // 4️⃣ Extract streak values safely
    const duoStreak = duolingo.value?.streak || 0;
    const gitStreak = github.value?.commitStreak?.current || 0;
    const lcStreak = leetcode.value?.streak || 0;

    // 5️⃣ Format rich output
    const desc = `
🗣️ **Duolingo:** ${duoStreak}-day streak ${duoStreak > 0 ? "✅" : "❌"}
💻 **GitHub:** ${gitStreak}-day commit streak ${gitStreak > 0 ? "✅" : "❌"}
🧠 **LeetCode:** ${lcStreak}-day coding streak ${lcStreak > 0 ? "✅" : "❌"}
`;

    const embed = {
      color: 0x57f287,
      title: "🔥 Your Streak Tracker",
      description: desc.trim(),
      footer: { text: "Keep the fire alive! • AICOO" },
      timestamp: new Date().toISOString(),
    };

    return { embed };
  } catch (err) {
    console.error("❌ buildStreakSummary Error:", err.message);
    throw new Error("Failed to build streak summary");
  }
};
