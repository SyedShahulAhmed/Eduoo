import cron from "node-cron";
import User from "../models/User.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import Connection from "../models/Connection.js";

cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Running Duolingo sync cron job...");
  try {
    const connections = await Connection.find({ platform: "duolingo", connected: true });
    for (const conn of connections) {
      const data = await fetchDuolingoProfile(conn.username);
      console.log(`✅ Synced Duolingo: ${conn.username} | XP: ${data.totalXp}`);
      await Connection.findByIdAndUpdate(conn._id, { lastSync: new Date() });
    }
    console.log("✅ Duolingo sync completed.");
  } catch (err) {
    console.error("❌ Duolingo Sync Error:", err.message);
  }
});
