import cron from "node-cron";
import fetch from "node-fetch";
import { ENV } from "../config/env.js";

// Run every day at 8 AM 🕗
cron.schedule("0 8 * * *", async () => {
  console.log("🕗 Sending daily Discord summaries...");
  await fetch(`${ENV.SERVER_URL}/api/reports/discord/daily`, {
    method: "POST",
    headers: { Authorization: `Bearer SYSTEM_CRON_TOKEN` },
  });
});
