export const updateUserStreak = async (user, goalCompleted = false) => {
  const today = new Date().toDateString();
  const lastUpdated = user.streaks?.lastUpdated
    ? new Date(user.streaks.lastUpdated).toDateString()
    : null;

  // Increment streak on new completion or login
  if (lastUpdated !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastUpdated === yesterday.toDateString()) {
      user.streaks.currentStreak += 1;
      console.log(`🔥 ${user.fullName} streak incremented to ${user.streaks.currentStreak}`);
    } else {
      user.streaks.currentStreak = 1;
      console.log(`🎯 ${user.fullName} streak reset to 1 (new streak started)`);
    }

    user.streaks.lastUpdated = new Date();

    // Update longest streak
    if (user.streaks.currentStreak > user.streaks.longestStreak) {
      user.streaks.longestStreak = user.streaks.currentStreak;
      console.log(`🏆 New longest streak for ${user.fullName}: ${user.streaks.longestStreak}`);
    }

    // Add badges
    if (user.streaks.currentStreak === 7 && !user.achievements.includes("🔥 7-Day Streak")) {
      user.achievements.push("🔥 7-Day Streak");
      console.log(`🥇 ${user.fullName} earned badge: 7-Day Streak`);
    }

    if (user.streaks.currentStreak === 30 && !user.achievements.includes("🏆 30-Day Champion")) {
      user.achievements.push("🏆 30-Day Champion");
      console.log(`🏅 ${user.fullName} earned badge: 30-Day Champion`);
    }
  }

  // Bonus for goal completion
  if (goalCompleted) {
    user.totalGoalsCompleted += 1;
    console.log(`✅ ${user.fullName} completed a goal! Total: ${user.totalGoalsCompleted}`);

    if (user.totalGoalsCompleted === 10 && !user.achievements.includes("💪 Goal Crusher")) {
      user.achievements.push("💪 Goal Crusher");
      console.log(`💪 ${user.fullName} earned badge: Goal Crusher`);
    }
  }

  await user.save();
  console.log(`📊 Saved streak data for ${user.fullName}: current=${user.streaks.currentStreak}, longest=${user.streaks.longestStreak}`);
};
