import fetch from "node-fetch";

export const fetchGitHubData = async (accessToken) => {
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    const userRes = await fetch("https://api.github.com/user", { headers });
    const user = await userRes.json();

    const repoRes = await fetch("https://api.github.com/user/repos?per_page=100", { headers });
    const repos = await repoRes.json();

    const eventsRes = await fetch(`https://api.github.com/users/${user.login}/events`, { headers });
    const events = await eventsRes.json();
    const commitEvents = events.filter((e) => e.type === "PushEvent");
    const recentCommits = commitEvents.length;

    // Collect top languages
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

    return {
      username: user.login,
      publicRepos: user.public_repos,
      followers: user.followers,
      recentCommits,
      topLanguages: sortedLangs.slice(0, 3),
      profileUrl: user.html_url,
      avatarUrl: user.avatar_url,
    };
  } catch (err) {
    console.error("❌ GitHub API Error:", err.message);
    throw new Error("Failed to fetch GitHub data");
  }
};
