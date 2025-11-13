import Connection from "../models/Connection.js";
import { fetchGitHubData } from "../services/github.service.js";
import { fetchLeetCodeData } from "../services/leetcode.service.js";
import { fetchSpotifyData } from "../services/spotify.service.js";
import { fetchCodeforcesData } from "../services/codeforces.service.js";
import { fetchCodechefData } from "../services/codechef.service.js";

export const buildTodayReport = async (userId) => {
  try {
    const connections = await Connection.find({ userId, connected: true });
    const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

    // ONLY FROM DB (THIS CONTROLS VISIBILITY)
    const hasGithub = !!connMap.github;
    const hasLeetCode = !!connMap.leetcode;
    const hasSpotify = !!connMap.spotify;
    const hasCodeforces = !!connMap.codeforces;
    const hasCodechef = !!connMap.codechef;

    // Tokens/usernames
    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;
    const spotifyToken = connMap.spotify?.accessToken;
    const cfUser = connMap.codeforces?.metadata?.username || connMap.codeforces?.profileId;
    const ccUser = connMap.codechef?.metadata?.username || connMap.codechef?.profileId;

    // Fetch in parallel (only if connected)
    const [
      gitHubRes,
      leetCodeRes,
      spotifyRes,
      cfRes,
      ccRes
    ] = await Promise.allSettled([
      hasGithub ? fetchGitHubData(githubToken) : null,
      hasLeetCode ? fetchLeetCodeData(leetcodeUser) : null,
      hasSpotify ? fetchSpotifyData(spotifyToken) : null,
      hasCodeforces ? fetchCodeforcesData(cfUser) : null,
      hasCodechef ? fetchCodechefData(ccUser) : null,
    ]);

    const github = gitHubRes?.status === "fulfilled" ? gitHubRes.value : null;
    const leetcode = leetCodeRes?.status === "fulfilled" ? leetCodeRes.value : null;
    const spotify = spotifyRes?.status === "fulfilled" ? spotifyRes.value : null;
    const codeforces = cfRes?.status === "fulfilled" ? cfRes.value : null;
    const codechef = ccRes?.status === "fulfilled" ? ccRes.value : null;

    const today = new Date().toISOString().slice(0, 10);

    // GITHUB
    const githubToday = github?.recentActivity?.includes(today) ? "💚 Yes" : "❌ No";

    // LEETCODE
    let leetcodeToday = "❌ No";
    if (leetcode?.submissionCalendar) {
      try {
        const cal = JSON.parse(leetcode.submissionCalendar);
        const ts = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
        if (cal[ts] > 0) leetcodeToday = "💚 Yes";
      } catch {}
    }

    // SPOTIFY
    const spotifyTodayTracks = spotify?.stats?.totalRecentTracks ?? 0;

    // CODEFORCES / CODECHEF (no daily data)
    const cfToday = "⚠️ No daily activity available";
    const ccToday = "⚠️ No daily activity available";

    // BUILD ONLY CONNECTED SECTIONS
    const parts = [];

    parts.push("📅 **Today’s Activity Summary**\n");

    if (hasGithub)
      parts.push(`💻 **GitHub**
• Commit Today: **${githubToday}**\n`);

    if (hasLeetCode)
      parts.push(`🧠 **LeetCode**
• Solved Today: **${leetcodeToday}**\n`);

    if (hasSpotify)
      parts.push(`🎵 **Spotify**
• Tracks Played Today: **${spotifyTodayTracks}**\n`);

    if (hasCodeforces)
      parts.push(`⚔️ **Codeforces**
• Activity: **${cfToday}**\n`);

    if (hasCodechef)
      parts.push(`🍴 **CodeChef**
• Activity: **${ccToday}**\n`);

    const description = parts.join("\n").trim();

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
