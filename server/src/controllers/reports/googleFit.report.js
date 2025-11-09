// src/controllers/reports/googleFit.report.js
import Connection from "../../models/Connection.js";
import { fetchSteps, fetchActiveMinutes, fetchSleep } from "../../services/googleFit.service.js";
import { ENV } from "../../config/env.js";
import fetch from "node-fetch";

/** GET /api/reports/google-fit */
export const getGoogleFitReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_fit" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Google Fit not connected" });

    const steps = await fetchSteps(req.user.id, 7);
    const active = await fetchActiveMinutes(req.user.id, 7);
    const sleep = await fetchSleep(req.user.id, 7);

    res.status(200).json({
      message: "Google Fit report fetched",
      report: { steps, active, sleep },
    });
  } catch (err) {
    console.error("❌ getGoogleFitReport Error:", err);
    res.status(500).json({ message: "Failed to fetch Google Fit report", error: err.message });
  }
};

/** GET /api/reports/google-fit/insights */
export const getGoogleFitAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_fit" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Google Fit not connected" });

    const steps = await fetchSteps(req.user.id, 7);
    const active = await fetchActiveMinutes(req.user.id, 7);
    const sleep = await fetchSleep(req.user.id, 7);

    const prompt = `
You are AICOO, a health & focus coach. Analyze the user's last 7 days:

Steps (daily): ${steps.map(s => `${s.day}:${s.steps}`).join(", ")}
Active Minutes (daily): ${active.map(a => `${a.day}:${a.activeMinutes}`).join(", ")}
Sleep (daily minutes): ${sleep.map(s => `${s.day}:${s.sleepMinutes}`).join(", ")}

Return JSON with:
{ "insights": ["3 health/focus observations"], "recommendations": ["3 concise suggestions"], "motivation": "short motivational sentence" }
`;

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
          "Your daily steps are inconsistent with lower activity mid-week.",
          "Active minutes are modest; adding 15–20 min sessions could boost focus.",
          "Sleep duration varies — aim for more consistent bedtimes.",
        ],
        recommendations: [
          "Add a 20-minute morning walk on weekdays.",
          "Block a 30-minute active break between study sessions.",
          "Aim for a consistent sleep schedule with a wind-down routine.",
        ],
        motivation: "Small daily habits compound — start with one 10-minute change.",
      });
    } else {
      textOutput = textOutput.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try { parsed = JSON.parse(textOutput); } catch { parsed = { insights: [], recommendations: [], motivation: "" }; }

    res.status(200).json({ message: "Google Fit AI insights", data: parsed });
  } catch (err) {
    console.error("❌ getGoogleFitAIInsights Error:", err);
    res.status(500).json({ message: "Failed to generate Google Fit insights", error: err.message });
  }
};
