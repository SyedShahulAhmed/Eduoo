import fetch from "node-fetch";
import { ENV } from "../../config/env.js";
import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";

/** 4️⃣ Fetch Udemy Enrolled Courses Report */
export const getUdemyReport = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "udemy",
    });

    if (!connection?.accessToken)
      return res.status(400).json({ message: "Udemy not connected" });

    // Udemy endpoint (requires session token cookie)
    const response = await fetch(`https://www.udemy.com/api-2.0/users/me/subscribed-courses/`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "User-Agent": "Mozilla/5.0",
      },
    });

    const data = await response.json();

    if (!data.results)
      return res.status(400).json({ message: "Invalid Udemy response" });

    const report = data.results.map((course) => ({
      title: course.title,
      progress: course.progress_percent,
      image: course.image_100x100,
      url: `https://www.udemy.com${course.url}`,
      instructor: course.visible_instructors?.[0]?.title || "Unknown",
    }));

    res.status(200).json({
      message: "✅ Udemy report fetched successfully",
      report,
    });
  } catch (err) {
    console.error("❌ getUdemyReport Error:", err);
    res.status(500).json({ message: "Failed to fetch Udemy report", error: err.message });
  }
};

/** 5️⃣ Generate AI Insights */
export const getUdemyAIInsights = async (req, res) => {
  try {
    const insightsPrompt = `
You are AICOO, an AI mentor analyzing a user's Udemy learning activity.
Generate motivational insights and improvement suggestions.
Respond in JSON:
{
  "insights": ["3 learning insights"],
  "recommendations": ["3 learning tips"],
  "motivation": "short message"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: insightsPrompt }] }] }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    const parsed =
      JSON.parse(clean || "{}") || {
        insights: [
          "You’re steadily progressing through your courses.",
          "Your engagement shows consistent curiosity.",
          "You revisit older lessons — strong retention habits!",
        ],
        recommendations: [
          "Complete one pending module daily.",
          "Engage with quizzes for retention.",
          "Review past notes weekly.",
        ],
        motivation: "Every course finished builds a stronger you 🚀",
      };

    res.status(200).json({
      message: "✅ Udemy AI insights generated successfully",
      data: parsed,
    });
  } catch (err) {
    console.error("❌ getUdemyAIInsights Error:", err);
    res.status(500).json({ message: "Failed to generate Udemy insights", error: err.message });
  }
};

/** 6️⃣ Convert AI Recommendations → Goals */
export const createGoalsFromUdemyInsights = async (req, res) => {
  try {
    const insightsRes = await fetch(`${ENV.SERVER_URL}/api/reports/udemy/insights`, {
      headers: { Authorization: req.headers.authorization },
    });
    const insightsData = await insightsRes.json();

    const recs = insightsData?.data?.recommendations || [];
    if (!recs.length)
      return res.status(400).json({ message: "No AI recommendations found" });

    const createdGoals = [];
    for (const rec of recs.slice(0, 3)) {
      const goal = await Goal.create({
        userId: req.user.id,
        title: rec,
        type: "weekly",
        progress: 0,
        target: 1,
        status: "active",
      });
      createdGoals.push(goal);
    }

    res.status(201).json({
      message: "✅ Udemy AI goals created successfully",
      goals: createdGoals,
    });
  } catch (err) {
    console.error("❌ createGoalsFromUdemyInsights Error:", err);
    res.status(500).json({ message: "Failed to create Udemy goals", error: err.message });
  }
};
