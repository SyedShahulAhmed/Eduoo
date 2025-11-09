import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchDuolingoProfile } from "../../services/duolingo.service.js";

/**
 * 1️⃣ Connect Duolingo — store username as profileId
 */
export const connectDuolingo = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Missing Duolingo username" });

    await Connection.findOneAndUpdate(
      { userId, platform: "duolingo" },
      { profileId: username, connected: true, lastSync: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "✅ Duolingo connected successfully", username });
  } catch (err) {
    console.error("❌ connectDuolingo Error:", err);
    res.status(500).json({ message: "Failed to connect Duolingo", error: err.message });
  }
};

/**
 * 2️⃣ Disconnect Duolingo
 */
export const disconnectDuolingo = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "duolingo" },
      { connected: false, profileId: null, lastSync: null }
    );
    res.status(200).json({ message: "✅ Duolingo disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectDuolingo Error:", err);
    res.status(500).json({ message: "Failed to disconnect Duolingo", error: err.message });
  }
};

/**
 * 3️⃣ Check connection status
 */
export const checkDuolingoConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "duolingo",
    });

    if (!connection || !connection.connected || !connection.profileId) {
      return res.status(200).json({ connected: false, message: "Duolingo not connected" });
    }

    res.status(200).json({
      connected: true,
      username: connection.profileId,
      lastSync: connection.lastSync,
      message: "✅ Duolingo connected",
    });
  } catch (err) {
    console.error("❌ checkDuolingoConnection Error:", err);
    res.status(500).json({
      message: "Failed to check Duolingo connection",
      error: err.message,
    });
  }
};
