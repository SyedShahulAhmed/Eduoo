import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";

export const buildStreakSummary = async (userId) => {
  try {
    const duolingo = await fetchDuolingoProfile(userId);
    const leetcode = await fetchLeetCodeData(userId);
    const github = await fetchGitHubData(userId);

    const desc = `
🗣️ **Duolingo:** ${duolingo.report.streak}-day streak ✅
💻 **GitHub:** ${github.report.commitStreak.current}-day streak ${github.report.commitStreak.current > 0 ? "✅" : "❌"}
🧠 **LeetCode:** ${leetcode.report.streak}-day streak ${leetcode.report.streak > 0 ? "✅" : "❌"}
`;

    const embed = {
      color: 0x57f287,
      title: "🔥 Your Streak Tracker",
      description: desc,
      footer: { text: "Keep the fire alive! • AICOO" },
      timestamp: new Date().toISOString(),
    };

    return { embed };
  } catch (err) {
    console.error("❌ buildStreakSummary Error:", err.message);
    throw err;
  }
};
