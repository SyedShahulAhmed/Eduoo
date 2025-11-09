import fetch from "node-fetch";
import * as cheerio from "cheerio";

export const fetchCodechefData = async (username) => {
  try {
    const res = await fetch(`https://www.codechef.com/users/${username}`);
    if (!res.ok) throw new Error("Profile not found");

    const html = await res.text();
    const $ = cheerio.load(html);

    const name = $(".user-name").text().trim() || username;
    const stars = $(".rating").first().text().trim() || "Unrated";
    const rating = $(".rating-number").first().text().trim() || "0";
    const highestRating = $(".rating-header small").text().replace(/[()]/g, "").trim() || "N/A";

    const ranks = $(".rating-ranks ul li");
    const globalRank = $(ranks[0]).find("strong").text().trim() || "N/A";
    const countryRank = $(ranks[1]).find("strong").text().trim() || "N/A";

    const solvedSection = $(".problems-solved").first().text();
    const problemsSolved = solvedSection.match(/\d+/g)?.[0] || "0";

    return {
      username,
      name,
      stars,
      rating,
      highestRating,
      globalRank,
      countryRank,
      problemsSolved,
      profileUrl: `https://www.codechef.com/users/${username}`,
    };
  } catch (err) {
    console.error("❌ CodeChef scrape failed:", err.message);
    throw new Error("Failed to fetch CodeChef profile");
  }
};
