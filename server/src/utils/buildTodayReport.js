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

    const githubToken = connMap.github?.accessToken;
    const leetcodeUser = connMap.leetcode?.profileId;
    const duolingoUser = connMap.duolingo?.metadata?.profileId;
    const spotifyToken = connMap.spotify?.accessToken;
    const cfUser = connMap.codeforces?.metadata?.username || connMap.codeforces?.profileId;
    const ccUser = connMap.codechef?.metadata?.username || connMap.codechef?.profileId;

    // Fetch all 6 platforms
    const [
      gitHubRes,
      leetCodeRes,
      duolingoRes,
      spotifyRes,
      cfRes,
      ccRes
    ] = await Promise.allSettled([
      githubToken ? fetchGitHubData(githubToken) : null,
      leetcodeUser ? fetchLeetCodeData(leetcodeUser) : null,
      duolingoUser ? fetchDuolingoProfile(duolingoUser) : null,
      spotifyToken ? fetchSpotifyData(spotifyToken) : null,
      cfUser ? fetchCodeforcesData(cfUser) : null,
      ccUser ? fetchCodechefData(ccUser) : null,
    ]);

    const gitHub = gitHubRes.status === "fulfilled" ? gitHubRes.value.report : null;
    const leetCode = leetCodeRes.status === "fulfilled" ? leetCodeRes.value.report : null;
    const duolingo = duolingoRes.status === "fulfilled" ? duolingoRes.value : null;
    const spotify = spotifyRes.status === "fulfilled" ? spotifyRes.value.data : null;
    const codeforces = cfRes.status === "fulfilled" ? cfRes.value : null;
    const codechef = ccRes.status === "fulfilled" ? ccRes.value : null;

    const today = new Date().toISOString().slice(0, 10);

    // ---------------------------
    // GITHUB — Today commits
    // ---------------------------
    const githubToday =
      gitHub?.recentActivity?.includes(today) ? "💚 Yes" : "❌ No";

    // ---------------------------
    // LEETCODE — Today submissions
    // ---------------------------
    let leetcodeToday = "❌ No";
    if (leetCode?.submissionCalendar) {
      try {
        const cal = JSON.parse(leetCode.submissionCalendar);
        const ts = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
        if (cal[ts] > 0) leetcodeToday = "💚 Yes";
      } catch {}
    }

    // ---------------------------
    // DUOLINGO — only streak available
    // ---------------------------
    const duolingoToday = "⚠️ Not available (API does not give today XP)";
    const duolingoStreak = duolingo?.streak ?? 0;

    // ---------------------------
    // SPOTIFY — Today tracks played
    // ---------------------------
    const spotifyTodayTracks = spotify?.stats?.totalRecentTracks ?? 0;

    // ---------------------------
    // CODEFORCES — No daily data (rating only changes on contests)
    // ---------------------------
    const cfToday = "⚠️ No daily activity available";

    // ---------------------------
    // CODECHEF — No daily data
    // ---------------------------
    const ccToday = "⚠️ No daily activity available";

    // ---------------------------
    // FINAL DISPLAY
    // ---------------------------

    const description = `
📅 **Today’s Activity Summary**

💻 **GitHub**
• Commit Today: **${githubToday}**

🧠 **LeetCode**
• Solved Today: **${leetcodeToday}**

🗣️ **Duolingo**
• Streak: **${duolingoStreak} days**
• Today Activity: **${duolingoToday}**

🎵 **Spotify**
• Tracks Played Today: **${spotifyTodayTracks}**

⚔️ **Codeforces**
• Activity: **${cfToday}**

🍴 **CodeChef**
• Activity: **${ccToday}**
    `.trim();

    const embed = {
      color: 0x00c7ff,
      title: "📅 Today’s Productivity Snapshot",
      description,
      footer: { text: `Updated • ${new Date().toLocaleTimeString()}` },
      timestamp: new Date().toISOString(),
    };

    return { embed };

  } catch (err) {
    console.error("❌ buildTodayReport Error:", err.message);
    throw new Error("Failed to build today's report");
  }
};
