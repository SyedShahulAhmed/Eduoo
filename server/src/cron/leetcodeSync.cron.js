import cron from "node-cron";
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";

export const startLeetCodeSync = () => {
  cron.schedule("0 */6 * * *", async () => {
    console.log("🔁 Syncing LeetCode goals...");

    const connections = await Connection.find({ platform: "leetcode", connected: true });
    for (const conn of connections) {
      const data = await fetchLeetCodeData(conn.profileId);
      const totalSolved = data.totalSolved || 0;

      const goals = await Goal.find({
        userId: conn.userId,
        status: "active",
        title: { $regex: /leetcode|problem/i },
      });

      for (const g of goals) {
        g.progress = Math.min(totalSolved, g.target);
        if (g.progress >= g.target) g.status = "completed";
        await g.save();
      }
    }

    console.log("✅ LeetCode goals synced successfully.");
  });
};
