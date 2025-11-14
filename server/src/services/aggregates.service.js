// src/services/aggregates.service.js
import { fetchGitHubData } from "./github.service.js";
import { fetchLeetCodeData } from "./leetcode.service.js";
import { fetchSpotifyData } from "./spotify.service.js";

/**
 * DAILY AGGREGATES
 * Pull data using your real fetch services and extract simple totals.
 * Notion dashboard only needs 3 values.
 */
export const getDailyAggregatesForUser = async (userId, date = new Date()) => {
  let commits = 0;
  let leetcode = 0;
  let spotifyMinutes = 0;

  try {
    const github = await fetchGitHubData(userId);
    commits = github?.stats?.totalCommitsToday || github?.commitsToday || 0;
  } catch {}

  try {
    const leet = await fetchLeetCodeData(userId);
    leetcode = leet?.stats?.problemsSolvedToday || leet?.problemsToday || 0;
  } catch {}

  try {
    const spotify = await fetchSpotifyData(userId);
    spotifyMinutes = spotify?.stats?.focusMinutesToday || spotify?.focusToday || 0;
  } catch {}

  return {
    date,
    commits,
    leetcode,
    spotifyMinutes,
    notes: "",
  };
};

/**
 * WEEKLY AGGREGATES
 * Use the same fetch services but rely on weekly stats your services already return.
 */
export const getWeeklyAggregatesForUser = async (userId) => {
  const now = new Date();

  // last Sunday  
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - ((endDate.getDay() + 7) % 7) - 1);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  let github = 0;
  let leetcode = 0;
  let spotify = 0;

  try {
    const g = await fetchGitHubData(userId);
    github = g?.stats?.weeklyCommits || g?.weeklyCommits || 0;
  } catch {}

  try {
    const lc = await fetchLeetCodeData(userId);
    leetcode = lc?.stats?.weeklySolved || lc?.weeklyProblems || 0;
  } catch {}

  try {
    const sp = await fetchSpotifyData(userId);
    spotify = sp?.stats?.weeklyFocusMinutes || sp?.weeklyMinutes || 0;
  } catch {}

  return {
    startDate,
    endDate,
    metrics: {
      github,
      leetcode,
      spotify,
      streaks: "N/A", // optional — can integrate GitHub streak later
    },
    summaryText: `Weekly summary (${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()})`,
  };
};
