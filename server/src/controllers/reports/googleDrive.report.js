// src/controllers/reports/googleDrive.report.js
import fetch from "node-fetch";
import { ENV } from "../../config/env.js";
import Connection from "../../models/Connection.js";
import { fetchGoogleDriveFiles } from "../../services/googleDrive.service.js";

/**
 * 5️⃣ Google Drive Report — fetch recent files
 */
export const getGoogleDriveReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_drive" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Google Drive not connected" });

    const files = await fetchGoogleDriveFiles(conn.accessToken);
    res.status(200).json({
      message: "✅ Google Drive report generated",
      filesCount: files.length,
      files,
    });
  } catch (err) {
    console.error("❌ getGoogleDriveReport Error:", err);
    res.status(500).json({ message: "Failed to fetch Google Drive report", error: err.message });
  }
};

/**
 * 6️⃣ Generate AI Insights (Gemini)
 */
export const getGoogleDriveAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_drive" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Google Drive not connected" });

    const files = await fetchGoogleDriveFiles(conn.accessToken);
    const prompt = `
You are AICOO, a smart productivity assistant analyzing Google Drive activity.

Recent Files:
${files.slice(0, 10).map((f) => `${f.name} (${f.mimeType})`).join("\n")}

Provide JSON:
{
  "insights": ["3 observations about organization habits"],
  "recommendations": ["3 file organization or backup tips"],
  "motivation": "1 motivational line"
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
    let textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    if (!textOutput) {
      textOutput = JSON.stringify({
        insights: [
          "You create many files but seldom organize them into folders.",
          "Recent uploads suggest frequent document edits and collaborations.",
          "Backups are sporadic — automating them could save time.",
        ],
        recommendations: [
          "Create dedicated folders by category or project.",
          "Use consistent naming conventions for quick retrieval.",
          "Schedule weekly Drive cleanups or backups to Google Drive/Notion.",
        ],
        motivation: "A clean Drive fuels a clear mind ☁️",
      });
    }
    textOutput = textOutput.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(textOutput);

    res.status(200).json({ message: "✅ Google Drive AI insights generated", data: parsed });
  } catch (err) {
    console.error("❌ getGoogleDriveAIInsights Error:", err);
    res.status(500).json({ message: "Failed to generate AI insights", error: err.message });
  }
};
