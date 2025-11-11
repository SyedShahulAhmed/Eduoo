import mongoose from "mongoose";
import app from "./app.js";
import { ENV } from "./config/env.js";
import { startDailyDiscordSummary } from "./cron/dailyDiscordSummary.cron.js";

mongoose.connect(ENV.MONGO_URI).then(() => {
  startDailyDiscordSummary();
});
mongoose
  .connect(ENV.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

app.listen(ENV.PORT, () => {
  console.log(`🚀 Server running on port http://localhost:${ENV.PORT} [${ENV.NODE_ENV}]`);
});
