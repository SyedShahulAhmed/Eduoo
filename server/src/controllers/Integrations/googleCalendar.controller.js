// src/controllers/connections/googleCalendar.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";
import { fetchGoogleCalendarList } from "../../services/googleCalendar.service.js";

/**
 * 1️⃣ Redirect user to Google OAuth (Calendar)
 */
export const connectGoogleCalendar = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    const redirectUri = `${ENV.SERVER_URL}/api/connections/google-calendar/callback?token=${token}`;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${ENV.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent`;

    return res.redirect(authUrl);
  } catch (err) {
    console.error("❌ connectGoogleCalendar Error:", err);
    res.status(500).json({ message: "Google Calendar connect failed", error: err.message });
  }
};

/**
 * 2️⃣ Handle OAuth callback
 */
export const googleCalendarCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code) return res.status(400).json({ message: "Missing Google code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const body = new URLSearchParams({
      code,
      client_id: ENV.GOOGLE_CLIENT_ID,
      client_secret: ENV.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/google-calendar/callback`,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token)
      return res.status(400).json({ message: "Failed to get Google tokens", raw: tokenData });

    await Connection.findOneAndUpdate(
      { userId, platform: "google_calendar" },
      {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        connected: true,
        lastSync: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Google Calendar connected for user ${userId}`);
    res.status(200).json({ message: "Google Calendar connected successfully ✅" });
  } catch (err) {
    console.error("❌ googleCalendarCallback Error:", err);
    res.status(500).json({ message: "Google Calendar callback failed", error: err.message });
  }
};

/**
 * 3️⃣ Disconnect Google Calendar
 */
export const disconnectGoogleCalendar = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "google_calendar" },
      { connected: false, accessToken: null, refreshToken: null }
    );
    res.status(200).json({ message: "Google Calendar disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectGoogleCalendar Error:", err);
    res.status(500).json({ message: "Failed to disconnect Google Calendar", error: err.message });
  }
};

/**
 * 4️⃣ Check connection status
 */
export const checkGoogleCalendarConnection = async (req, res) => {
  try {
    const conn = await Connection.findOne({ userId: req.user.id, platform: "google_calendar" });
    if (!conn || !conn.connected) {
      return res.status(200).json({ connected: false, message: "Google Calendar not connected" });
    }

    // Validate access by fetching calendar list
    try {
      const list = await fetchGoogleCalendarList(conn.accessToken);
      res.status(200).json({
        connected: true,
        lastSync: conn.lastSync,
        calendarCount: list?.length || 0,
        message: "✅ Google Calendar connected",
      });
    } catch {
      res.status(200).json({ connected: false, message: "Access token expired or invalid" });
    }
  } catch (err) {
    console.error("❌ checkGoogleCalendarConnection Error:", err);
    res.status(500).json({ message: "Failed to check Google Calendar connection", error: err.message });
  }
};
