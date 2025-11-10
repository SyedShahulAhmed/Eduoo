import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

// 🧠 Import AI Overview Report
import { getAllReports } from "../controllers/reports/overview.report.js";

// 🧩 Platform-specific Reports
import {
  getGitHubReport,
  getGitHubAIInsights,
  createGoalsFromGithubInsights,
} from "../controllers/reports/github.report.js";
import {
  createGoalsFromLeetCodeInsights,
  getLeetCodeAIInsights,
  getLeetCodeReport,
} from "../controllers/reports/leetcode.report.js";
import {
  getHackerRankReport,
  createGoalsFromHackerRankInsights,
  getHackerRankAIInsights,
} from "../controllers/reports/hackerrank.report.js";
import {
  createGoalsFromDuolingoInsights,
  getDuolingoAIInsights,
  getDuolingoReport,
} from "../controllers/reports/duolingo.report.js";
import {
  createGoalsFromUdemyInsights,
  getUdemyAIInsights,
  getUdemyReport,
} from "../controllers/reports/udemy.report.js";
import {
  createGoalsFromSpotifyInsights,
  getSpotifyAIInsights,
  getSpotifyReport,
} from "../controllers/reports/spotify.report.js";
import {
  createGoalsFromCodechefInsights,
  getCodechefAIInsights,
  getCodechefReport,
} from "../controllers/reports/codechef.report.js";

// import {
//   getNotionReport,
//   getNotionAIInsights,
//   createGoalsFromNotionInsights,
// } from "../controllers/reports/notion.report.js";

// import {
//   getGoogleCalendarReport,
//   getGoogleCalendarAIInsights,
//   createGoalsFromGoogleCalendarInsights,
// } from "../controllers/reports/googleCalendar.report.js";

// import {
//   getGoogleDriveReport,
//   getGoogleDriveAIInsights,
//   createGoalsFromGoogleDriveInsights,
// } from "../controllers/reports/googleDrive.report.js";

// import {
//   getGoogleTasksReport,
//   getGoogleTasksAIInsights,
//   createGoalsFromGoogleTasksInsights,
// } from "../controllers/reports/googleTasks.report.js";

// import {
//   getGoogleFitReport,
//   getGoogleFitAIInsights,
//   createGoalsFromGoogleFitInsights,
// } from "../controllers/reports/googleFit.report.js";

// import {
//   getGmailReport,
//   getGmailAIInsights,
//   createGoalsFromGmailInsights,
// } from "../controllers/reports/gmail.report.js";

// import {
//   getYouTubeReport,
//   getYouTubeAIInsights,
//   createGoalsFromYouTubeInsights,
// } from "../controllers/reports/youtube.report.js";

import {
  getCodeforcesReport,
  getCodeforcesAIInsights,
  createGoalsFromCodeforcesInsights,
} from "../controllers/reports/codeforces.report.js";
import { sendDailySummary } from "../controllers/reports/discord.report.js";

// import {
//   getLeetCodeReport,
//   getLeetCodeAIInsights,
//   createGoalsFromLeetCodeInsights,
// } from "../controllers/reports/leetcode.report.js";

// import {
//   getHackerRankReport,
//   getHackerRankAIInsights,
//   createGoalsFromHackerRankInsights,
// } from "../controllers/reports/hackerrank.report.js";

// import {
//   getCourseraReport,
//   getCourseraAIInsights,
//   createGoalsFromCourseraInsights,
// } from "../controllers/reports/coursera.report.js";

// import {
//   getDiscordReport,
//   getDiscordAIInsights,
//   createGoalsFromDiscordInsights,
// } from "../controllers/reports/discord.report.js";

const router = express.Router();

// ==================== 🌍 OVERVIEW REPORT ====================
router.get("/all", authMiddleware, getAllReports);

// ==================== 💻 GITHUB ====================
router.get("/github", authMiddleware, getGitHubReport);
router.get("/github/insights", authMiddleware, getGitHubAIInsights);
router.post("/github/goals", authMiddleware, createGoalsFromGithubInsights);

// // ==================== 🎧 SPOTIFY ====================
router.get("/spotify", authMiddleware, getSpotifyReport);
router.get("/spotify/insights", authMiddleware, getSpotifyAIInsights);
router.post("/spotify/goals", authMiddleware, createGoalsFromSpotifyInsights);

// // ==================== 🧱 NOTION ====================
// router.get("/notion", authMiddleware, getNotionReport);
// router.get("/notion/insights", authMiddleware, getNotionAIInsights);
// router.post("/notion/goals", authMiddleware, createGoalsFromNotionInsights);

// // ==================== 📅 GOOGLE CALENDAR ====================
// router.get("/google-calendar", authMiddleware, getGoogleCalendarReport);
// router.get(
//   "/google-calendar/insights",
//   authMiddleware,
//   getGoogleCalendarAIInsights
// );
// router.post(
//   "/google-calendar/goals",
//   authMiddleware,
//   createGoalsFromGoogleCalendarInsights
// );

// // ==================== 💾 GOOGLE DRIVE ====================
// router.get("/google-drive", authMiddleware, getGoogleDriveReport);
// router.get("/google-drive/insights", authMiddleware, getGoogleDriveAIInsights);
// router.post(
//   "/google-drive/goals",
//   authMiddleware,
//   createGoalsFromGoogleDriveInsights
// );

// // ==================== ✅ GOOGLE TASKS ====================
// router.get("/google-tasks", authMiddleware, getGoogleTasksReport);
// router.get("/google-tasks/insights", authMiddleware, getGoogleTasksAIInsights);
// router.post(
//   "/google-tasks/goals",
//   authMiddleware,
//   createGoalsFromGoogleTasksInsights
// );

// // ==================== ❤️ GOOGLE FIT ====================
// router.get("/google-fit", authMiddleware, getGoogleFitReport);
// router.get("/google-fit/insights", authMiddleware, getGoogleFitAIInsights);
// router.post(
//   "/google-fit/goals",
//   authMiddleware,
//   createGoalsFromGoogleFitInsights
// );

// // ==================== 📬 GMAIL ====================
// router.get("/gmail", authMiddleware, getGmailReport);
// router.get("/gmail/insights", authMiddleware, getGmailAIInsights);
// router.post("/gmail/goals", authMiddleware, createGoalsFromGmailInsights);

// // ==================== 🎥 YOUTUBE ====================
// router.get("/youtube", authMiddleware, getYouTubeReport);
// router.get("/youtube/insights", authMiddleware, getYouTubeAIInsights);
// router.post("/youtube/goals", authMiddleware, createGoalsFromYouTubeInsights);

// // ==================== 🏆 CODEFORCES ====================
router.get("/codeforces", authMiddleware, getCodeforcesReport);
router.get("/codeforces/insights", authMiddleware, getCodeforcesAIInsights);
router.post("/codeforces/goals", authMiddleware, createGoalsFromCodeforcesInsights);

// // ==================== 🏆 CODECHEF ====================
router.get("/codechef", authMiddleware, getCodechefReport);
router.get("/codechef/insights", authMiddleware, getCodechefAIInsights);
router.post("/codechef/goals", authMiddleware, createGoalsFromCodechefInsights);

// ==================== 💡 LEETCODE ====================
router.get("/leetcode", authMiddleware, getLeetCodeReport);
router.get("/leetcode/insights", authMiddleware, getLeetCodeAIInsights);
router.post("/leetcode/goals", authMiddleware, createGoalsFromLeetCodeInsights);

// ==================== 🧠 HACKERRANK ====================
router.get("/hackerrank", authMiddleware, getHackerRankReport);
router.get("/hackerrank/insights", authMiddleware, getHackerRankAIInsights);
router.post(
  "/hackerrank/goals",
  authMiddleware,
  createGoalsFromHackerRankInsights
);

// ==================== 🗣️ DUOLINGO ====================
router.get("/duolingo", authMiddleware, getDuolingoReport);
router.get("/duolingo/insights", authMiddleware, getDuolingoAIInsights);
router.post("/duolingo/goals", authMiddleware, createGoalsFromDuolingoInsights);

// // ==================== 🎓 COURSERA ====================
// router.get("/coursera", authMiddleware, getCourseraReport);
// router.get("/coursera/insights", authMiddleware, getCourseraAIInsights);
// router.post("/coursera/goals", authMiddleware, createGoalsFromCourseraInsights);

// ==================== 📘 UDEMY ====================
router.get("/udemy", authMiddleware, getUdemyReport);
router.get("/udemy/insights", authMiddleware, getUdemyAIInsights);
router.post("/udemy/goals", authMiddleware, createGoalsFromUdemyInsights);

// Send message or daily summary (only if connected)
router.post("/summary", authMiddleware, sendDailySummary);

export default router;
