// src/services/duolingo.service.js
import fetch from "node-fetch";

const safeNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "string") v = v.replace(/[^\d]/g, "");
  return Number(v) || 0;
};

const getJson = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AICOO",
        "Accept": "application/json",
      },
      timeout: 10000,
    });

    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, json: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, json: null };
    }
  } catch (err) {
    return { ok: false, status: 0, json: null, error: err.message };
  }
};

export const fetchDuolingoProfile = async (username) => {
  try {
    // MAIN ENDPOINT
    const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;
    const r = await getJson(url);

    if (!r.ok || !r.json || !r.json.users || !r.json.users.length) {
      return {
        error: true,
        message: "Duolingo API returned no data",
        username,
        streak: 0,
        totalXp: 0,
        todayXp: null,
        todayDone: null,
        lastActivity: null,
        languages: [],
      };
    }

    const user = r.json.users[0];

    // COURSES
    const courses = (user.courses || []).map((c) => ({
      language: c.title || c.name || "Unknown",
      level: c.level ?? null,
      xp: safeNum(c.xp || c.points || c.totalXp),
      crowns: c.crowns ?? null,
    }));

    const totalXp =
      safeNum(user.totalXp) ||
      courses.reduce((sum, c) => sum + (c.xp || 0), 0);

    // Extract possible XP history (NOT guaranteed)
    const xpHistory =
      user.xpGains ||
      user.calendar ||
      user.weeklyXp ||
      [];

    let todayXp = null;
    let todayDone = null;
    let lastActivity = null;

    if (Array.isArray(xpHistory) && xpHistory.length > 0) {
      const today = new Date().toISOString().slice(0, 10);

      todayXp = 0;

      for (const entry of xpHistory) {
        const date = entry.date?.slice(0, 10);
        if (!date) continue;

        if (date === today) {
          todayXp += safeNum(entry.xp);
        }

        if (!lastActivity || date > lastActivity) {
          lastActivity = date;
        }
      }

      todayDone = todayXp > 0;
    }

    return {
      username: user.username,
      streak: user.site_streak ?? user.streak ?? 0,
      totalXp,
      todayXp,
      todayDone,
      lastActivity,
      languages: courses,
      avatarUrl: user.picture,
    };
  } catch (err) {
    console.error("Duolingo Fetch Error:", err.message);
    return {
      error: true,
      message: "Internal error while fetching Duolingo",
      username,
      streak: 0,
      totalXp: 0,
      todayXp: null,
      todayDone: null,
      lastActivity: null,
      languages: [],
    };
  }
};
