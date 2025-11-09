// src/services/hackerrank.puppeteer.js
import puppeteer from "puppeteer";

let browser = null;
const CACHE = new Map();
const TTL = 1000 * 60 * 3; // 3 minutes

async function getBrowser() {
  if (browser) return browser;
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browser;
}

export const fetchHackerRankProfile = async (username) => {
  const key = `hr:${username}`;
  const cached = CACHE.get(key);
  if (cached && (Date.now() - cached.ts) < TTL) return cached.val;

  const url = `https://www.hackerrank.com/profile/${encodeURIComponent(username)}`;
  let page;
  try {
    const b = await getBrowser();
    page = await b.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 25000 });

    // Wait a bit for dynamic content
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const q = s => document.querySelector(s)?.textContent?.trim() || null;

      // selectors — may need adjustments if HackerRank changes DOM
      const score = q("[data-attr1='profile-score']") || q(".profile-score") || q(".score");
      const rank = q("[data-attr1='profile-rank']") || q(".profile-rank") || q(".rank");
      const badges = Array.from(document.querySelectorAll(".hacker-badge img, .badge img")).map(i => i.alt || i.title || i.src).filter(Boolean);
      const langs = Array.from(document.querySelectorAll("[data-analytics='languages_used'] li, .languages-list li")).map(i => i.textContent.trim()).filter(Boolean);

      return { score, rank, badges, langs };
    });

    const score = parseInt((result.score || "0").replace(/\D/g, "")) || 0;
    const overallRank = result.rank ? parseInt(result.rank.replace(/\D/g, "")) : null;

    const normalized = {
      username,
      score,
      overallRank,
      badges: result.badges || [],
      languages: result.langs || [],
      source: "puppeteer",
    };

    CACHE.set(key, { ts: Date.now(), val: normalized });
    if (page) await page.close();
    return normalized;
  } catch (err) {
    if (page) try { await page.close(); } catch(e) {}
    console.error("puppeteer fetch error:", err.message);
    return { username, score:0, overallRank:null, badges:[], languages:[], source:"puppeteer-error", note: err.message };
  }
};

// optional: close browser on process exit
process.on("exit", async () => { if (browser) try { await browser.close(); } catch{} });
