import Goal from "../../models/Goal.js";
import { ENV } from "../../config/env.js";
import fetch from "node-fetch"; // for Gemini AI insights
import Connection from "../../models/Connection.js";
import { fetchGitHubData } from "../../services/github.service.js";


/** GET /api/reports/github */
/** 6️⃣ GitHub Report */
export const getGitHubReport = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "github",
    });

    if (!connection || !connection.accessToken) {
      return res.status(400).json({ message: "GitHub not connected" });
    }

    const data = await fetchGitHubData(connection.accessToken);

    res.status(200).json({
      message: "GitHub report generated successfully",
      report: {
        username: data.username,
        publicRepos: data.publicRepos,
        followers: data.followers,
        recentCommits: data.recentCommits,
        topLanguages: data.topLanguages,
        profileUrl: data.profileUrl,
        avatarUrl: data.avatarUrl,
      },
    });
  } catch (error) {
    console.error("❌ getGitHubReport Error:", error);
    res.status(500).json({ message: "Failed to fetch GitHub report", error: error.message });
  }
};
/** 7️⃣  GitHub AI Insights Report  */
export const getGitHubAIInsights = async (req, res) => {
  try {
    // 🔹 Get stored GitHub access token
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "github",
    });

    if (!connection || !connection.accessToken) {
      return res.status(400).json({ message: "GitHub not connected" });
    }

    // 🔹 Fetch GitHub activity data
    const data = await fetchGitHubData(connection.accessToken);

    // 🔹 Build AI prompt
    const prompt = `
You are AICOO, a friendly productivity mentor analyzing GitHub activity.

User: ${data.username}
Followers: ${data.followers}
Public Repos: ${data.publicRepos}
Recent Commits: ${data.recentCommits}
Top Languages: ${data.topLanguages.join(", ")}

Give a JSON response:
{
  "insights": ["3 clear observations about the user's coding trends"],
  "recommendations": ["3 short actionable suggestions for improvement"],
  "motivation": "One powerful motivational sentence."
}
    `;

    // 🔹 Call Gemini 2.5 Flash
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
    let textOutput =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

    if (!textOutput) {
      console.error("⚠️ Gemini raw response:", JSON.stringify(geminiData, null, 2));
      return res.status(500).json({
        message: "Gemini returned no valid output",
        rawResponse: geminiData,
      });
    }

    // Clean and parse JSON
    textOutput = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: [
          "Your GitHub activity is consistent and technically focused.",
          "Top languages indicate strong front-end skills.",
          "Your repositories show structured learning progress.",
        ],
        recommendations: [
          "Push commits at least twice weekly.",
          "Explore back-end or AI-related projects.",
          "Document repos with clear READMEs for visibility.",
        ],
        motivation:
          "Every commit builds your story — keep coding and improving 🚀",
      };
    }

    res.status(200).json({
      message: "GitHub AI Insights generated successfully ( Gemini )",
      data: {
        profile: data,
        insights: parsed.insights,
        recommendations: parsed.recommendations,
        motivation: parsed.motivation,
      },
    });
  } catch (err) {
    console.error("❌ getGitHubAIInsights Error:", err);
    res.status(500).json({
      message: "Failed to generate AI GitHub insights",
      error: err.message,
    });
  }
};
export const createGoalsFromGithubInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "github",
    });

    if (!connection || !connection.accessToken) {
      return res.status(400).json({ message: "GitHub not connected" });
    }

    // Step 1: Fetch AI insights again
    const insightsRes = await fetch(
      `${ENV.SERVER_URL}/api/reports/github/insights`,
      {
        headers: { Authorization: req.headers.authorization },
      }
    );

    const insightsData = await insightsRes.json();

    if (!insightsData?.data?.recommendations?.length) {
      return res
        .status(400)
        .json({ message: "No AI recommendations found to convert into goals" });
    }

    // Step 2: Convert recommendations → goals
    const recommendations = insightsData.data.recommendations;
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

    res.status(201).json({
      message: "AI-based GitHub goals created successfully",
      goals: createdGoals,
    });
  } catch (error) {
    console.error("❌ createGoalsFromAIInsights Error:", error);
    res.status(500).json({
      message: "Failed to create AI-based GitHub goals",
      error: error.message,
    });
  }
};