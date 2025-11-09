import Connection from "../../models/Connection.js";

/**
 * POST /api/connections/udemy/connect
 * Body: { sessionToken: "your_udemy_access_token" }
 */
export const connectUdemy = async (req, res) => {
  try {
    const { sessionToken } = req.body;
    if (!sessionToken)
      return res.status(400).json({ message: "Udemy session token required" });

    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "udemy" },
      { connected: true, accessToken: sessionToken, lastSync: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "✅ Udemy connected successfully" });
  } catch (err) {
    console.error("❌ connectUdemy Error:", err);
    res.status(500).json({ message: "Failed to connect Udemy", error: err.message });
  }
};

/** GET /api/connections/udemy/status */
export const checkUdemyConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "udemy",
    });

    if (!connection || !connection.connected) {
      return res.status(200).json({ connected: false, message: "Udemy not connected" });
    }

    res.status(200).json({
      connected: true,
      lastSync: connection.lastSync,
      message: "✅ Udemy connected",
    });
  } catch (err) {
    console.error("❌ getUdemyStatus Error:", err);
    res.status(500).json({ message: "Failed to check Udemy status", error: err.message });
  }
};

/** DELETE /api/connections/udemy/disconnect */
export const disconnectUdemy = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "udemy" },
      { connected: false, accessToken: null, lastSync: null }
    );
    res.status(200).json({ message: "✅ Udemy disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectUdemy Error:", err);
    res.status(500).json({ message: "Failed to disconnect Udemy", error: err.message });
  }
};
