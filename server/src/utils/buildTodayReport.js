import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchDuolingoProfile } from "../services/duolingo.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchCodechefData } from "../services/codechef.service.js";

export const buildTodayReport = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

    // PLATFORM PRESENCE FLAGS (use these to decide visibility)
    const hasGithub = !!connMap.github;
    const hasLeetCode = !!connMap.leetcode;
    const hasDuolingo = !!connMap.duolingo;
    const hasSpotify = !!connMap.spotify;
    const hasCodeforces = !!connMap.codeforces;
    const hasCodechef = !!connMap.codechef;

    // IDs / tokens for fetching
    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;
    const duolingoUser = connMap.duolingo?.metadata?.profileId;
    const spotifyToken = connMap.spotify?.accessToken;
    const cfUser = connMap.codeforces?.metadata?.username || connMap.codeforces?.profileId;
    const ccUser = connMap.codechef?.metadata?.username || connMap.codechef?.profileId;

    // Fetch everything in parallel (skip when not connected)
    const [
      gitHubRes,
      leetCodeRes,
      duolingoRes,
      spotifyRes,
      cfRes,
      ccRes
    ] = await Promise.allSettled([
      hasGithub && githubToken ? fetchGitHubData(githubToken) : null,
      hasLeetCode && leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
      hasDuolingo && duolingoUser ? fetchDuolingoProfile(duolingoUser) : null,
      hasSpotify && spotifyToken ? fetchSpotifyData(spotifyToken) : null,
      hasCodeforces && cfUser ? fetchCodeforcesData(cfUser) : null,
      hasCodechef && ccUser ? fetchCodechefData(ccUser) : null,
    ]);

    // Extract values (may be null if not fetched or failed)
    const github = gitHubRes && gitHubRes.status === "fulfilled" ? gitHubRes.value : null;
    const leetcode = leetCodeRes && leetCodeRes.status === "fulfilled" ? leetCodeRes.value : null;
    const duolingo = duolingoRes && duolingoRes.status === "fulfilled" ? duolingoRes.value : null;
    const spotify = spotifyRes && spotifyRes.status === "fulfilled" ? spotifyRes.value : null;
    const codeforces = cfRes && cfRes.status === "fulfilled" ? cfRes.value : null;
    const codechef = ccRes && ccRes.status === "fulfilled" ? ccRes.value : null;

    const today = new Date().toISOString().slice(0, 10);

    // GITHUB — commit today?
    const githubToday = github?.recentActivity?.includes(today) ? "💚 Yes" : "❌ No";

    // LEETCODE — solved today?
    let leetcodeToday = "❌ No";
    try {
      if (leetcode?.submissionCalendar) {
        const cal = typeof leetcode.submissionCalendar === "string"
          ? JSON.parse(leetcode.submissionCalendar)
          : leetcode.submissionCalendar;
        const ts = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
        if (cal && cal[ts] > 0) leetcodeToday = "💚 Yes";
      }
    } catch (e) {
      // ignore parsing errors — default is "No"
    }

    // DUOLINGO
    const duolingoStreak = duolingo?.streak ?? 0;
    // your duolingo service sets todayDone when it can; fallback to false
    const duolingoToday = duolingo?.todayDone ? "💚 Yes" : "❌ No XP detected";

    // SPOTIFY
    const spotifyTodayTracks = spotify?.stats?.totalRecentTracks ?? 0;

    // Codeforces & CodeChef — daily data not available (only show if connected)
    const cfToday = "⚠️ No daily activity available";
    const ccToday = "⚠️ No daily activity available";

    // Build description conditionally based on connection flags
    const parts = [];

    parts.push("📅 **Today’s Activity Summary**\n");

    if (hasGithub) {
      parts.push(`💻 **GitHub**
• Commit Today: **${githubToday}**
`);
    }

    if (hasLeetCode) {
      parts.push(`🧠 **LeetCode**
• Solved Today: **${leetcodeToday}**
`);
    }

    if (hasDuolingo) {
      parts.push(`🗣️ **Duolingo**
• Streak: **${duolingoStreak} days**
• Today: **${duolingoToday}**
`);
    }

    if (hasSpotify) {
      parts.push(`🎵 **Spotify**
• Tracks Played Today: **${spotifyTodayTracks}**
`);
    }

    if (hasCodeforces) {
      parts.push(`⚔️ **Codeforces**
• Activity: **${cfToday}**
`);
    }

    if (hasCodechef) {
      parts.push(`🍴 **CodeChef**
• Activity: **${ccToday}**
`);
    }

    // If user has no connected platforms, return a friendly embed
    let description = parts.join("\n").trim();
    if (!description) {
      description = "No platforms connected — nothing to show for today.";
    }

    return {
      embed: {
        color: 0x00c7ff,
        title: "📅 Today’s Productivity Snapshot",
        description,
        footer: { text: `Updated • ${new Date().toLocaleTimeString()}` },
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error("❌ buildTodayReport Error:", err.message);
    throw new Error("Failed to build today's report");
  }
};
