// src/services/leetcode.service.js
import fetch from "node-fetch";

/**
 * STABLE LEETCODE FETCHER USING alfa-leetcode-api
 * Source: https://github.com/alfaarghya/alfa-leetcode-api
 */
export const fetchLeetCodeData = async (username) => {
  try {
    const url = `https://alfa-leetcode-api.onrender.com/${username}/profile`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "EDUOO Bot",
        "Accept": "application/json",
      },
    });

    const data = await res.json();

    if (!data || data.error) {
      throw new Error("Invalid username or LeetCode API error");
    }

    return {
      username,
      // ✔ Basic Profile
      ranking: data.ranking || null,
      reputation: data.reputation || 0,

      // ✔ Problem stats
      totalSolved: data.totalSolved || 0,
      easySolved: data.easySolved || 0,
      mediumSolved: data.mediumSolved || 0,
      hardSolved: data.hardSolved || 0,

      // ✔ Submission stats
      acceptanceRate: data.acceptanceRate || 0,

      // ✔ Streak-related (if provided)
      streak: data.streak || 0,
      totalActiveDays: data.totalActiveDays || 0,
      submissionCalendar: data.submissionCalendar || {},
    };
  } catch (err) {
    console.error("❌ fetchLeetCodeData Error:", err.message);

    // SAFEST fallback — prevents Render crashes
    return {
      error: true,
      username,
      totalSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      acceptanceRate: 0,
      ranking: null,
      contributionPoints: 0,
      reputation: 0,
      streak: 0,
      totalActiveDays: 0,
      submissionCalendar: {},
    };
  }
};
