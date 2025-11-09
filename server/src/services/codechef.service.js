import fetch from "node-fetch";

export const fetchCodeforcesData = async (handle) => {
  try {
    const baseUrl = "https://codeforces.com/api";
    
    // 🧠 Fetch basic profile info
    const userRes = await fetch(`${baseUrl}/user.info?handles=${handle}`);
    const userData = await userRes.json();
    if (userData.status !== "OK" || !userData.result?.length)
      throw new Error("Invalid Codeforces user handle");
    
    const profile = userData.result[0];

    // 📊 Fetch rating history
    const ratingRes = await fetch(`${baseUrl}/user.rating?handle=${handle}`);
    const ratingData = await ratingRes.json();
    const contests = ratingData.status === "OK" ? ratingData.result : [];

    const totalContests = contests.length;
    const recentContest = contests.at(-1);
    const avgChange = contests.length
      ? contests.reduce((sum, c) => sum + (c.newRating - c.oldRating), 0) / contests.length
      : 0;

    return {
      username: profile.handle,
      rating: profile.rating || 0,
      maxRating: profile.maxRating || 0,
      rank: profile.rank || "unrated",
      maxRank: profile.maxRank || "unrated",
      organization: profile.organization || "N/A",
      contribution: profile.contribution,
      friendOfCount: profile.friendOfCount,
      totalContests,
      avgChange: Math.round(avgChange),
      lastContest: recentContest
        ? {
            name: recentContest.contestName,
            rank: recentContest.rank,
            newRating: recentContest.newRating,
            change: recentContest.newRating - recentContest.oldRating,
          }
        : null,
      profileUrl: `https://codeforces.com/profile/${profile.handle}`,
      avatar: profile.avatar,
    };
  } catch (err) {
    console.error("❌ Codeforces API Error:", err.message);
    throw new Error("Failed to fetch Codeforces data");
  }
};
