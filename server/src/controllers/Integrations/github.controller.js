import fetch from "node-fetch";
import jwt from "jsonwebtoken"
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";

/** 1️⃣ Redirect user to GitHub OAuth */
export const connectGitHub = async (req, res) => {
  try {
    // Support token via query param for browser-based testing
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    // Decode JWT to get user (no need for authMiddleware here during connect)
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${ENV.GITHUB_CLIENT_ID}&scope=repo,user&redirect_uri=${ENV.SERVER_URL}/api/connections/github/callback?token=${token}`;

    return res.redirect(githubAuthUrl);
  } catch (error) {
    console.error("❌ connectGitHub Error:", error);
    res
      .status(500)
      .json({ message: "GitHub connect failed", error: error.message });
  }
};

/** 2️⃣ Handle GitHub OAuth callback */
export const githubCallback = async (req, res) => {
  try {
    const { code, token } = req.query;

    if (!code) return res.status(400).json({ message: "Missing GitHub code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    // ✅ Decode user token
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    // ✅ Exchange code for GitHub access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: ENV.GITHUB_CLIENT_ID,
        client_secret: ENV.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken)
      return res.status(400).json({ message: "Failed to get access token" });

    // ✅ Save connection info
    await Connection.findOneAndUpdate(
      { userId, platform: "github" },
      { accessToken, connected: true, lastSync: new Date() },
      { upsert: true, new: true }
    );

    console.log(`✅ GitHub connected for user: ${userId}`);
    return res.status(200).json({ message: "GitHub connected successfully ✅" });
  } catch (err) {
    console.error("❌ GitHub OAuth Error:", err);
    res
      .status(500)
      .json({ message: "GitHub connection failed", error: err.message });
  }
};
/** 3️⃣ Disconnect GitHub */
export const disconnectGitHub = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "github" },
      { connected: false, accessToken: null }
    );
    res.status(200).json({ message: "GitHub disconnected successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to disconnect GitHub", error: err.message });
  }
};

export const checkGitHubConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "github",
    });

    if (!connection || !connection.connected) {
      return res
        .status(200)
        .json({ connected: false, message: "GitHub not connected" });
    }

    res.status(200).json({
      connected: true,
      lastSync: connection.lastSync,
      message: "GitHub connected ✅",
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      message: "Error checking GitHub connection",
      error: error.message,
    });
  }
};
