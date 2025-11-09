// services/codechef.service.js
import fetch from "node-fetch";

const API_BASE = process.env.CODECHEF_API_BASE || "https://api.codechef.com";

/**
 * Fetch CodeChef data. If an accessToken is provided, call the API endpoints.
 * If not, and a publicUsername is provided, try public endpoints (or scrape).
 */
export const fetchCodeChefData = async ({ accessToken, publicUsername }) => {
  try {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : { "Accept": "application/json" };

    // 1) If we have an access token, call official endpoints (profile, contests, submissions)
    if (accessToken) {
      // user info
      const profileRes = await fetch(`${API_BASE}/users/${publicUsername || "me"}`, { headers });
      const profileJson = await profileRes.json();

      // contests & practice (example endpoints — adapt if CodeChef uses different paths)
      const contestsRes = await fetch(`${API_BASE}/contests?limit=10`, { headers });
      const contestsJson = await contestsRes.json();

      // recent submissions for user
      const subsRes = await fetch(`${API_BASE}/submissions?username=${publicUsername}&limit=20`, { headers });
      const subsJson = await subsRes.json();

      // normalize returned data; shape depends on CodeChef API
      return {
        profileRaw: profileJson,
        username: profileJson?.result?.data?.content?.username || publicUsername || (profileJson?.result?.data?.content?.fullname ?? null),
        rating: profileJson?.result?.data?.content?.rating || null,
        highestRating: profileJson?.result?.data?.content?.highest_rating || null,
        contests: contestsJson?.result?.data || [],
        recentSubmissions: subsJson?.result?.data || [],
      };
    }

    // 2) Fallback: public profile scraping endpoints
    if (publicUsername) {
      // public profile endpoint (JSON) — many community tools use `https://www.codechef.com/users/{username}`
      const profilePageRes = await fetch(`https://www.codechef.com/users/${publicUsername}`, { headers });
      const html = await profilePageRes.text();

      // lightweight extraction: look for "rating" or some JSON payload — fallback safe parsing
      // If you have a robust parser, replace this with cheerio extraction
      const ratingMatch = html.match(/"rating":\s*"?(\d+)"?/i);
      const rating = ratingMatch ? Number(ratingMatch[1]) : null;

      // recent submissions page (simple)
      // Note: scraping HTML is brittle — prefer API + OAuth when possible
      return {
        username: publicUsername,
        rating,
        highestRating: null,
        contests: [],
        recentSubmissions: [],
        scrapedHtmlPreview: html ? html.slice(0, 200) : null,
      };
    }

    // Nothing to return
    throw new Error("No access token or public username provided to fetch CodeChef data");
  } catch (err) {
    console.error("❌ CodeChef service error:", err.message);
    throw new Error("Failed to fetch CodeChef data");
  }
};
