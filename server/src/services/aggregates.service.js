// src/services/aggregates.service.js
import Connection from "../models/Connection.js";
import { fetchCodechefData } from "./codechef.service.js";
import { fetchCodeforcesData } from "./codeforces.service.js";
import { fetchDuolingoProfile } from "./duolingo.service.js";
import { fetchGitHubData } from "./github.service.js";
import { fetchLeetCodeData } from "./leetcode.service.js";
import { normalizeMetrics } from "./metrics.normalizer.js";
import { fetchSpotifyData } from "./spotify.service.js";

/**
 * DAILY AGGREGATES
 * Pull data using your real fetch services and extract simple totals.
 * Notion dashboard only needs 3 values.
 */
export const getDailyAggregatesForUser = async (userId, date = new Date()) => {
  // 🔥 STEP 1 — Fetch all connected platforms for that user
  const connections = await Connection.find({ userId, connected: true });
  const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

  const raw = {};
  const ISO = date.toISOString().split("T")[0]; // YYYY-MM-DD

  // 🔵 GitHub
  if (connMap.github) {
    try {
      const res = await fetchGitHubData(connMap.github.accessToken);

      // Count commits made *today*
      const commitCount =
        res.recentActivity?.filter((d) => d === ISO).length || 0;

      raw.github = { commits: commitCount };
    } catch (e) {
      raw.github = null;
    }
  }

  // 🟣 LeetCode
  if (connMap.leetcode) {
    try {
      const res = await fetchLeetCodeData(connMap.leetcode.username);

      // submissionCalendar is a UNIX timestamp → count today's submissions
      let solvedToday = 0;

      if (res.submissionCalendar) {
        for (const [ts, val] of Object.entries(res.submissionCalendar)) {
          const d = new Date(Number(ts) * 1000).toISOString().split("T")[0];
          if (d === ISO) solvedToday += val;
        }
      }

      raw.leetcode = { solvedToday };
    } catch (e) {
      raw.leetcode = null;
    }
  }

  // 🎧 Spotify
  if (connMap.spotify) {
    try {
      const res = await fetchSpotifyData(connMap.spotify.accessToken);

      // approx: each recent track ≈ 3 minutes
      const minutes = Math.round((res.stats.totalRecentTracks || 0) * 3);

      raw.spotify = { minutes };
    } catch (e) {
      raw.spotify = null;
    }
  }

  // 🏆 Codeforces
  if (connMap.codeforces) {
    try {
      const res = await fetchCodeforcesData(connMap.codeforces.username);

      // rating change of latest contest (NOT daily, but helpful)
      raw.codeforces = { ratingChange: res.lastContest?.change || 0 };
    } catch (e) {
      raw.codeforces = null;
    }
  }

  // 🍽️ CodeChef
  if (connMap.codechef) {
    try {
      const res = await fetchCodechefData(connMap.codechef.username);

      raw.codechef = { rating: Number(res.rating) || 0 };
    } catch (e) {
      raw.codechef = null;
    }
  }

  // 🦉 Duolingo
  if (connMap.duolingo) {
    try {
      const res = await fetchDuolingoProfile(connMap.duolingo.username);

      raw.duolingo = { streak: res.streak || 0 };
    } catch (e) {
      raw.duolingo = null;
    }
  }

  // 🔥 STEP 2 — Normalize everything into a clean model
  const metrics = normalizeMetrics(raw);

  // 🔥 STEP 3 — Return Notion dashboard compatible structure
  return {
    date,
    commits: metrics.github?.commits || 0,
    leetcode: metrics.leetcode?.solved || 0,
    spotifyMinutes: metrics.spotify?.minutes || 0,

    // optional: you can store these but Notion doesn't use them yet
    codeforcesRatingChange: metrics.codeforces?.ratingChange || 0,
    codechefRating: metrics.codechef?.rating || 0,
    duolingoStreak: metrics.duolingo?.streak || 0,

    notes: "",
  };
};
/**
 * WEEKLY AGGREGATES
 * Use the same fetch services but rely on weekly stats your services already return.
 */
export const getWeeklyAggregatesForUser = async (userId) => {
  const connections = await Connection.find({ userId, connected: true });

  const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

  const rawData = {};

  if (connMap.github) {
    rawData.github = await fetchGitHubData(connMap.github.accessToken);
  }
  if (connMap.leetcode) {
    rawData.leetcode = await fetchLeetCodeData(connMap.leetcode.username);
  }
  if (connMap.spotify) {
    rawData.spotify = await fetchSpotifyData(connMap.spotify.accessToken);
  }
  if (connMap.codeforces) {
    rawData.codeforces = await fetchCodeforcesData(connMap.codeforces.username);
  }
  if (connMap.codechef) {
    rawData.codechef = await fetchCodechefData(connMap.codechef.username);
  }
  if (connMap.duolingo) {
    rawData.duolingo = await fetchDuolingoProfile(connMap.duolingo.username);
  }

  // ⭐ NORMALIZE EVERYTHING HERE
  const metrics = normalizeMetrics(rawData);

  return {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    metrics,
    connections: connMap,
    summaryText: "Your weekly performance summary.",
  };
};
