export const normalizeMetrics = (data) => {
  return {
    github: data.github
      ? { commits: data.github.recentCommits || 0 }
      : null,

    leetcode: data.leetcode
      ? { solved: data.leetcode.totalSolved || 0 }
      : null,

    spotify: data.spotify
      ? { minutes: Math.round((data.spotify.stats.totalRecentTracks || 0) * 3) }
      : null,

    codeforces: data.codeforces
      ? { ratingChange: data.codeforces.lastContest?.change || 0 }
      : null,

    codechef: data.codechef
      ? { rating: Number(data.codechef.rating) || 0 }
      : null,

    duolingo: data.duolingo
      ? { streak: data.duolingo.streak || 0 }
      : null,
  };
};
