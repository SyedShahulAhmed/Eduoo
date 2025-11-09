// src/controllers/connections/hackerrank.controller.js
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";


/**
 * POST /api/connections/hackerrank/connect
 * Body: { username: "your_hackerrank_username" }
 */
export const connectHackerRank = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: "HackerRank username is required" });
    }

    let connection = await Connection.findOne({
      userId: req.user.id,
      platform: "hackerrank",
    });

    if (connection) {
      // update existing
      connection.connected = true;
      connection.profileId = username; // ✅ this line saves your username
      await connection.save();
    } else {
      // create new
      connection = await Connection.create({
        userId: req.user.id,
        platform: "hackerrank",
        connected: true,
        profileId: username, // ✅ this line ensures field is saved
      });
    }

    res.status(200).json({
      message: "✅ HackerRank connected successfully",
      username,
    });
  } catch (error) {
    console.error("❌ HackerRank Connect Error:", error);
    res.status(500).json({
      message: "Failed to connect HackerRank",
      error: error.message,
    });
  }
};

/** 2️⃣ Disconnect HackerRank */
export const disconnectHackerRank = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "hackerrank" },
      { connected: false, username: null, lastSync: null }
    );
    res.status(200).json({ message: "✅ HackerRank disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectHackerRank Error:", err);
    res.status(500).json({ message: "Failed to disconnect HackerRank", error: err.message });
  }
};

/** 3️⃣ Check connection status */
export const checkHackerRankConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "hackerrank",
    });

    if (!connection || !connection.connected) {
      return res.status(200).json({ connected: false, message: "HackerRank not connected" });
    }

    res.status(200).json({
      connected: true,
      username: connection.username,
      lastSync: connection.lastSync,
      message: "✅ HackerRank connected",
    });
  } catch (error) {
    console.error("❌ checkHackerRankConnection Error:", error);
    res.status(500).json({ message: "Failed to check HackerRank connection", error: error.message });
  }
};


