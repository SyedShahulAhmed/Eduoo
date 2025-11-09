// src/controllers/reports/hackerrank.report.js
import fetch from "node-fetch";
import { ENV } from "../../config/env.js";
import Connection from "../../models/Connection.js";
import { fetchHackerRankProfile } from "../../services/hackerrank.service.js";
import Goal from "../../models/Goal.js";


/** 4️⃣ Fetch HackerRank user stats/report */
export const getHackerRankReport = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "hackerrank",
    });

    if (!connection?.profileId) {
      return res.status(400).json({ message: "HackerRank not connected" });
    }

    // Use the service function to get live profile data
    const profile = await fetchHackerRankProfile(connection.profileId);

    // Structure and respond with key stats
    const report = {
      username: profile.username,
      overallRank: profile.overall_rank || null,
      score: profile.score || 0,
      badges: profile.badges?.map((b) => b.name) || [],
      languages: Object.keys(profile.languages || {}),
      practiceCount: profile.practice_count || 0,
    };

    res.status(200).json({
      message: "✅ HackerRank report fetched successfully",
      report,
    });
  } catch (err) {
    console.error("❌ getHackerRankReport Error:", err);
    res.status(500).json({
      message: "Failed to fetch HackerRank report",
      error: err.message,
    });
  }
};

/** 5️⃣ Generate AI insights via Gemini */
export const getHackerRankAIInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "hackerrank",
    });

    if (!connection?.profileId) {
      return res.status(400).json({ message: "HackerRank not connected" });
    }

    const profile = await fetchHackerRankProfile(connection.profileId);

    const prompt = `
You are AICOO, a productivity and coding mentor analyzing HackerRank stats.

User: ${profile.username}
Overall Rank: ${profile.overall_rank}
Total Score: ${profile.score}
Badges: ${profile.badges.map((b) => b.name).join(", ")}
Languages: ${Object.keys(profile.languages).join(", ")}
Practice Count: ${profile.practice_count}

Return a JSON object:
{
  "insights": ["3 clear insights about user's coding behavior"],
  "recommendations": ["3 actionable improvement ideas"],
  "motivation": "One motivational sentence"
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
    let textOutput =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    textOutput = textOutput.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: [
          "You show consistency in problem solving and contest participation.",
          "Your strongest language is among top performing users globally.",
          "Your challenge-solving pace is improving over time.",
        ],
        recommendations: [
          "Participate in weekly contests to maintain competitive rhythm.",
          "Focus on medium/hard problems to improve algorithmic depth.",
          "Engage in discussions for problem insights and new approaches.",
        ],
        motivation:
          "Keep challenging yourself — every solved problem builds mastery ⚡",
      };
    }

    res.status(200).json({
      message: "✅ HackerRank AI Insights generated",
      data: {
        profile,
        insights: parsed.insights,
        recommendations: parsed.recommendations,
        motivation: parsed.motivation,
      },
    });
  } catch (err) {
    console.error("❌ getHackerRankAIInsights Error:", err);
    res
      .status(500)
      .json({ message: "Failed to generate AI insights", error: err.message });
  }
};

/** 6️⃣ Convert recommendations → AICOO Goals */
export const createGoalsFromHackerRankInsights = async (req, res) => {
  try {
    const insightsRes = await fetch(
      `${ENV.SERVER_URL}/api/reports/hackerrank/insights`,
      {
        headers: { Authorization: req.headers.authorization },
      }
    );
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
        createdAt: new Date(),
      });
      createdGoals.push(goal);
    }

    res
      .status(201)
      .json({ message: "✅ HackerRank AI goals created", goals: createdGoals });
  } catch (err) {
    console.error("❌ createGoalsFromHackerRankInsights Error:", err);
    res
      .status(500)
      .json({ message: "Failed to create goals", error: err.message });
  }
};
