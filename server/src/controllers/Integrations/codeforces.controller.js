import Connection from "../../models/Connection.js";

/** 1️⃣ Connect (store username input) */
export const connectCodeforces = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Codeforces username is required" });

    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "codeforces" },
      {
        connected: true,
        accessToken: username, // storing username in place of accessToken for simplicity
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Codeforces connected successfully ✅", username });
  } catch (error) {
    console.error("❌ connectCodeforces Error:", error);
    res.status(500).json({ message: "Codeforces connect failed", error: error.message });
  }
};

/** 2️⃣ Disconnect Codeforces */
export const disconnectCodeforces = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "codeforces" },
      { connected: false, accessToken: null }
    );
    res.status(200).json({ message: "Codeforces disconnected successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to disconnect Codeforces", error: error.message });
  }
};

/** 3️⃣ Check connection status */
export const checkCodeforcesConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "codeforces",
    });

    if (!connection || !connection.connected)
      return res.status(200).json({ connected: false, message: "Not connected" });

    res.status(200).json({
      connected: true,
      username: connection.accessToken,
      lastSync: connection.lastSync,
      message: "Codeforces connected ✅",
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking connection", error: error.message });
  }
};
