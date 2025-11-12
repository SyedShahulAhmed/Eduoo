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

    // 🚀 Run all fetches in parallel — safely
    const [duolingoRes, githubRes, leetcodeRes] = await Promise.allSettled([
      duolingoUser ? fetchDuolingoProfile(duolingoUser) : null,
      githubToken ? fetchGitHubData(githubToken) : null,
      leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
    ]);

    // 🔒 Extract data safely
    const duolingoData =
      duolingoRes.status === "fulfilled" ? duolingoRes.value : null;
    const githubData =
      githubRes.status === "fulfilled" ? githubRes.value : null;
    const leetcodeData =
      leetcodeRes.status === "fulfilled" ? leetcodeRes.value : null;

    // 🧮 Fallbacks
    const duoStreak = duolingoData?.streak ?? 0;
    const gitStreak =
      githubData?.commitStreak?.current ?? githubData?.recentCommits ?? 0;
    const lcStreak = leetcodeData?.streak ?? 0;

    // 🧾 Build description dynamically
    const sections = [];
    if (duolingoUser)
      sections.push(
        `🗣️ **Duolingo:** ${duoStreak}-day streak ${
          duoStreak > 0 ? "✅" : "❌"
        }`
      );
    if (githubToken)
      sections.push(
        `💻 **GitHub:** ${gitStreak}-day commit streak ${
          gitStreak > 0 ? "✅" : "❌"
        }`
      );
    if (leetcodeUser)
      sections.push(
        `🧠 **LeetCode:** ${lcStreak}-day coding streak ${
          lcStreak > 0 ? "✅" : "❌"
        }`
      );

    const embed = {
      color: 0x57f287,
      title: "🔥 Your Streak Tracker",
      description:
        sections.length > 0
          ? sections.join("\n")
          : "⚠️ No connected platforms with streak data.",
      footer: { text: "Keep the fire alive! • AICOO" },
      timestamp: new Date().toISOString(),
    };

    return { embed };
  } catch (err) {
    console.error("❌ buildStreakSummary Error:", err.message);
    throw new Error("Failed to build streak summary");
  }
};
