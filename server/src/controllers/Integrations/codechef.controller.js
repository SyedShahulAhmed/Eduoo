import Connection from "../../models/Connection.js";

/** 🧩 Connect CodeChef — Save username from frontend */
export const connectCodechef = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username)
      return res.status(400).json({ message: "CodeChef username is required" });

    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "codechef" },
      {
        connected: true,
        accessToken: username,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: "CodeChef connected successfully ✅",
      username,
    });
  } catch (error) {
    res.status(500).json({
      message: "CodeChef connect failed",
      error: error.message,
    });
  }
};

/** 🔌 Disconnect CodeChef */
export const disconnectCodechef = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "codechef" },
      { connected: false, accessToken: null }
    );
    res.status(200).json({ message: "CodeChef disconnected successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to disconnect CodeChef",
      error: error.message,
    });
  }
};

/** ✅ Check CodeChef connection */
export const checkCodechefConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codechef",
    });

    if (!connection || !connection.connected)
      return res.status(200).json({
        connected: false,
        message: "CodeChef not connected",
      });

    res.status(200).json({
      connected: true,
      username: connection.accessToken,
      lastSync: connection.lastSync,
      message: "CodeChef connected ✅",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error checking CodeChef connection",
      error: error.message,
    });
  }
};
