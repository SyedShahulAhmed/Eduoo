// src/controllers/reports/youtube.report.js
import fetch from "node-fetch";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchYouTubeChannel, fetchYouTubeRecentVideos } from "../../services/youtube.service.js";
import Goal from "../../models/Goal.js";

/**
 * GET /api/reports/youtube
 */
export const getYouTubeReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "youtube" });
    if (!conn?.accessToken) return res.status(400).json({ message: "YouTube not connected" });

    const channel = await fetchYouTubeChannel(req.user.id);
    const recent = await fetchYouTubeRecentVideos(req.user.id);

    res.status(200).json({
      message: "YouTube report generated successfully",
      report: { channel, recentVideos: recent },
    });
  } catch (err) {
    console.error("❌ getYouTubeReport Error:", err);
    res.status(500).json({ message: "Failed to get YouTube report", error: err.message });
  }
};

/**
 * GET /api/reports/youtube/insights
 * Uses Gemini to generate JSON insights (fallback if not configured)
 */
export const getYouTubeAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "youtube" });
    if (!conn?.accessToken) return res.status(400).json({ message: "YouTube not connected" });

    const channel = await fetchYouTubeChannel(req.user.id);
    const recent = await fetchYouTubeRecentVideos(req.user.id);

    const prompt = `
You are AICOO, a friendly study coach analyzing the user's YouTube learning activity.

Channel: ${channel?.snippet?.title || "unknown"}
Subscribers: ${channel?.statistics?.subscriberCount || "unknown"}
Recent Videos (titles): ${recent.map(r => r.title).slice(0,5).join(" | ")}

Return JSON:
{ "insights": ["3 short insights on learning/watch habits"], "recommendations": ["3 short actionable suggestions"], "motivation": "short motivational sentence" }
    `;

    let geminiData = null;
    if (ENV.GEMINI_API_KEY) {
      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      geminiData = await gemRes.json();
    }

    let textOutput = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    if (!textOutput) {
      textOutput = JSON.stringify({
        insights: [
          "You favor short tutorial videos — great for quick learnings.",
          "Watch times cluster in the evening — use morning sessions for deep study.",
          "Top videos favor practical demos, indicating hands-on learning preference.",
        ],
        recommendations: [
          "Batch similar topic videos into focused study sessions.",
          "Prefer longer deep-dive videos for conceptual topics and short clips for practice.",
          "Take quick notes and timestamp important parts for later review.",
        ],
        motivation: "Learning compounds — watch with intention and apply quickly!",
      });
    } else {
      textOutput = textOutput.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = JSON.parse(textOutput || "{}");
    }

    res.status(200).json({
      message: "YouTube AI Insights generated",
      data: { channel, recentSample: recent.slice(0, 10), ...parsed },
    });
  } catch (err) {
    console.error("❌ getYouTubeAIInsights Error:", err);
    res.status(500).json({ message: "Failed to generate YouTube insights", error: err.message });
  }
};

/**
 * POST /api/reports/youtube/goals
 * Create up to 3 AICOO goals from AI recommendations
 */
export const createGoalsFromYouTubeInsights = async (req, res) => {
  try {
    const insightsRes = await fetch(`${ENV.SERVER_URL}/api/reports/youtube/insights`, {
      headers: { Authorization: req.headers.authorization },
    });
    const insightsData = await insightsRes.json();
    const recommendations = insightsData?.data?.recommendations || [];
    if (!recommendations.length) return res.status(400).json({ message: "No recommendations found" });

    const created = [];
    for (const rec of recommendations.slice(0, 3)) {
      const g = await Goal.create({
        userId: req.user.id,
        title: rec,
        type: "weekly",
        progress: 0,
        target: 1,
        status: "active",
        createdAt: new Date(),
      });
      created.push(g);
    }

    res.status(201).json({ message: "AI-based YouTube goals created", goals: created });
  } catch (err) {
    console.error("❌ createGoalsFromYouTubeInsights Error:", err);
    res.status(500).json({ message: "Failed to create goals", error: err.message });
  }
};
