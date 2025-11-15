// src/services/leetcode.service.js
import fetch from "node-fetch";

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
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 EDUOO Bot",
        Accept: "application/json",
        Referer: "https://leetcode.com",
        Origin: "https://leetcode.com",
      },
      body: JSON.stringify({
        query: LEETCODE_QUERY,
        variables: { username },
      }),
    });

    const json = await res.json();

    if (!json?.data?.matchedUser) {
      throw new Error("User not found");
    }

    const user = json.data.matchedUser;

    const ac = user.submitStats?.acSubmissionNum || [];

    const easy = ac.find((x) => x.difficulty === "Easy")?.count ?? 0;
    const medium = ac.find((x) => x.difficulty === "Medium")?.count ?? 0;
    const hard = ac.find((x) => x.difficulty === "Hard")?.count ?? 0;
    const totalSolved = easy + medium + hard;

    const calendar = user.userCalendar || {};

    // SAFE submissionCalendar parsing
    let submissionCalendar = {};
    try {
      submissionCalendar =
        typeof calendar.submissionCalendar === "string"
          ? JSON.parse(calendar.submissionCalendar)
          : {};
    } catch {
      submissionCalendar = {}; // fallback
    }

    return {
      username,

      totalSolved,
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,

      ranking: user.profile?.ranking ?? null,
      reputation: user.profile?.reputation ?? 0,
      contributionPoints: user.profile?.contributionPoints ?? 0,

      acceptanceRate:
        totalSolved > 0 ? Number(((easy + medium + hard) / totalSolved).toFixed(2)) : 0,

      streak: calendar.streak ?? 0,
      totalActiveDays: calendar.activeDays ?? 0,
      submissionCalendar,
    };
  } catch (err) {
    console.error("❌ LeetCode Fetch Error:", err.message);

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
