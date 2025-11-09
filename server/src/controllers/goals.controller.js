import { ENV } from "../config/env.js";
import Goal from "../models/Goal.js";
import User from "../models/User.js";
import { updateUserStreak } from "../utils/streak.helper.js";

/** 1️⃣ Create new goal */
export const createGoal = async (req, res) => {
  try {
    const { title, type, target } = req.body;
    if (!title)
      return res.status(400).json({ message: "Goal title is required" });

    const goal = await Goal.create({
      userId: req.user.id,
      title,
      type: type || "weekly",
      target: target || 100,
    });

    res.status(201).json({ message: "Goal created successfully", goal });
  } catch (error) {
    console.error("❌ createGoal Error:", error);
    res
      .status(500)
      .json({ message: "Failed to create goal", error: error.message });
  }
};

/** 2️⃣ Get all goals */
export const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ message: "Goals fetched successfully", goals });
  } catch (error) {
    console.error("❌ getGoals Error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch goals", error: error.message });
  }
};

/** 3️⃣ Update goal progress/title/status */
export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, progress, status } = req.body;

    // Update goal first
    const goal = await Goal.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: { title, progress, status } },
      { new: true }
    );

    // ❌ Prevent null crash
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    // ✅ Check completion AFTER confirming goal exists
    if (progress >= goal.target && goal.status !== "completed") {
      goal.status = "completed";
      await goal.save(); // update DB status

      const user = await User.findById(req.user.id);
      // Import this from ../utils/streak.helper.js
      await updateUserStreak(user, true);
    }

    res.status(200).json({ message: "Goal updated successfully", goal });
  } catch (error) {
    console.error("❌ updateGoal Error:", error);
    res
      .status(500)
      .json({ message: "Failed to update goal", error: error.message });
  }
};

/** 4️⃣ Delete goal */
export const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await Goal.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.status(200).json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("❌ deleteGoal Error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete goal", error: error.message });
  }
};

/** 5️⃣ AI suggest (mock for now) */
export const aiSuggestGoals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const goals = await Goal.find({ userId: req.user.id });

    const goalSummary = goals
      .map((g) => `${g.title} (${g.progress}/${g.target})`)
      .join(", ");

    const prompt = `
      You are AICOO, a friendly productivity assistant.
      The user is ${user.fullName}.
      Their current goals: ${goalSummary || "No active goals"}.

      Suggest 3 new realistic weekly goals that improve their coding or learning routine.
      Include 1 motivational message.
      Return response strictly in JSON format:
      {
        "suggestions": ["Goal1", "Goal2", "Goal3"],
        "motivation": "Motivational line"
      }
    `;

    // ✅ Gemini API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    // ✅ Extract text safely from multiple possible fields
    let textOutput =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts?.[0]?.content ||
      null;

    if (!textOutput) {
      console.error("⚠️ Gemini raw response:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        message: "Gemini returned no valid text output",
        rawResponse: data,
      });
    }

    // ✅ Clean up Markdown/code formatting if needed
    textOutput = textOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // ✅ Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch (err) {
      console.warn(
        "⚠️ Failed to parse Gemini JSON, using fallback:",
        err.message
      );
      parsed = {
        suggestions: [
          "Complete 5 LeetCode problems this week",
          "Push 2 commits to GitHub daily",
          "Spend 30 minutes on a new tech course",
        ],
        motivation: "You’re improving every day — keep pushing forward 🚀",
      };
    }

    res.status(200).json({
      message: "AI suggestions generated successfully (Gemini)",
      suggestions: parsed.suggestions,
      motivation: parsed.motivation,
    });
  } catch (error) {
    console.error("❌ aiSuggestGoals Error:", error);
    res.status(500).json({
      message: "Failed to generate AI goal suggestions",
      error: error.message,
    });
  }
};
