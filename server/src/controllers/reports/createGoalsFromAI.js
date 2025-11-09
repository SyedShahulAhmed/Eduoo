import Goal from "../../models/Goal.js";

/**
 * Convert AI recommendations → AICOO goals
 * @param {Object} req Express request
 * @param {Array} recommendations array of AI-suggested goals
 */
export const createGoalsFromAI = async (req, recommendations) => {
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

  return createdGoals;
};
