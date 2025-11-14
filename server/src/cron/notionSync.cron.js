// src/crons/notion.cron.js
import cron from "node-cron";
import Connection from "../models/Connection.js";
import { syncPendingGoalsForUser, createDailyDashboardRow, createWeeklyReportSubpage } from "../services/notion.service.js";
import { getDailyAggregatesForUser, getWeeklyAggregatesForUser } from "../services/aggregates.service.js"; // create small helper (see below)
import { ENV } from "../config/env.js";

/**
 * Scheduled sync for Notion:
 * - runs every 10 minutes to push pending goals
 * - runs every day at 01:05 UTC to push daily dashboard rows
 * - runs every Sunday at 06:00 UTC to create weekly report subpage
 *
 * Adjust cron schedule to your timezone (server timezone vs UTC).
 */

// Every 10 minutes to sync pending goals
cron.schedule("*/10 * * * *", async () => {
  try {
    const conns = await Connection.find({ platform: "notion", connected: true });
    for (const conn of conns) {
      try {
        await syncPendingGoalsForUser(conn);
      } catch (err) {
        console.error("Cron sync pending goals error:", err.message);
      }
    }
  } catch (err) {
    console.error("Notion cron (pending) error:", err.message);
  }
});

// Daily dashboard at 01:05 UTC (adjust as needed)
cron.schedule("5 1 * * *", async () => {
  try {
    const conns = await Connection.find({ platform: "notion", connected: true });
    for (const conn of conns) {
      try {
        // getDailyAggregatesForUser should return { commits, leetcode, spotifyMinutes, notes }
        const row = await getDailyAggregatesForUser(conn.userId, new Date()); 
        await createDailyDashboardRow(conn, row);
      } catch (err) {
        console.error("Notion cron (daily dashboard) error:", err.message);
      }
    }
  } catch (err) {
    console.error("Notion cron (daily) top-level error:", err.message);
  }
});

// Weekly report: Sunday 06:00 UTC
cron.schedule("0 6 * * SUN", async () => {
  try {
    const conns = await Connection.find({ platform: "notion", connected: true });
    for (const conn of conns) {
      try {
        const { startDate, endDate, metrics, summaryText } = await getWeeklyAggregatesForUser(conn.userId);
        await createWeeklyReportSubpage(conn, { startDate, endDate, metrics, summaryText });
      } catch (err) {
        console.error("Notion cron (weekly) error:", err.message);
      }
    }
  } catch (err) {
    console.error("Notion cron (weekly) top-level error:", err.message);
  }
});
