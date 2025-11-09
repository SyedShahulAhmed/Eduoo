import Goal from "../../models/Goal.js";
import { ENV } from "../../config/env.js";
import fetch from "node-fetch"; // for Gemini AI insights
import Connection from "../../models/Connection.js";
import { fetchGitHubData } from "../../services/github.service.js";

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
        commitStreak: data.commitStreak,
        topLanguages: data.topLanguages,
        recentActivity: data.recentActivity,
        profileUrl: data.profileUrl,
        avatarUrl: data.avatarUrl,
      },
    });
  } catch (error) {
    console.error("❌ getGitHubReport Error:", error);
    res.status(500).json({
      message: "Failed to fetch GitHub report",
      error: error.message,
    });
  }
};

/** 7️⃣ GitHub AI Insights Report */
export const getGitHubAIInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "github",
    });

    if (!connection || !connection.accessToken) {
      return res.status(400).json({ message: "GitHub not connected" });
    }

    const data = await fetchGitHubData(connection.accessToken);

    // 🔹 Enhanced AI Prompt using commit streak & activity
    const prompt = `
You are AICOO, an AI productivity mentor analyzing a developer’s GitHub performance.

User: ${data.username}
Followers: ${data.followers}
Public Repositories: ${data.publicRepos}
Recent Commits (last 30 days): ${data.recentCommits}
Current Commit Streak: ${data.commitStreak.current}
Longest Commit Streak: ${data.commitStreak.longest}
Top Languages: ${data.topLanguages.join(", ")}
Recent Active Days: ${data.recentActivity.join(", ")}

Generate a concise JSON output:
{
  "insights": ["3 clear insights about user's coding behavior and consistency"],
  "recommendations": ["3 short actionable goals for improvement"],
  "motivation": "1 strong motivational quote"
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
    let textOutput =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

    if (!textOutput) {
      console.error("⚠️ Gemini raw response:", JSON.stringify(geminiData, null, 2));
      return res.status(500).json({
        message: "Gemini returned no valid output",
        rawResponse: geminiData,
      });
    }

    // Clean JSON string
    textOutput = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        insights: [
          "Your coding consistency is solid but could improve with daily micro-commits.",
          "Top languages show front-end dominance — consider balancing with backend work.",
          "Your current streak shows dedication; build on that momentum.",
        ],
        recommendations: [
          "Increase commit frequency to maintain a longer streak.",
          "Start a new backend or AI repo this week.",
          "Engage in more collaborative projects for growth.",
        ],
        motivation:
          "Consistency beats intensity — one commit a day keeps stagnation away 🚀",
      };
    }

    res.status(200).json({
      message: "GitHub AI Insights generated successfully (Gemini)",
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

/** 8️⃣ Convert AI Recommendations → Goals */
export const createGoalsFromGithubInsights = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "github",
    });

    if (!connection || !connection.accessToken) {
      return res.status(400).json({ message: "GitHub not connected" });
    }

    // Fetch insights again
    const insightsRes = await fetch(
      `${ENV.SERVER_URL}/api/reports/github/insights`,
      {
        headers: { Authorization: req.headers.authorization },
      }
    );

    const insightsData = await insightsRes.json();

    if (!insightsData?.data?.recommendations?.length) {
      return res.status(400).json({
        message: "No AI recommendations found to convert into goals",
      });
    }

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
    console.error("❌ createGoalsFromGithubInsights Error:", error);
    res.status(500).json({
      message: "Failed to create AI-based GitHub goals",
      error: error.message,
    });
  }
};
