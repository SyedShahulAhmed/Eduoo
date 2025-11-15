// src/services/leetcode.service.js
import fetch from "node-fetch";

/**
 * Extract CSRF Token safely from LeetCode HTML
 */
function extractCSRFToken(html) {
  // Stronger and future-proof regex
  const match = html.match(/"csrfToken":"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Fetch safe JSON without crashing
 */
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * MAIN FUNCTION
 * Fully stable LeetCode fetcher with CSRF + Cookies + REST fallback
 */
export const fetchLeetCodeData = async (username) => {
  try {
    // ======================================================
    // 1️⃣ STEP: Fetch homepage → CSRF token + cookies
    // ======================================================
    const csrfRes = await fetch("https://leetcode.com", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 EDUOO Bot",
        "Accept": "text/html",
      },
    });

    const html = await csrfRes.text();
    const csrfToken = extractCSRFToken(html);

    if (!csrfToken) {
      console.warn("⚠️ Could not extract LeetCode CSRF token");
    }

    // Use ALL cookies (important!)
    const rawCookies = csrfRes.headers.raw()["set-cookie"] || [];
    const cookies = rawCookies.join("; ");

    // ======================================================
    // 2️⃣ STEP: REST API — Solved counts (external service)
    // ======================================================
    const restRes = await fetch(
      `https://leetcode-stats-api.herokuapp.com/${username}`
    );
    const restData = await restRes.json().catch(() => null);

    if (!restData || restData.status === "error") {
      throw new Error("Invalid username or LeetCode stats service error");
    }

    // ======================================================
    // 3️⃣ STEP: GraphQL — Calendar + Streak (requires CSRF)
    // ======================================================
    let graphJson = null;

    try {
      const graphRes = await fetch("https://leetcode.com/graphql/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 EDUOO Bot",
          "Referer": "https://leetcode.com",
          "Origin": "https://leetcode.com",
          Cookie: cookies,
          "x-csrftoken": csrfToken || "",
        },
        body: JSON.stringify({
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
        }),
      });

      graphJson = await safeJson(graphRes);
    } catch (err) {
      console.warn("⚠️ LeetCode GraphQL fetch failed:", err.message);
    }

    const calendar =
      graphJson?.data?.matchedUser?.userCalendar || {};

    const streak = calendar.streak ?? 0;
    const totalActiveDays = calendar.totalActiveDays ?? 0;
    const submissionCalendar = calendar.submissionCalendar ?? {};

    // ======================================================
    // 4️⃣ STEP: Return unified data
    // ======================================================
    return {
      username,

      // REST Values
      totalSolved: restData.totalSolved,
      easySolved: restData.easySolved,
      mediumSolved: restData.mediumSolved,
      hardSolved: restData.hardSolved,
      acceptanceRate: restData.acceptanceRate,
      ranking: restData.ranking,
      contributionPoints: restData.contributionPoints,
      reputation: restData.reputation,

      // GraphQL Values
      streak,
      totalActiveDays,
      submissionCalendar,
    };
  } catch (err) {
    console.error("❌ fetchLeetCodeData Error:", err.message);

    // Return safe fallback to avoid crashing Notion reports
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
