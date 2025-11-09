// src/controllers/reports/googleTasks.report.js
import {
  fetchGoogleTasks,
  createGoogleTask,
} from "../../services/googleTasks.service.js";
import Goal from "../../models/Goal.js";

/**
 * Sync AICOO Goals → Google Tasks
 */
export const syncGoalsToGoogleTasks = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id, status: "active" });
    const created = [];

    for (const goal of goals) {
      const task = await createGoogleTask(
        req.user.id,
        goal.title,
        `AICOO Goal: ${goal.type}`
      );
      created.push(task);
    }

    res.status(200).json({
      message: "✅ Synced AICOO goals to Google Tasks successfully",
      created,
    });
  } catch (err) {
    console.error("❌ syncGoalsToGoogleTasks Error:", err);
    res.status(500).json({ message: "Failed to sync goals", error: err.message });
  }
};

/**
 * Fetch user’s Google Tasks
 */
export const getGoogleTasksReport = async (req, res) => {
  try {
    const tasks = await fetchGoogleTasks(req.user.id);
    res.status(200).json({
      message: "Google Tasks fetched successfully",
      total: tasks.length,
      tasks,
    });
  } catch (err) {
    console.error("❌ getGoogleTasksReport Error:", err);
    res.status(500).json({ message: "Failed to fetch Google Tasks", error: err.message });
  }
};
