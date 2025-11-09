import fetch from "node-fetch";
import { ENV } from "../config/env.js";

/**
 * Fetch public LeetCode stats by username
 * @param {string} username
 */
export const fetchLeetCodeData = async (username) => {
  try {
    // REST API call
    const restRes = await fetch(
      `https://leetcode-stats-api.herokuapp.com/${username}`
    );
    const restData = await restRes.json();

    if (!restData || restData.status === "error") {
      throw new Error("Invalid username or LeetCode REST API error");
    }

    // GraphQL API call for streak + calendar
    const graphqlBody = {
      query: `
        query userProfileCalendar($username: String!) {
          matchedUser(username: $username) {
            userCalendar {
              streak
              totalActiveDays
              submissionCalendar
            }
          }
        }
      `,
      variables: { username },
    };

    const graphRes = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlBody),
    });
    const graphJson = await graphRes.json();

    const calendar = graphJson?.data?.matchedUser?.userCalendar || {};
    const {
      streak = null,
      totalActiveDays = null,
      submissionCalendar = null,
    } = calendar;

    return {
      username,
      totalSolved: restData.totalSolved,
      easySolved: restData.easySolved,
      mediumSolved: restData.mediumSolved,
      hardSolved: restData.hardSolved,
      acceptanceRate: restData.acceptanceRate,
      ranking: restData.ranking,
      contributionPoints: restData.contributionPoints,
      reputation: restData.reputation,

      streak,
      totalActiveDays,
      submissionCalendar, // this might be a large object/map so use accordingly
    };
  } catch (error) {
    console.error("❌ fetchLeetCodeData Error:", error);
    throw new Error("Failed to fetch LeetCode stats");
  }
};
