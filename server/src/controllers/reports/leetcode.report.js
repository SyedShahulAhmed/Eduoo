import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";
import { ENV } from "../../config/env.js";
import fetch from "node-fetch";
import { fetchLeetCodeData } from "../../services/leetcode.service.js";
import { createGoalsFromAI } from "./createGoalsFromAI.js";

/** GET /api/reports/leetcode */
export const getLeetCodeReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "leetcode",
    });

    if (!conn || !conn.profileId) {
      return res.status(400).json({ message: "LeetCode not connected" });
    }

    const data = await fetchLeetCodeData(conn.profileId);

    res.status(200).json({
      message: "LeetCode report fetched successfully",
      report: data,
    });
  } catch (error) {
    console.error("❌ getLeetCodeReport Error:", error);
    res.status(500).json({ message: "Failed to fetch report", error: error.message });
  }
};

/** GET /api/reports/leetcode/insights */
export const getLeetCodeAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "leetcode",
    });

    if (!conn || !conn.profileId)
      return res.status(400).json({ message: "LeetCode not connected" });

    const data = await fetchLeetCodeData(conn.profileId);

    const prompt = `
You are AICOO, an AI productivity mentor analyzing LeetCode progress.
User: ${data.username}
Total Solved: ${data.totalSolved}
Ranking: ${data.ranking}
Acceptance Rate: ${data.acceptanceRate}%
Breakdown: Easy ${data.easySolved}, Medium ${data.mediumSolved}, Hard ${data.hardSolved}.

Give a JSON:
{
  "insights": ["3 insights about problem-solving skills"],
  "recommendations": ["3 actionable learning goals"],
  "motivation": "one motivational line"
}
    `;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const aiData = await aiRes.json();
    let textOutput =
      aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, "").trim() ||
      "{}";

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: ["You’re improving steadily!", "Medium problems are your strength."],
        recommendations: [
          "Try at least one hard problem per week.",
          "Focus on time complexity improvements.",
          "Maintain your daily streak.",
        ],
        motivation: "Keep pushing — every problem solved sharpens your skills 💪",
      };
    }

    res.status(200).json({
      message: "LeetCode AI Insights generated",
      data: parsed,
    });
  } catch (error) {
    console.error("❌ getLeetCodeAIInsights Error:", error);
    res.status(500).json({ message: "Failed to generate insights", error: error.message });
  }
};

/** POST /api/reports/leetcode/goals */
export const createGoalsFromLeetCodeInsights = async (req, res) => {
  try {
    const insightsRes = await fetch(`${ENV.SERVER_URL}/api/reports/leetcode/insights`, {
      headers: { Authorization: req.headers.authorization },
    });

    const insightsData = await insightsRes.json();
    const recommendations = insightsData?.data?.recommendations || [];

    if (!recommendations.length) {
      return res.status(400).json({ message: "No AI recommendations found" });
    }

    const createdGoals = await createGoalsFromAI(req, recommendations);

    res.status(201).json({
      message: "AI-based LeetCode goals created successfully",
      goals: createdGoals,
    });
  } catch (error) {
    console.error("❌ createGoalsFromLeetCodeInsights Error:", error);
    res.status(500).json({ message: "Failed to create goals", error: error.message });
  }
};
