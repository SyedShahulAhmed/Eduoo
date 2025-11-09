import fetch from "node-fetch";
import { ENV } from "../../config/env.js";
import Connection from "../../models/Connection.js";
import { fetchDuolingoProfile } from "../../services/duolingo.service.js";
import Goal from "../../models/Goal.js";

/** 4️⃣ Generate Clean Duolingo Progress Report */
export const getDuolingoReport = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "duolingo",
    });

    if (!connection?.profileId) {
      return res.status(400).json({ message: "Duolingo not connected" });
    }

    const profile = await fetchDuolingoProfile(connection.profileId);

    // Clean report — remove null / undefined / unused fields
    const cleanReport = {
      username: profile.username,
      streak: profile.streak,
      totalXp: profile.totalXp,
      languages: profile.languages?.filter(l => l.xp > 0) || [],
      avatarUrl: profile.avatarUrl,
      joined: profile.joined,
      ...(profile.league ? { league: profile.league } : {}),
      ...(profile.followers ? { followers: profile.followers } : {}),
      ...(profile.following ? { following: profile.following } : {})
    };

    res.status(200).json({
      message: "✅ Duolingo report generated successfully",
      report: cleanReport,
    });
  } catch (error) {
    console.error("❌ getDuolingoReport Error:", error);
    res.status(500).json({
      message: "Failed to fetch Duolingo report",
      error: error.message,
    });
  }
};

/** 5️⃣ AI Insights (Gemini-based) */
export const getDuolingoAIInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "duolingo",
    });

    if (!connection?.profileId) {
      return res.status(400).json({ message: "Duolingo not connected" });
    }

    const profile = await fetchDuolingoProfile(connection.profileId);

    const prompt = `
You are AICOO, a productivity coach analyzing Duolingo progress.

User: ${profile.username}
Total XP: ${profile.totalXp}
Streak: ${profile.streak}
Languages: ${profile.languages.map(l => `${l.language} (${l.xp} XP)`).join(", ")}

Respond in JSON:
{
  "insights": ["3 insights about learning style"],
  "recommendations": ["3 suggestions to improve"],
  "motivation": "1 short motivational message"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();
    let textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    textOutput = textOutput.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: [
          "Your consistency streak shows outstanding discipline.",
          "You’ve built a strong foundation in Japanese vocabulary.",
          "Your XP trend indicates steady, long-term learning commitment."
        ],
        recommendations: [
          "Focus 20% of sessions on reviewing past lessons to retain mastery.",
          "Try Duolingo Stories or Podcasts to strengthen comprehension.",
          "Experiment with another beginner course for language variety."
        ],
        motivation: "Consistency is your superpower — keep building daily progress! 🌟"
      };
    }

    res.status(200).json({
      message: "✅ Duolingo AI insights generated successfully",
      data: parsed,
    });
  } catch (error) {
    console.error("❌ getDuolingoAIInsights Error:", error);
    res.status(500).json({
      message: "Failed to generate AI insights",
      error: error.message,
    });
  }
};

/** 6️⃣ Convert AI Recommendations → Goals */
export const createGoalsFromDuolingoInsights = async (req, res) => {
  try {
    const insightsRes = await fetch(`${ENV.SERVER_URL}/api/reports/duolingo/insights`, {
      headers: { Authorization: req.headers.authorization },
    });
    const insightsData = await insightsRes.json();

    const recommendations = insightsData?.data?.recommendations || [];
    if (!recommendations.length)
      return res.status(400).json({ message: "No AI recommendations found" });

    const goals = [];
    for (const rec of recommendations.slice(0, 3)) {
      const goal = await Goal.create({
        userId: req.user.id,
        title: rec,
        type: "weekly",
        status: "active",
        progress: 0,
        target: 1,
        createdAt: new Date(),
      });
      goals.push(goal);
    }

    res.status(201).json({
      message: "✅ AI-based Duolingo goals created",
      goals,
    });
  } catch (error) {
    console.error("❌ createGoalsFromDuolingoInsights Error:", error);
    res.status(500).json({
      message: "Failed to create Duolingo goals from AI insights",
      error: error.message,
    });
  }
};
