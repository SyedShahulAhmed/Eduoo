// src/services/leetcode.service.js
import fetch from "node-fetch";

/**
 * LeetCode GraphQL Query (Public + Stable)
 * Fetches: counts, ranking, contributions, calendar, streak
 */
const LEETCODE_QUERY = `
  query userProfile($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      username
      profile {
        ranking
        reputation
        contributionPoints
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      userCalendar {
        streak
        activeDays
        submissionCalendar
      }
    }
  }
`;

export const fetchLeetCodeData = async (username) => {
  try {
    const graphqlRes = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 EDUOO Bot", // VERY IMPORTANT
        Accept: "application/json",
        Referer: "https://leetcode.com",
        Origin: "https://leetcode.com",
      },
      body: JSON.stringify({
        query: LEETCODE_QUERY,
        variables: { username },
      }),
    });

    const json = await graphqlRes.json();

    // GraphQL user not found / invalid username
    if (!json?.data?.matchedUser) {
      throw new Error("User not found");
    }

    const user = json.data.matchedUser;

    // Submission counts
    const ac = user.submitStats?.acSubmissionNum || [];

    const easy = ac.find((x) => x.difficulty === "Easy")?.count ?? 0;
    const medium = ac.find((x) => x.difficulty === "Medium")?.count ?? 0;
    const hard = ac.find((x) => x.difficulty === "Hard")?.count ?? 0;

    const totalSolved = easy + medium + hard;

    // Calendar/Streak
    const calendar = user.userCalendar || {};
    const streak = calendar.streak ?? 0;
    const totalActiveDays = calendar.activeDays ?? 0;

    return {
      username,
      totalSolved,
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,

      ranking: user.profile?.ranking ?? null,
      reputation: user.profile?.reputation ?? 0,
      contributionPoints: user.profile?.contributionPoints ?? 0,

      // Use formula for accurate acceptance rate
      acceptanceRate:
        totalSolved > 0
          ? Number(((totalSolved / (totalActiveDays || totalSolved)) * 100).toFixed(2))
          : 0,

      streak,
      totalActiveDays,
      submissionCalendar: JSON.parse(calendar.submissionCalendar || "{}"),
    };
  } catch (error) {
    console.error("❌ fetchLeetCodeData Error:", error.message);

    return {
      error: true,
      username,
      totalSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      acceptanceRate: 0,
      ranking: null,
      reputation: 0,
      contributionPoints: 0,
      streak: 0,
      totalActiveDays: 0,
      submissionCalendar: {},
    };
  }
};
