import fetch from "node-fetch";
import Connection from "../../models/Connection.js";
import Goal from "../../models/Goal.js";
import { ENV } from "../../config/env.js";
import { fetchSpotifyData } from "../../services/spotify.service.js";

export const getSpotifyReport = async (req, res) => {
  try {
    const connection = await Connection.findOne({ userId: req.user.id, platform: "spotify" });
    if (!connection || !connection.accessToken) return res.status(400).json({ message: "Spotify not connected" });

    const data = await fetchSpotifyData(connection.accessToken);
    res.status(200).json({ message: "Spotify report generated", data });
  } catch (error) {
    res.status(500).json({ message: "Spotify report failed", error: error.message });
  }
};

export const getSpotifyAIInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({ userId: req.user.id, platform: "spotify" });
    if (!connection?.accessToken) return res.status(400).json({ message: "Spotify not connected" });

    const data = await fetchSpotifyData(connection.accessToken);

    const prompt = `
You are AICOO, a focus productivity mentor.
User's recent music includes: ${data.recentTracks.join(", ")}.
Top artists: ${data.artists.join(", ")}.
Playlists: ${data.playlists.join(", ")}.

Return JSON:
{
  "insights": ["3 insights about focus/music trends"],
  "recommendations": ["3 music productivity suggestions"],
  "motivation": "One motivational line"
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const result = await geminiRes.json();
    let parsed;
    try {
      const clean = result?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        insights: ["You enjoy focus-driven playlists.", "Music variety boosts your sessions.", "Strong rhythm choices aid deep work."],
        recommendations: ["Try instrumental tracks for studying.", "Limit lyrical songs during focus time.", "Create 'Flow Mode' playlists."],
        motivation: "Your soundtrack powers your success 🎧",
      };
    }

    res.status(200).json({ message: "Spotify AI Insights generated", data: parsed });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate Spotify insights", error: err.message });
  }
};
export const createGoalsFromSpotifyInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "spotify",
    });

    if (!connection || !connection.accessToken) {
      return res.status(400).json({ message: "Spotify not connected" });
    }

    // Step 1: Fetch insights from AI endpoint
    const insightsRes = await fetch(`${ENV.SERVER_URL}/api/reports/spotify/insights`, {
      headers: { Authorization: req.headers.authorization },
    });
    const insightsData = await insightsRes.json();

    if (!insightsData?.data?.recommendations?.length) {
      return res.status(400).json({
        message: "No AI recommendations found to convert into goals",
      });
    }

    // Step 2: Convert recommendations → goals
    const recommendations = insightsData.data.recommendations;
    const createdGoals = [];

    for (const rec of recommendations.slice(0, 3)) {
      const goal = await Goal.create({
        userId: req.user.id,
        title: rec,
        type: "daily",
        progress: 0,
        target: 1,
        status: "active",
        createdAt: new Date(),
      });
      createdGoals.push(goal);
    }

    res.status(201).json({
      message: "AI-based Spotify goals created successfully",
      goals: createdGoals,
    });
  } catch (error) {
    console.error("❌ createGoalsFromSpotifyInsights Error:", error);
    res.status(500).json({
      message: "Failed to create AI-based Spotify goals",
      error: error.message,
    });
  }
};
