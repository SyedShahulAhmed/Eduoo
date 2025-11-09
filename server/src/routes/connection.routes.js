import express from "express";
import githubRoutes from "./connections/github.routes.js";
import leetcodeRoutes from "./connections/leetcode.routes.js";
import spotifyRoutes from "./connections/spotify.routes.js";
import notionRoutes from "./connections/notion.routes.js";
import codechefRoutes from "./connections/codechef.routes.js";
import googleCalendarRoutes from "./connections/googleCalendar.routes.js";
import googleDriveRoutes from "./connections/googleDrive.routes.js";
import googleTasksRoutes from "./connections/googleTasks.routes.js";
import googleFitRoutes from "./connections/googleFit.routes.js";
import gmailRoutes from "./connections/gmail.routes.js";
import youtubeRoutes from "./connections/youtube.routes.js";
import courseraRoutes from "./connections/coursera.routes.js";
import udemyRoutes from "./connections/udemy.routes.js";
import duolingoRoutes from "./connections/duolingo.routes.js";
import hackerrankRoutes from "./connections/hackerrank.routes.js";
import discordRoutes from "./connections/discord.routes.js";
import codeforcesRoutes from "./connections/codeforces.routes.js"
// import userProfileRoutes from "./connections/userProfile.routes.js";

const router = express.Router();

// ============================ 🧩 CONNECTION ROUTES ============================

// 1️⃣ LeetCode (Non-OAuth)
router.use("/leetcode", leetcodeRoutes);

// 2️⃣ GitHub (OAuth)
router.use("/github", githubRoutes);

// 3️⃣ Duolingo
router.use("/duolingo", duolingoRoutes);

// 4️⃣ Spotify
router.use("/spotify", spotifyRoutes);

// 5️⃣ HackerRank
router.use("/hackerrank", hackerrankRoutes);

// 6️⃣ CodeChef
router.use("/codechef", codechefRoutes);

// CodeForces

router.use("/codeforces", codeforcesRoutes)

// 7️⃣ Notion
router.use("/notion", notionRoutes);

// 8️⃣ Google Calendar
router.use("/google-calendar", googleCalendarRoutes);

// 9️⃣ Google Drive
router.use("/google-drive", googleDriveRoutes);

// 🔟 Google Tasks
router.use("/google-tasks", googleTasksRoutes);

// 11️⃣ Google Fit
router.use("/google-fit", googleFitRoutes);

// 12️⃣ Gmail
router.use("/gmail", gmailRoutes);

// 13️⃣ YouTube
router.use("/youtube", youtubeRoutes);

// 14️⃣ Coursera
router.use("/coursera", courseraRoutes);

// 15️⃣ Udemy
router.use("/udemy", udemyRoutes);

// 16️⃣ Discord
router.use("/discord", discordRoutes);

// 17️⃣ User Profile (internal)
// router.use("/profile", userProfileRoutes);

export default router;
