import cron from "node-cron";
import User from "../models/User.js";
import { syncGitHubGoals } from "../integrations/githubSync.service.js";

cron.schedule("0 */6 * * *", async () => {
  console.log("🔄 Running GitHub sync cron...");
  const users = await User.find({});
  for (const u of users) await syncGitHubGoals(u._id);
  console.log("✅ GitHub goal sync completed for all users.");
});
