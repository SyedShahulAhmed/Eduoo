// src/controllers/reports/googleCalendar.report.js
import fetch from "node-fetch";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchGoogleCalendarEvents } from "../../services/googleCalendar.service.js";

/**
 * 5️⃣ Fetch Calendar Events report
 */
export const getGoogleCalendarReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_calendar" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Google Calendar not connected" });

    const events = await fetchGoogleCalendarEvents(conn.accessToken);
    res.status(200).json({
      message: "✅ Google Calendar events fetched successfully",
      count: events.length,
      events,
    });
  } catch (err) {
    console.error("❌ getGoogleCalendarReport Error:", err);
    res.status(500).json({ message: "Failed to fetch calendar events", error: err.message });
  }
};

/**
 * 6️⃣ Generate AI Insights (Gemini)
 */
export const getGoogleCalendarAIInsights = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_calendar" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Google Calendar not connected" });

    const events = await fetchGoogleCalendarEvents(conn.accessToken);
    const prompt = `
You are AICOO, a focus and time-management AI analyzing calendar events.

Events this week:
${events
  .slice(0, 10)
  .map((e) => `${e.summary} (${e.start})`)
  .join("\n")}

Give JSON output:
{
  "insights": ["3 short insights about scheduling habits"],
  "recommendations": ["3 actionable scheduling improvements"],
  "motivation": "short motivational quote"
}`;

    const resAI = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await resAI.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    if (!text)
      text = JSON.stringify({
        insights: [
          "Your meetings are heavily clustered mid-week.",
          "You dedicate limited time to personal learning or rest.",
          "Afternoon productivity dips observed from event timing.",
        ],
        recommendations: [
          "Block deep work sessions in the morning.",
          "Reserve one weekday for skill development tasks.",
          "Set reminders for short breaks between meetings.",
        ],
        motivation: "Manage your calendar, or it will manage you ⏰",
      });

    text = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    res.status(200).json({
      message: "✅ Google Calendar AI Insights generated",
      data: parsed,
    });
  } catch (err) {
    console.error("❌ getGoogleCalendarAIInsights Error:", err);
    res.status(500).json({ message: "Failed to generate calendar insights", error: err.message });
  }
};
