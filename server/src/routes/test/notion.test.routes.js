import express from "express";
import Connection from "../../models/Connection.js";
import {
  syncPendingGoalsForUser,
  createDailyDashboardRow,
  createWeeklyReportSubpage
} from "../../services/notion.service.js";

import {
  getDailyAggregatesForUser,
  getWeeklyAggregatesForUser
} from "../../services/aggregates.service.js";

const router = express.Router();

// 1️⃣ Test pending goals sync
router.post("/test/sync-goals", async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
      connected: true,
    });

    if (!conn) return res.status(400).json({ message: "Notion not connected" });

    const results = await syncPendingGoalsForUser(conn);

    res.json({
      message: "Manual goal sync complete",
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2️⃣ Test daily dashboard
router.post("/test/daily-dashboard", async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
    });

    const row = await getDailyAggregatesForUser(req.user.id, new Date());
    const result = await createDailyDashboardRow(conn, row);

    res.json({
      message: "Daily dashboard row created",
      row,
      result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3️⃣ Test weekly report
router.post("/test/weekly-report", async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "notion",
    });

    const { startDate, endDate, metrics, summaryText } =
      await getWeeklyAggregatesForUser(req.user.id);

    const result = await createWeeklyReportSubpage(conn, {
      startDate,
      endDate,
      metrics,
      summaryText,
    });

    res.json({
      message: "Weekly report created",
      result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
