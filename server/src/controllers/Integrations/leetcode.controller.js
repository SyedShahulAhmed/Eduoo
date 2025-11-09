import Connection from "../../models/Connection.js";

/**
 * POST /api/connections/leetcode/connect
 * Body: { username: "leetcode_username" }
 */
export const connectLeetCode = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username)
      return res.status(400).json({ message: "LeetCode username is required" });

    // Check for existing connection
    let connection = await Connection.findOne({
      userId: req.user.id,
      platform: "leetcode",
    });

    if (connection) {
      connection.connected = true;
      connection.profileId = username;
      await connection.save();
    } else {
      connection = await Connection.create({
        userId: req.user.id,
        platform: "leetcode",
        connected: true,
        profileId: username,
      });
    }

    res.status(200).json({
      message: "✅ LeetCode connected successfully",
      platform: "LeetCode",
      username,
      connectedAt: new Date(),
    });
  } catch (error) {
    console.error("❌ LeetCode Connect Error:", error);
    res
      .status(500)
      .json({ message: "Failed to connect LeetCode", error: error.message });
  }
};

/**
 * GET /api/connections/leetcode/status
 */
export const getLeetCodeStatus = async (req, res) => {
  try {
    // Find LeetCode connection for this user
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "leetcode",
    }).lean(); // lean() makes it faster and returns plain object

    // If no connection record exists
    if (!conn) {
      return res.status(200).json({
        platform: "LeetCode",
        connected: false,
        username: null,
        message: "No LeetCode connection found",
      });
    }

    // If connection exists but not connected
    if (!conn.connected) {
      return res.status(200).json({
        platform: "LeetCode",
        connected: false,
        username: conn.profileId || null,
        message: "LeetCode is currently disconnected",
      });
    }

    // ✅ Connected state
    return res.status(200).json({
      platform: "LeetCode",
      connected: true,
      username: conn.profileId ? String(conn.profileId) : null,
      message: "LeetCode connection is active",
    });

  } catch (error) {
    console.error("❌ LeetCode Status Error:", error);
    return res.status(500).json({
      platform: "LeetCode",
      connected: false,
      username: null,
      message: "Failed to fetch LeetCode connection status",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/connections/leetcode/disconnect
 */
export const disconnectLeetCode = async (req, res) => {
  try {
    const conn = await Connection.findOne({
      userId: req.user.id,
      platform: "leetcode",
    });

    if (!conn)
      return res
        .status(404)
        .json({ message: "No active LeetCode connection found" });

    conn.connected = false;
    conn.profileId = null;
    await conn.save();

    res.status(200).json({
      message: "❎ LeetCode disconnected successfully",
      platform: "LeetCode",
      connected: false,
    });
  } catch (error) {
    console.error("❌ LeetCode Disconnect Error:", error);
    res
      .status(500)
      .json({ message: "Failed to disconnect LeetCode", error: error.message });
  }
};
