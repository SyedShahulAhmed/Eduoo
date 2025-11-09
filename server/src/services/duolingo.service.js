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
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "AICOO/1.0" } });
    clearTimeout(id);
    const text = await res.text();
    try { return { ok: res.ok, json: text ? JSON.parse(text) : null, status: res.status, text }; }
    catch { return { ok: res.ok, json: null, status: res.status, text }; }
  } catch (err) {
    clearTimeout(id);
    return { ok: false, error: err };
  }
};

/**
 * Optionally uses Puppeteer to render the profile page and scrape the exact
 * "Total XP" value shown on the UI. Puppeteer is optional and controlled by
 * ENV.DUO_USE_PUPPETEER = "true".
 */
const fetchUiTotalXpWithPuppeteer = async (username) => {
  // lazy import to avoid forcing puppeteer on everyone
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ headless: true, args: ["--no-sandbox","--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (AICOO)");
    const url = `https://www.duolingo.com/profile/${encodeURIComponent(username)}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 25000 });
    // wait a bit for UI to finish rendering
    await page.waitForTimeout(1000);

    // Try to find the visible "Total XP" number by looking for labels or the large tile
    const uiNumber = await page.evaluate(() => {
      const textFinder = (label) => {
        const el = Array.from(document.querySelectorAll("div, span, p")).find(n => n.textContent && n.textContent.trim().toLowerCase().includes(label));
        if (!el) return null;
        // find numeric sibling or nearby node
        // search next siblings and parent for numbers
        const parent = el.parentElement || el;
        const candidates = Array.from(parent.querySelectorAll("*")).map(n => n.textContent.trim()).join(" ");
        // pick first large number in that text
        const m = candidates.match(/[\d,]{2,}/);
        return m ? m[0].replace(/,/g,'') : null;
      };

      // common labels to look for
      const candidates = [
        textFinder("total xp"),
        textFinder("totalxp"),
        textFinder("total xp:"),
        // fallback: large numeric tiles on profile page
        (() => {
          const bigNumbers = Array.from(document.querySelectorAll("div,span")).map(n => n.textContent.trim()).filter(Boolean);
          // find numbers longer than 3 digits and return the largest
          const nums = bigNumbers.map(t => (t.match(/[\d,]+/g) || []).map(x => Number(x.replace(/,/g,"")))).flat();
          if (!nums.length) return null;
          return String(Math.max(...nums));
        })()
      ];
      return candidates.find(Boolean) || null;
    });

    await page.close();
    await browser.close();
    return uiNumber ? Number(uiNumber) : null;
  } catch (err) {
    console.warn("Puppeteer fetch UI total XP failed:", err?.message || err);
    return null;
  }
};

/**
 * Main exporter: Try official JSON endpoint, build totals, optionally try Puppeteer
 */
export const fetchDuolingoProfile = async (username) => {
  try {
    // 1) Primary JSON endpoint used by Duolingo frontend
    const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;
    const r = await tryFetchJson(url, 9000);
    if (!r.ok || !r.json) throw new Error(`Duolingo user endpoint failed (status=${r.status})`);

    const user = r.json.users?.[0];
    if (!user) throw new Error("User not found in Duolingo JSON");

    // Robust per-course mapping
    const courses = (user.courses || []).map((c) => ({
      language: c.title || c.name || c.locale || "Unknown",
      level: c.level ?? c.proficiency ?? null,
      xp: safeNum(c.xp || c.points || c.totalXp || 0),
      crowns: c.crowns ?? null,
    }));

    // totalXp: prefer explicit top-level value, else sum per-course xp
    const apiTotal = safeNum(user.totalXp ?? user.total_xp ?? user.total_xp_points ?? 0);
    const sumCourses = courses.reduce((s, c) => s + (c.xp || 0), 0);
    const computedTotal = Math.max(apiTotal, sumCourses);

    // joined iso conversion
    let joined = user.creationDate ?? user.joinedAt ?? user.created_at ?? null;
    if (joined && typeof joined === "number") joined = new Date(joined < 1e12 ? joined * 1000 : joined).toISOString();

    // prepare result
    const result = {
      username: user.username ?? username,
      streak: Number(user.site_streak ?? user.streak ?? 0),
      totalXp: computedTotal,
      apiTotalXp: apiTotal,
      languages: courses,
      avatarUrl: (user.picture || user.avatar || "")?.startsWith("//") ? `https:${user.picture || user.avatar}` : (user.picture || user.avatar || null),
      joined,
      league: user.league ?? user.currentLeague ?? null,
      followers: user.followersCount ?? user.num_followers ?? null,
      following: user.followingCount ?? user.num_following ?? null,
      raw: user,
      source: "duolingo-2017-06-30",
    };

    // 2) Optionally try Puppeteer to read exact UI "Total XP" if enabled
    if (ENV.DUO_USE_PUPPETEER === "true") {
      try {
        const uiTotal = await fetchUiTotalXpWithPuppeteer(username);
        if (uiTotal && uiTotal > 0) {
          result.uiTotalXp = uiTotal;
        }
      } catch (err) {
        // non-fatal — keep API-based result
        console.warn("Puppeteer fallback failed:", err?.message || err);
      }
    }

    return result;
  } catch (err) {
    console.error("❌ Duolingo fetch failed:", err.message || err);
    throw new Error("Failed to fetch Duolingo profile");
  }
};
