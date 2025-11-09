// src/controllers/reports/notion.report.js
import fetch from "node-fetch";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchNotionUser, searchNotionDatabases, createNotionPage } from "../../services/notion.service.js";
import Goal from "../../models/Goal.js";

/**
 * Get Notion "report": list accessible databases and basic user info
 */
export const getNotionReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "notion" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Notion not connected" });

    const user = await fetchNotionUser(conn.accessToken);
    const dbs = await searchNotionDatabases(conn.accessToken);

    res.status(200).json({
      message: "Notion report generated successfully",
      report: {
        user,
        databases: dbs,
      },
    });
  } catch (err) {
    console.error("❌ getNotionReport Error:", err);
    res.status(500).json({ message: "Failed to fetch Notion report", error: err.message });
  }
};

/**
 * Push a single AICOO Goal into Notion as a page (or create in specified DB)
 * Body: { goalId, databaseId (optional) }
 */
export const pushGoalToNotion = async (req, res) => {
  try {
    const { goalId, databaseId } = req.body;
    if (!goalId) return res.status(400).json({ message: "Missing goalId in body" });

    const conn = await Connection.findOne({ userId: req.user.id, platform: "notion" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Notion not connected" });

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id });
    if (!goal) return res.status(404).json({ message: "Goal not found" });

    // Create Notion page from goal
    const page = await createNotionPage(conn.accessToken, {
      databaseId,
      title: goal.title,
      properties: {
        Status: goal.status || "active",
        Type: goal.type || "weekly",
        Progress: goal.progress || 0,
        Target: goal.target || 1,
      },
      content: goal.description || "",
    });

    res.status(201).json({ message: "Goal pushed to Notion", page });
  } catch (err) {
    console.error("❌ pushGoalToNotion Error:", err);
    res.status(500).json({ message: "Failed to push goal to Notion", error: err.message });
  }
};

/**
 * Generate AI insights based on Notion pages/databases (optional)
 * For example, analyze goal pages and suggest improvements
 */
export const getNotionAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "notion" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Notion not connected" });

    // Fetch user's goal pages from Notion (search by AICOO tag or database - simplified)
    const dbs = await searchNotionDatabases(conn.accessToken);
    const sampleDb = dbs?.[0];
    const prompt = `
You are AICOO, assist the user optimize their Notion goals and pages.

Notion user: ${conn.userId}
Sample DB: ${sampleDb?.title || "none"}

Return JSON:
{ "insights": ["3 quick suggestions about structuring goals in Notion"], "recommendations": ["3 action items"], "motivation": "short motivational line" }`;

    // Call Gemini if available; fallback if not
    let gemData = null;
    if (ENV.GEMINI_API_KEY) {
      const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      gemData = await gemRes.json();
    }

    let textOutput = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    if (!textOutput) {
      textOutput = JSON.stringify({
        insights: [
          "Group related goals in a single database to track progress consistently.",
          "Use properties for priority and target date for easy filtering.",
          "Add a short weekly review checkbox to measure momentum.",
        ],
        recommendations: [
          "Create a 'Weekly Goals' DB and push AICOO weekly goals there automatically.",
          "Use a 'Progress' numeric property and visualize it in Notion views.",
          "Add automation (Zapier/Make) to sync completed goals back to AICOO.",
        ],
        motivation: "A tidy system reduces friction — keep your goals visible and achievable!",
      });
    } else {
      textOutput = textOutput.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try { parsed = JSON.parse(textOutput); } catch { parsed = JSON.parse(textOutput || "{}"); }

    res.status(200).json({ message: "Notion AI insights generated", data: parsed });
  } catch (err) {
    console.error("❌ getNotionAIInsights Error:", err);
    res.status(500).json({ message: "Failed to generate Notion insights", error: err.message });
  }
};
