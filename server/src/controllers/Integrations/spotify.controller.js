import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";

/** 1️⃣ Redirect user to Spotify OAuth */
export const connectSpotify = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token)
      return res.status(401).json({ message: "Authorization token missing" });

    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?client_id=${ENV.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${ENV.SERVER_URL}/api/connections/spotify/callback?token=${token}&scope=user-read-recently-played%20user-read-playback-state%20playlist-read-private`;

    return res.redirect(spotifyAuthUrl);
  } catch (error) {
    console.error("❌ connectSpotify Error:", error);
    res
      .status(500)
      .json({ message: "Spotify connect failed", error: error.message });
  }
};

/** 2️⃣ Spotify OAuth callback */
export const spotifyCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code || !token)
      return res.status(400).json({ message: "Missing code or token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${ENV.SPOTIFY_CLIENT_ID}:${ENV.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${ENV.SERVER_URL}/api/connections/spotify/callback?token=${token}`,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken)
      return res
        .status(400)
        .json({ message: "Failed to get Spotify access token" });

    await Connection.findOneAndUpdate(
      { userId, platform: "spotify" },
      { accessToken, connected: true, lastSync: new Date() },
      { upsert: true, new: true }
    );

    console.log(`✅ Spotify connected for user: ${userId}`);
    res.status(200).json({ message: "Spotify connected successfully ✅" });
  } catch (err) {
    console.error("❌ Spotify OAuth Error:", err);
    res
      .status(500)
      .json({ message: "Spotify connection failed", error: err.message });
  }
};

/** 3️⃣ Disconnect Spotify */
export const disconnectSpotify = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "spotify" },
      { connected: false, accessToken: null }
    );
    res.status(200).json({ message: "Spotify disconnected successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to disconnect Spotify", error: err.message });
  }
};

/** 4️⃣ Check connection status */
export const checkSpotifyConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      userId: req.user.id,
      platform: "spotify",
    });
    if (!connection || !connection.connected)
      return res.status(200).json({ connected: false });
    res.status(200).json({ connected: true, lastSync: connection.lastSync });
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Error checking Spotify connection",
        error: err.message,
      });
  }
};
