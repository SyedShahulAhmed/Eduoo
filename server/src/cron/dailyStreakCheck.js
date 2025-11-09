import cron from "node-cron";
import User from "../models/User.js";

cron.schedule("0 0 * * *", async () => {
  console.log("🌙 Running Daily Streak Check ...");
  const users = await User.find();

  for (const user of users) {
    const lastUpdated = user.streaks?.lastUpdated
      ? new Date(user.streaks.lastUpdated).toDateString()
      : null;
    const today = new Date().toDateString();

    if (lastUpdated !== today) {
      if (user.streaks.currentStreak > 0) {
        console.log(`⚠️ Resetting streak for ${user.email}`);
        user.streaks.currentStreak = 0;
        await user.save();
      }
    }
  }
});
