
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";
import { fetchGitHubData } from "../services/github.service.js";

/**
 * Sync GitHub activity → update AICOO goals
 */
export const syncGitHubGoals = async (userId) => {
  try {
    const conn = await Connection.findOne({
      userId,
      platform: "github",
      connected: true,
    });
    if (!conn) return console.log("⚠️ No GitHub connection for user:", userId);

    const data = await fetchGitHubData(conn.accessToken);
    const commitCount = data.recentCommits || 0;

    // Update active GitHub-related goals
    const goals = await Goal.find({
      userId,
      status: "active",
      title: { $regex: /commit|github/i },
    });

    for (const g of goals) {
      const newProgress = Math.min(g.target, commitCount);
      g.progress = newProgress;
      if (g.progress >= g.target) g.status = "completed";
      await g.save();
    }

    console.log(`✅ Synced GitHub goals for user ${userId}: ${goals.length} updated`);
  } catch (err) {
    console.error("❌ syncGitHubGoals Error:", err.message);
  }
};
