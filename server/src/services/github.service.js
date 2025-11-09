import fetch from "node-fetch";

export const fetchGitHubData = async (accessToken) => {
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    // 1️⃣ Basic profile
    const userRes = await fetch("https://api.github.com/user", { headers });
    const user = await userRes.json();

    // 2️⃣ Repositories
    const repoRes = await fetch("https://api.github.com/user/repos?per_page=100&type=owner", { headers });
    const repos = await repoRes.json();

    // 3️⃣ Recent public events (commits, pushes, etc.)
    const eventsRes = await fetch(`https://api.github.com/users/${user.login}/events`, { headers });
    const events = await eventsRes.json();
    const commitEvents = events.filter((e) => e.type === "PushEvent");

    // Extract commit timestamps
    const commitDates = commitEvents.map((e) => new Date(e.created_at).toISOString().split("T")[0]);
    const uniqueDates = [...new Set(commitDates)].sort();

    // 4️⃣ Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let lastCommitDate = null;

    // Helper to check consecutive days
    const isNextDay = (prev, curr) => {
      const diff = (new Date(curr) - new Date(prev)) / (1000 * 60 * 60 * 24);
      return diff === 1;
    };

    for (let i = 0; i < uniqueDates.length; i++) {
      if (lastCommitDate && isNextDay(lastCommitDate, uniqueDates[i])) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      lastCommitDate = uniqueDates[i];
    }

    // 5️⃣ Commits in last 30 days
    const now = new Date();
    const last30 = new Date(now.setDate(now.getDate() - 30));
    const recentCommits = commitDates.filter((d) => new Date(d) >= last30).length;

    // 6️⃣ Collect top languages
    const languages = {};
    for (const repo of repos.slice(0, 10)) {
      const langRes = await fetch(repo.languages_url, { headers });
      const langs = await langRes.json();
      Object.keys(langs).forEach((lang) => {
        languages[lang] = (languages[lang] || 0) + langs[lang];
      });
    }

    const sortedLangs = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .map(([l]) => l);

    // 7️⃣ Build full response JSON
    return {
      username: user.login,
      profileUrl: user.html_url,
      avatarUrl: user.avatar_url,
      followers: user.followers,
      publicRepos: user.public_repos,
      recentCommits,
      commitStreak: {
        current: currentStreak,
        longest: longestStreak,
        totalCommitDays: uniqueDates.length,
      },
      topLanguages: sortedLangs.slice(0, 5),
      recentActivity: commitDates.slice(-10).reverse(), // last 10 commit days
    };
  } catch (err) {
    console.error("❌ GitHub API Error:", err.message);
    throw new Error("Failed to fetch GitHub data");
  }
};
