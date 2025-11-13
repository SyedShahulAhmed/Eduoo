// src/services/duolingo.service.js
import fetch from "node-fetch";
import { ENV } from "../config/env.js";

const safeNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "string") v = v.replace(/[^\d]/g, "");
  return Number(v) || 0;
};

const tryFetchJson = async (url, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    const text = await res.text();
    try {
      return { ok: res.ok, json: text ? JSON.parse(text) : null, status: res.status };
    } catch {
      return { ok: res.ok, json: null, status: res.status };
    }
  } catch (err) {
    clearTimeout(id);
    return { ok: false, error: err };
  }
};

export const fetchDuolingoProfile = async (username) => {
  try {
    const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;
    const r = await tryFetchJson(url, 9000);

    if (!r.ok || !r.json) throw new Error(`Duolingo user endpoint failed (status=${r.status})`);

    const user = r.json.users?.[0];
    if (!user) throw new Error("User not found in Duolingo JSON");

    // -----------------------------------------
    // PARSE COURSES
    // -----------------------------------------
    const courses = (user.courses || []).map((c) => ({
      language: c.title || c.name || c.locale || "Unknown",
      xp: safeNum(c.xp || c.points || c.totalXp || 0),
      level: c.level ?? null,
      crowns: c.crowns ?? null,
    }));

    const apiTotalXp = safeNum(user.totalXp ?? user.total_xp ?? 0);
    const sumCoursesXp = courses.reduce((acc, c) => acc + (c.xp || 0), 0);
    const totalXp = Math.max(apiTotalXp, sumCoursesXp);

    // -----------------------------------------
    // TODAY XP / LAST ACTIVITY
    // -----------------------------------------
    let todayXp = 0;
    let todayDone = false;
    let lastActivity = null;

    const todayDate = new Date().toISOString().slice(0, 10);

    // XP calendar structure (present in many accounts)
    const xpCalendar = user.xpGains || user.weeklyXp || user.calendar || [];

    if (Array.isArray(xpCalendar)) {
      // Each xp gain has something like { xp: number, date: "2025-11-13" }
      for (const entry of xpCalendar) {
        const date = entry?.date?.slice(0, 10);
        if (date) {
          if (date === todayDate) {
            todayXp += safeNum(entry.xp);
          }
          if (!lastActivity || date > lastActivity) {
            lastActivity = date;
          }
        }
      }
    }

    todayDone = todayXp > 0;

    // -----------------------------------------
    // JOINED DATE FIX
    // -----------------------------------------
    let joined = user.creationDate ?? user.joinedAt ?? user.created_at ?? null;
    if (joined && typeof joined === "number") {
      joined = new Date(joined < 1e12 ? joined * 1000 : joined).toISOString();
    }

    // -----------------------------------------
    // RESULT JSON
    // -----------------------------------------
    return {
      username: user.username ?? username,
      streak: user.site_streak ?? user.streak ?? 0,
      totalXp,
      todayXp,
      todayDone,
      lastActivity,
      languages: courses,
      avatarUrl: user.picture || null,
      joined,
      source: "duolingo-2017-06-30",
      raw: user,
    };
  } catch (err) {
    console.error("❌ Duolingo fetch failed:", err.message || err);
    throw new Error("Failed to fetch Duolingo profile");
  }
};
