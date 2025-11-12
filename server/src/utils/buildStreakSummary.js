import Connection from "../models/Connection.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";

export const buildStreakSummary = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

    const duolingoUser = connMap.duolingo?.metadata?.profileId;
    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;

    // Parallel fetch
    const [duoRes, gitRes, lcRes] = await Promise.allSettled([
      duolingoUser ? fetchDuolingoProfile(duolingoUser) : null,
      githubToken ? fetchGitHubData(githubToken) : null,
      leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
    ]);

    const duolingo = duoRes.status === "fulfilled" ? duoRes.value : null;
    const github = gitRes.status === "fulfilled" ? gitRes.value : null;
    const leetcode = lcRes.status === "fulfilled" ? lcRes.value : null;

    // Adapted to new JSON shapes
    const duolingoData = duolingo?.report;
    const duoStreak = duolingoData?.streak ?? 0;
    const gitStreak =
      github?.commitStreak?.current ?? github?.recentCommits ?? 0;
    const lcStreak = leetcode?.streak ?? 0;

    const desc = `
${duolingoUser ? `🗣️ **Duolingo:** ${duoStreak}-day streak ${duoStreak > 0 ? "✅" : "❌"}` : ""}
${githubToken ? `💻 **GitHub:** ${gitStreak}-day commit streak ${gitStreak > 0 ? "✅" : "❌"}` : ""}
${leetcodeUser ? `🧠 **LeetCode:** ${lcStreak}-day coding streak ${lcStreak > 0 ? "✅" : "❌"}` : ""}
`;

    const embed = {
      color: 0x57f287,
      title: "🔥 Your Streak Tracker",
      description: desc.trim() || "⚠️ No connected platforms with streak data.",
      footer: { text: "Keep the fire alive! • AICOO" },
      timestamp: new Date().toISOString(),
    };

    return { embed };
  } catch (err) {
    console.error("❌ buildStreakSummary Error:", err.message);
    throw new Error("Failed to build streak summary");
  }
};
