import Connection from "../../models/Connection.js";
import { fetchCodeforcesData } from "../../services/codeforces.service.js";
import fetch from "node-fetch";
import { ENV } from "../../config/env.js";
import Goal from "../../models/Goal.js";

export const getCodeforcesReport = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codeforces",
    });
    if (!connection?.connected || !connection.accessToken)
      return res.status(400).json({ message: "Codeforces not connected" });

    const handle = connection.accessToken;
    const data = await fetchCodeforcesData(handle);

    res.status(200).json({
      message: "Codeforces report generated successfully",
      report: data,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch Codeforces report", error: err.message });
  }
};

export const getCodeforcesAIInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codeforces",
    });
    if (!connection?.connected || !connection.accessToken)
      return res.status(400).json({ message: "Codeforces not connected" });

    const handle = connection.accessToken;
    const data = await fetchCodeforcesData(handle);

    const prompt = `
Analyze Codeforces performance for ${data.username}:
Rating: ${data.rating}, Rank: ${data.rank}, Contests: ${data.totalContests}

Respond in JSON:
{
  "insights": ["3 performance insights"],
  "recommendations": ["3 improvement tips"],
  "motivation": "One motivational line"
}`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const aiData = await aiRes.json();
    let textOutput = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    textOutput = textOutput.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: [
          "Your performance is steadily improving.",
          "You show strong consistency in recent contests.",
          "You’re mastering mid-tier problem sets."
        ],
        recommendations: [
          "Upsolve 3 unsolved problems weekly.",
          "Review editorials after each contest.",
          "Increase participation frequency for faster growth."
        ],
        motivation: "Every contest is a new opportunity to climb higher 🚀"
      };
    }

    res.status(200).json({ message: "Codeforces AI Insights generated", data: parsed });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate insights", error: err.message });
  }
};
export const createGoalsFromCodeforcesInsights = async (req, res) => {
  try {
    // 🧩 1️⃣ Get stored username (handle) from the user’s connection
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codeforces",
    });

    if (!connection?.connected || !connection.accessToken) {
      return res.status(400).json({ message: "Codeforces not connected" });
    }

    const handle = connection.accessToken;

    // 🧠 2️⃣ Fetch insights again (from our own endpoint)
    const insightsRes = await fetch(
      `${ENV.SERVER_URL}/api/reports/codeforces/insights`,
      {
        headers: { Authorization: req.headers.authorization },
      }
    );

    const insightsData = await insightsRes.json();

    // ✅ Ensure we have AI recommendations
    if (!insightsData?.data?.recommendations?.length) {
      return res
        .status(400)
        .json({ message: "No AI recommendations found to convert into goals" });
    }

    const recommendations = insightsData.data.recommendations;
    const createdGoals = [];

    // 🧱 3️⃣ Convert recommendations into Goal entries
    for (const rec of recommendations.slice(0, 3)) {
      const goal = await Goal.create({
        userId: req.user.id,
        title: rec,
        type: "weekly",
        progress: 0,
        target: 1,
        status: "active",
        createdAt: new Date(),
      });
      createdGoals.push(goal);
    }

    // 🎯 4️⃣ Return newly created goals
    res.status(201).json({
      message: "AI-based Codeforces goals created successfully",
      goals: createdGoals,
    });
  } catch (error) {
    console.error("❌ createGoalsFromCodeforcesInsights Error:", error);
    res.status(500).json({
      message: "Failed to create AI-based Codeforces goals",
      error: error.message,
    });
  }
};
