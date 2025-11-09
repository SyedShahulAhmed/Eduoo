// src/controllers/reports/gmail.report.js
import Connection from "../../models/Connection.js";
import { sendGmailSummary } from "../../services/gmail.service.js";

/** Generate weekly summary email report */
export const generateGmailReport = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "gmail" });
    if (!conn?.accessToken) return res.status(400).json({ message: "Gmail not connected" });

    // Example: craft a simple summary (this could call other services + AI)
    const subject = "Your weekly AICOO summary";
    const body = `Hello — here’s your weekly summary from AICOO.\n\nKeep pushing your goals!`;

    await sendGmailSummary(req.user.id, req.user.email, subject, body);

    res.status(200).json({ message: "Summary email sent successfully" });
  } catch (err) {
    console.error("❌ generateGmailReport Error:", err);
    res.status(500).json({ message: "Failed to send Gmail summary", error: err.message });
  }
};
