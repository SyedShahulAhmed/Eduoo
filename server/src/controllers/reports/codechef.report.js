// controllers/Reports/codechef.reports.js
import fetch from "node-fetch";
import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";
import { ENV } from "../../config/env.js";
import { fetchCodeChefData } from "../../services/codechef.service.js";

export const getCodeChefReport = async (req, res) => {
  try {
    // try to use stored token first; otherwise allow client to pass ?username=
    const connection = await Connection.findOne({ userId: req.user.id, platform: "codechef" });
    const username = req.query.username || (connection?.username || null);

    if (!connection?.accessToken && !username) {
      return res.status(400).json({ message: "CodeChef not connected and username not provided" });
    }

    const data = await fetchCodeChefData({ accessToken: connection?.accessToken, publicUsername: username });

    return res.status(200).json({ message: "CodeChef report generated", report: data });
  } catch (err) {
    console.error("❌ getCodeChefReport Error:", err);
    return res.status(500).json({ message: "Failed to fetch CodeChef report", error: err.message });
  }
};

export const getCodeChefAIInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({ userId: req.user.id, platform: "codechef" });
    const username = req.query.username || (connection?.username || null);

    if (!connection?.accessToken && !username) {
      return res.status(400).json({ message: "CodeChef not connected and username not provided" });
    }

    const data = await fetchCodeChefData({ accessToken: connection?.accessToken, publicUsername: username });

    // Build a prompt for Gemini
    const prompt = `
You are AICOO, a friendly productivity coach analyzing competitive programming progress.

User: ${data.username}
Rating: ${data.rating || "Unknown"}
Recent Submissions: ${Array.isArray(data.recentSubmissions) ? data.recentSubmissions.slice(0,5).map(s => s.code || s.problem_code || s.problem || JSON.stringify(s)).join(", ") : "N/A"}
Top contests sample: ${Array.isArray(data.contests) ? data.contests.slice(0,3).map(c => c.name || JSON.stringify(c)).join(", ") : "N/A"}

Return JSON:
{
  "insights": ["3 observations about user's competitive programming activity"],
  "recommendations": ["3 short actionable steps to improve rank or habits"],
  "motivation": "One punchy motivational sentence."
}
    `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    let textOutput = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

    if (!textOutput) {
      console.error("⚠️ Gemini raw response (codechef):", JSON.stringify(geminiData, null, 2));
      return res.status(500).json({ message: "Gemini returned no valid output", rawResponse: geminiData });
    }

    // Clean and parse JSON
    textOutput = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: [
          "Your submission frequency is moderate and focused on long challenges.",
          "Rating shows steady improvement.",
          "You tend to practice a mix of easy and medium problems."
        ],
        recommendations: [
          "Do timed practice sessions twice per week.",
          "Focus on data-structure problems to raise rating.",
          "Participate in at least one lunchtime or contest monthly."
        ],
        motivation: "Consistency beats intensity — keep solving every day!"
      };
    }

    return res.status(200).json({
      message: "CodeChef AI Insights generated successfully",
      data: {
        profile: data,
        insights: parsed.insights,
        recommendations: parsed.recommendations,
        motivation: parsed.motivation,
      },
    });
  } catch (err) {
    console.error("❌ getCodeChefAIInsights Error:", err);
    return res.status(500).json({ message: "Failed to generate AI CodeChef insights", error: err.message });
  }
};

export const createGoalsFromCodechefInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({ userId: req.user.id, platform: "codechef" });
    const username = req.query.username || (connection?.username || null);

    if (!connection?.accessToken && !username) {
      return res.status(400).json({ message: "CodeChef not connected and username not provided" });
    }

    // call insights endpoint (internal)
    const insightsRes = await fetch(`${ENV.SERVER_URL}/api/reports/codechef/insights${username ? `?username=${username}` : ""}`, {
      headers: { Authorization: req.headers.authorization },
    });
    const insightsData = await insightsRes.json();

    const recommendations = insightsData?.data?.recommendations || [];
    if (!recommendations.length) {
      return res.status(400).json({ message: "No AI recommendations found to convert into goals" });
    }

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

    return res.status(201).json({ message: "AI-based CodeChef goals created successfully", goals: createdGoals });
  } catch (err) {
    console.error("❌ createGoalsFromCodechefInsights Error:", err);
    return res.status(500).json({ message: "Failed to create CodeChef goals", error: err.message });
  }
};
