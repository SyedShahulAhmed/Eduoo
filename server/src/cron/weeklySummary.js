import cron from "node-cron";
import fetch from "node-fetch";
import User from "../models/User.js";
import Goal from "../models/Goal.js";
import { sendWeeklySummaryEmail } from "../services/mail.service.js";
import { ENV } from "../config/env.js";

// Run every Sunday at 9 AM
cron.schedule("0 9 * * SUN", async () => {
  console.log("📧 Running AICOO Weekly Summary Cron...");

  
  const users = await User.find({ isEmailVerified: true });
  for (const user of users) {
    try {
      const goals = await Goal.find({ userId: user._id });
      const completedGoals = goals.filter(g => g.status === "completed").length;
      const activeGoals = goals.filter(g => g.status === "active").length;

      // Construct prompt for Gemini 2.5 Flash
      const prompt = `
        The user is ${user.fullName}.
        Completed Goals: ${completedGoals}, Active Goals: ${activeGoals}
        Achievements: ${user.achievements?.join(", ") || "None"}
        Suggest 3 personalized goals for next week and one motivational line.
        Return JSON:
        {
          "suggestions": ["Goal1","Goal2","Goal3"],
          "motivation": "Quote"
        }
      `;

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await aiResponse.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {
          suggestions: ["Keep learning daily", "Improve code review habits", "Read one tech article"],
          motivation: "Stay curious, keep coding 🚀",
        };
      }

      await sendWeeklySummaryEmail(user.email, {
        fullName: user.fullName,
        completedGoals,
        activeGoals,
        suggestions: parsed.suggestions,
        motivation: parsed.motivation,
        streak: user.streaks?.currentStreak || 0,
      });
    } catch (err) {
      console.error(`❌ Weekly summary error for ${user.email}:`, err.message);
    }
  }
});
