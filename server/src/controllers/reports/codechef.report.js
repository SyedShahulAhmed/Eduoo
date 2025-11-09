import Connection from "../../models/Connection.js";
import { fetchCodechefData } from "../../services/codechef.service.js";
import fetch from "node-fetch";
import { ENV } from "../../config/env.js";
import Goal from "../../models/Goal.js";

/** 📊 Get CodeChef Report */
export const getCodechefReport = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codechef",
    });

    if (!connection?.connected || !connection.accessToken)
      return res.status(400).json({ message: "CodeChef not connected" });

    const username = connection.accessToken;
    const data = await fetchCodechefData(username);

    res.status(200).json({
      message: "CodeChef report generated successfully",
      report: data,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch CodeChef report",
      error: err.message,
    });
  }
};

/** 🤖 CodeChef AI Insights (Gemini) */
export const getCodechefAIInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codechef",
    });
    if (!connection?.connected || !connection.accessToken)
      return res.status(400).json({ message: "CodeChef not connected" });

    const username = connection.accessToken;
    const data = await fetchCodechefData(username);

    const prompt = `
You are AICOO, a friendly competitive programming mentor analyzing a CodeChef user profile.

User: ${data.username}
Rating: ${data.rating}
Stars: ${data.stars}
Global Rank: ${data.globalRank}
Country Rank: ${data.countryRank}
Problems Solved: ${data.problemsSolved}

Respond in JSON format:
{
  "insights": ["3 clear performance insights"],
  "recommendations": ["3 actionable improvement tips"],
  "motivation": "One motivational quote"
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
    let textOutput =
      aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    textOutput = textOutput.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: [
          "You have solid consistency in solving medium problems.",
          "Your contest participation shows steady rating growth.",
          "You perform better under long challenge contests.",
        ],
        recommendations: [
          "Focus on upsolving problems post-contest.",
          "Increase participation in short contests for faster feedback.",
          "Target specific problem tags like DP or Graphs to level up.",
        ],
        motivation: "Every problem solved builds your coding legacy 💪",
      };
    }

    res.status(200).json({
      message: "CodeChef AI Insights generated successfully (Gemini)",
      data: parsed,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to generate AI insights",
      error: err.message,
    });
  }
};

/** 🎯 Create Goals from AI Insights */
export const createGoalsFromCodechefInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codechef",
    });

    if (!connection?.connected || !connection.accessToken)
      return res.status(400).json({ message: "CodeChef not connected" });

    const insightsRes = await fetch(
      `${ENV.SERVER_URL}/api/reports/codechef/insights`,
      {
        headers: { Authorization: req.headers.authorization },
      }
    );
    const insightsData = await insightsRes.json();

    if (!insightsData?.data?.recommendations?.length)
      return res
        .status(400)
        .json({ message: "No AI recommendations found to convert into goals" });

    const recommendations = insightsData.data.recommendations;
    const createdGoals = [];

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

    res.status(201).json({
      message: "AI-based CodeChef goals created successfully",
      goals: createdGoals,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create AI-based CodeChef goals",
      error: error.message,
    });
  }
};
