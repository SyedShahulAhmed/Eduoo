// src/controllers/reports/coursera.report.js
import fetch from "node-fetch";
import Connection from "../../models/Connection.js";
import { fetchCourseraCourses } from "../../services/coursera.service.js";
import { ENV } from "../../config/env.js";
import Goal from "../../models/Goal.js";

/**
 * Coursera Report – enrolled courses and progress
 */
export const getCourseraReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "coursera" });
    if (!conn?.accessToken)
      return res.status(400).json({ message: "Coursera not connected" });

    const courses = await fetchCourseraCourses(conn.accessToken);
    res.status(200).json({
      message: "Coursera report generated successfully",
      totalCourses: courses.length,
      courses,
    });
  } catch (err) {
    console.error("❌ getCourseraReport Error:", err);
    res.status(500).json({ message: "Failed to fetch Coursera report", error: err.message });
  }
};

/**
 * Coursera AI Insights (Gemini)
 */
export const getCourseraAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "coursera" });
    if (!conn?.accessToken)
      return res.status(400).json({ message: "Coursera not connected" });

    const courses = await fetchCourseraCourses(conn.accessToken);
    const prompt = `
You are AICOO, an AI mentor analyzing Coursera learning data.

Courses:
${courses.map((c) => `${c.title} - ${c.progress}% complete`).join("\n")}

Generate JSON:
{
  "insights": ["3 learning behavior insights"],
  "recommendations": ["3 short actionable steps"],
  "motivation": "short motivational sentence"
}`;

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const gemData = await gemRes.json();
    let text = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    text = text.replace(/```json|```/g, "").trim();

    const parsed =
      text && text.startsWith("{")
        ? JSON.parse(text)
        : {
            insights: [
              "You focus well on beginner-level courses but often pause midway.",
              "Progress peaks during weekends, indicating strong weekend motivation.",
              "You prefer hands-on, project-based courses over theory.",
            ],
            recommendations: [
              "Set micro-goals: one lecture per weekday.",
              "Finish existing courses before enrolling in new ones.",
              "Document your learnings in AICOO Notion workspace.",
            ],
            motivation: "Consistency beats intensity — keep your Coursera streak alive 🚀",
          };

    res.status(200).json({ message: "Coursera AI Insights generated", data: parsed });
  } catch (err) {
    console.error("❌ getCourseraAIInsights Error:", err);
    res.status(500).json({ message: "Failed to generate Coursera insights", error: err.message });
  }
};

/**
 * Convert AI insights → AICOO Goals
 */
export const createGoalsFromCourseraInsights = async (req, res) => {
  try {
    const insightsRes = await fetch(`${ENV.SERVER_URL}/api/reports/coursera/insights`, {
      headers: { Authorization: req.headers.authorization },
    });
    const insightsData = await insightsRes.json();
    const recommendations = insightsData?.data?.recommendations || [];

    if (!recommendations.length)
      return res.status(400).json({ message: "No AI recommendations found" });

    const goals = [];
    for (const rec of recommendations.slice(0, 3)) {
      const g = await Goal.create({
        userId: req.user.id,
        title: rec,
        type: "weekly",
        progress: 0,
        target: 1,
        status: "active",
      });
      goals.push(g);
    }

    res.status(201).json({
      message: "AI-based Coursera goals created successfully",
      goals,
    });
  } catch (err) {
    console.error("❌ createGoalsFromCourseraInsights Error:", err);
    res.status(500).json({ message: "Failed to create Coursera goals", error: err.message });
  }
};
