// src/controllers/connections/coursera.controller.js
import Connection from "../../models/Connection.js";

/**
 * Connect Coursera via CAUTH cookie token
 */
export const connectCoursera = async (req, res) => {
  try {
    const { courseraToken } = req.body;
    if (!courseraToken)
      return res.status(400).json({ message: "Coursera token (CAUTH) required" });

    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "coursera" },
      {
        accessToken: courseraToken,
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "✅ Coursera connected successfully" });
  } catch (err) {
    console.error("❌ connectCoursera Error:", err);
    res.status(500).json({ message: "Failed to connect Coursera", error: err.message });
  }
};

/**
 * Disconnect Coursera
 */
export const disconnectCoursera = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "coursera" },
      { connected: false, accessToken: null }
    );
    res.status(200).json({ message: "Coursera disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectCoursera Error:", err);
    res.status(500).json({ message: "Failed to disconnect Coursera", error: err.message });
  }
};

/**
 * Check connection status
 */
export const checkCourseraConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "coursera" });
    if (!conn || !conn.connected)
      return res.status(200).json({ connected: false, message: "Coursera not connected" });

    res.status(200).json({
      connected: true,
      lastSync: conn.lastSync,
      message: "Coursera connected ✅",
    });
  } catch (err) {
    console.error("❌ checkCourseraConnection Error:", err);
    res.status(500).json({ message: "Failed to check Coursera connection", error: err.message });
  }
};
