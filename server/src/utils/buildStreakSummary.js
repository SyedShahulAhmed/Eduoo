export const buildStreakSummary = async (userId) => {
  try {
    const duolingo = await fetchDuolingoReport(userId);
    const leetcode = await fetchLeetCodeReport(userId);
    const github = await fetchGitHubReport(userId);

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
