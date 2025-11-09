import User from "../../models/User.js";
import Goal from "../../models/Goal.js";
import { ENV } from "../../config/env.js";
import fetch from "node-fetch";

/**
 * GET /api/reports/all — Combined AI-powered report
 */
export const getAllReports = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "fullName email streaks achievements totalGoalsCompleted"
    );

    const goals = await Goal.find({ userId: req.user.id });

    const completedGoals = goals.filter((g) => g.status === "completed");
    const activeGoals = goals.filter((g) => g.status !== "completed");
    const completionRate =
      goals.length > 0
        ? Math.round((completedGoals.length / goals.length) * 100)
        : 0;

    // Gemini AI Prompt
    const prompt = `
      You are AICOO AI reporting assistant.
      User: ${user.fullName}
      Completed goals: ${completedGoals.length}
      Active goals: ${activeGoals.length}
      Streak: ${user.streaks?.currentStreak || 0}
      Achievements: ${user.achievements.join(", ") || "None"}.

      Generate a JSON summary:
      {
        "insights": ["3 motivational insights"],
        "recommendations": ["3 next steps"],
        "motivation": "1 inspiring sentence"
      }
    `;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await aiResponse.json();
    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, "").trim() ||
      "{}";

    let aiReport;
    try {
      aiReport = JSON.parse(text);
    } catch {
      aiReport = {
        insights: ["Consistent progress noted!", "Goal tracking is improving."],
        recommendations: [
          "Increase weekly challenge targets slightly.",
          "Try integrating new learning platforms.",
          "Stay active daily to maintain streaks.",
        ],
        motivation: "Keep up the momentum — every bit counts 💪",
      };
    }

    res.status(200).json({
      message: "Combined report generated successfully",
      report: {
        user: {
          fullName: user.fullName,
          email: user.email,
          streaks: user.streaks,
          achievements: user.achievements,
          totalGoalsCompleted: user.totalGoalsCompleted,
        },
        goals: {
          total: goals.length,
          completed: completedGoals.length,
          active: activeGoals.length,
          completionRate: `${completionRate}%`,
        },
        aiInsights: aiReport,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ getAllReports Error:", error);
    res.status(500).json({
      message: "Failed to generate report",
      error: error.message,
    });
  }
};
