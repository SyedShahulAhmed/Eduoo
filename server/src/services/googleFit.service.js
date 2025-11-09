// src/services/googleFit.service.js
import fetch from "node-fetch";
import Connection from "../models/Connection.js";
import { ENV } from "../config/env.js";

/** Refresh token helper */
export const refreshGoogleToken = async (connection) => {
  try {
    if (!connection?.refreshToken) throw new Error("No refresh token available");
    const body = new URLSearchParams({
      client_id: ENV.GOOGLE_CLIENT_ID,
      client_secret: ENV.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error("Failed to refresh Google token");

    connection.accessToken = data.access_token;
    if (data.expires_in) connection.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    await connection.save();
    return connection.accessToken;
  } catch (err) {
    console.error("❌ refreshGoogleToken Error:", err.message);
    throw err;
  }
};

/** Ensure access token for userId */
const ensureAccessToken = async (userId) => {
  const conn = await Connection.findOne({ userId, platform: "google_fit" });
  if (!conn) throw new Error("Google Fit connection not found");
  if (!conn.accessToken) throw new Error("No Google Fit access token");

  if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
    return await refreshGoogleToken(conn);
  }
  return conn.accessToken;
};

/** Helper: fetch aggregated steps for past N days */
export const fetchSteps = async (userId, days = 7) => {
  try {
    const accessToken = await ensureAccessToken(userId);
    const endMs = Date.now();
    const startMs = endMs - days * 24 * 60 * 60 * 1000;

    const body = {
      aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
      bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    };

    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Google Fit steps fetch failed: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const buckets = data.bucket || [];
    // map to daily steps
    return buckets.map((b) => {
      const ms = parseInt(b.startTimeMillis);
      const day = new Date(ms).toISOString().split("T")[0];
      const steps = (b.dataset || []).reduce((sum, ds) => {
        return sum + (ds.point || []).reduce((s2, p) => s2 + (p.value?.[0]?.intVal || 0), 0);
      }, 0);
      return { day, steps };
    });
  } catch (err) {
    console.error("❌ fetchSteps Error:", err.message);
    throw err;
  }
};

/** Fetch activity summary (active minutes) */
export const fetchActiveMinutes = async (userId, days = 7) => {
  try {
    const accessToken = await ensureAccessToken(userId);
    const endMs = Date.now();
    const startMs = endMs - days * 24 * 60 * 60 * 1000;

    const body = {
      aggregateBy: [{ dataTypeName: "com.google.active_minutes" }],
      bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    };

    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Google Fit activity fetch failed");
    const data = await res.json();
    const buckets = data.bucket || [];
    return buckets.map((b) => {
      const day = new Date(parseInt(b.startTimeMillis)).toISOString().split("T")[0];
      const minutes = (b.dataset || []).reduce((sum, ds) => {
        return sum + (ds.point || []).reduce((s2, p) => s2 + (p.value?.[0]?.intVal || 0), 0);
      }, 0);
      return { day, activeMinutes: minutes };
    });
  } catch (err) {
    console.error("❌ fetchActiveMinutes Error:", err.message);
    throw err;
  }
};

/** Fetch sleep segments (last N days) */
export const fetchSleep = async (userId, days = 7) => {
  try {
    const accessToken = await ensureAccessToken(userId);
    const endMs = Date.now();
    const startMs = endMs - days * 24 * 60 * 60 * 1000;

    const body = {
      aggregateBy: [{ dataTypeName: "com.google.sleep.segment" }],
      bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    };

    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Google Fit sleep fetch failed");
    const data = await res.json();
    const buckets = data.bucket || [];
    // Summarize total sleep per day in minutes
    return buckets.map((b) => {
      const day = new Date(parseInt(b.startTimeMillis)).toISOString().split("T")[0];
      const totalMinutes = (b.dataset || []).reduce((sum, ds) => {
        return sum + (ds.point || []).reduce((s2, p) => {
          // sleep.segment stores start/end as timestamps; estimate duration if present
          const start = parseInt(p.startTimeNanos ? p.startTimeNanos / 1e6 : p.startTimeNanos || 0);
          const end = parseInt(p.endTimeNanos ? p.endTimeNanos / 1e6 : p.endTimeNanos || 0);
          const minutes = start && end ? Math.round((end - start) / 60000) : 0;
          return s2 + minutes;
        }, 0);
      }, 0);
      return { day, sleepMinutes: totalMinutes };
    });
  } catch (err) {
    console.error("❌ fetchSleep Error:", err.message);
    throw err;
  }
};
