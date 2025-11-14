// src/controllers/reports/notion.report.js

import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";
import { createOrUpdateGoalPage } from "../../services/notion.service.js";
import {
  fetchNotionUser,
  searchNotionDatabases,
} from "../../services/notion.service.js";
import { ENV } from "../../config/env.js";

/* ===========================================================
   📊 1) GET BASIC NOTION REPORT  
   - Returns Notion user info
   - Returns list of databases user has access to
   =========================================================== */

export const getNotionReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
    });

    if (!conn?.accessToken)
      return res.status(400).json({ message: "Notion not connected" });

    // Fetch Notion user profile
    const notionUser = await fetchNotionUser(conn.accessToken);

    // Fetch all accessible Notion databases
    const databases = await searchNotionDatabases(conn.accessToken);

    return res.status(200).json({
      message: "Notion report fetched",
      notionUser,
      databases,
    });
  } catch (err) {
    console.error("❌ getNotionReport Error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch Notion report", error: err.message });
  }
};

/* ===========================================================
   🤖 2) GET NOTION AI INSIGHTS
   - Very simple AI to give suggestions
   - Uses Gemini if available
   =========================================================== */

export const getNotionAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
    });

    if (!conn?.accessToken)
      return res.status(400).json({ message: "Notion not connected" });

    const databases = await searchNotionDatabases(conn.accessToken);

    const prompt = `
You are AICOO AI. Give insights to organize productivity data inside Notion.

User has access to ${databases.length} databases.

Return JSON with:
{
 "insights": ["tip1","tip2","tip3"],
 "recommendations": ["one","two","three"],
 "motivation": "1 sentence"
}
`;

    let output = null;

    if (ENV.GEMINI_API_KEY) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await resp.json();
      output = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    }

    if (!output) {
      // fallback JSON
      output = JSON.stringify({
        insights: [
          "Organize EDUOO goals into a single Notion database.",
          "Use properties like Status, Progress and Type to filter easily.",
          "Create a weekly page where EDUOO syncs summaries.",
        ],
        recommendations: [
          "Push all active goals to the 'EDUOO Goals' database.",
          "Use views: 'Completed', 'Active', 'This Week'.",
          "Let EDUOO sync a daily dashboard row every night.",
        ],
        motivation: "Small improvements every day create massive progress.",
      });
    }

    output = output.replace(/```json|```/g, "");
    const parsed = JSON.parse(output);

    return res.status(200).json({
      message: "Notion AI insights generated",
      data: parsed,
    });
  } catch (err) {
    console.error("❌ getNotionAIInsights Error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to generate insights", error: err.message });
  }
};

/* ===========================================================
   🎯 3) PUSH A GOAL TO NOTION
   - Creates/Updates a Notion page inside user's DB
   =========================================================== */

export const pushGoalToNotion = async (req, res) => {
  try {
    const { goalId, databaseId } = req.body;

    if (!goalId)
      return res.status(400).json({ message: "Missing goalId in body" });

    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
    });

    if (!conn?.accessToken)
      return res.status(400).json({ message: "Notion not connected" });

    const goal = await Goal.findOne({
      _id: goalId,
      userId: req.user.id,
    });

    if (!goal) return res.status(404).json({ message: "Goal not found" });

    // If user wants a custom DB
    if (databaseId) {
      conn.metadata = {
        ...(conn.metadata || {}),
        notionDatabaseId: databaseId,
      };
      await conn.save();
    }

    const page = await createOrUpdateGoalPage(conn, goal);

    return res.status(201).json({
      message: "Goal pushed to Notion",
      page,
    });
  } catch (err) {
    console.error("❌ pushGoalToNotion Error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to push goal", error: err.message });
  }
};
