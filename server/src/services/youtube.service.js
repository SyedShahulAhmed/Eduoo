// src/services/youtube.service.js
import fetch from "node-fetch";
import Connection from "../models/Connection.js";
import { ENV } from "../config/env.js";

/**
 * exchangeRefreshToken - refresh access token using refresh_token
 */
export const exchangeRefreshToken = async (connection) => {
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
    if (!data.access_token) throw new Error("Failed to refresh YouTube access token");

    connection.accessToken = data.access_token;
    if (data.expires_in) connection.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    await connection.save();
    return connection.accessToken;
  } catch (err) {
    console.error("❌ exchangeRefreshToken Error:", err.message);
    throw err;
  }
};

/**
 * ensureAccessToken - check expiry and refresh if needed
 */
const ensureAccessToken = async (userId) => {
  const conn = await Connection.findOne({ userId, platform: "youtube" });
  if (!conn) throw new Error("YouTube connection not found");
  if (!conn.accessToken) throw new Error("No YouTube access token");

  if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
    return await exchangeRefreshToken(conn);
  }
  return conn.accessToken;
};

/**
 * fetchYouTubeChannel - fetch authenticated user's channel details
 */
export const fetchYouTubeChannel = async (accessTokenOrUserId) => {
  try {
    let accessToken = accessTokenOrUserId;
    // if a userId was passed, ensure token
    if (!accessTokenOrUserId.startsWith?.("ya29") && accessTokenOrUserId.length !== 0) {
      // assume it's a userId -> ensure token
      accessToken = await ensureAccessToken(accessTokenOrUserId);
    }

    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`YouTube channels fetch failed: ${res.status} ${txt}`);
    }
    const data = await res.json();
    return (data.items && data.items[0]) || null;
  } catch (err) {
    console.error("❌ fetchYouTubeChannel Error:", err.message);
    throw err;
  }
};

/**
 * fetchYouTubeRecentVideos - fetch last 10 uploads from channel
 */
export const fetchYouTubeRecentVideos = async (accessTokenOrUserId) => {
  try {
    let accessToken = accessTokenOrUserId;
    if (!accessTokenOrUserId.startsWith?.("ya29") && accessTokenOrUserId.length !== 0) {
      accessToken = await ensureAccessToken(accessTokenOrUserId);
    }

    // 1) get uploads playlist id via channels -> contentDetails (but we used snippet,statistics above). For simplicity, use search? We'll query 'mine' videos via search endpoint.
    const searchRes = await fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&mine=true&order=date&maxResults=10&type=video", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!searchRes.ok) {
      const txt = await searchRes.text();
      throw new Error(`YouTube search failed: ${searchRes.status} ${txt}`);
    }
    const searchData = await searchRes.json();
    const videoIds = (searchData.items || []).map((i) => i.id.videoId).filter(Boolean);
    if (!videoIds.length) return [];

    // fetch statistics for these videos
    const vidsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!vidsRes.ok) {
      const txt = await vidsRes.text();
      throw new Error(`YouTube videos fetch failed: ${vidsRes.status} ${txt}`);
    }
    const vidsData = await vidsRes.json();
    return (vidsData.items || []).map((v) => ({
      id: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      viewCount: v.statistics?.viewCount || 0,
      likeCount: v.statistics?.likeCount || 0,
      commentCount: v.statistics?.commentCount || 0,
      url: `https://youtube.com/watch?v=${v.id}`,
    }));
  } catch (err) {
    console.error("❌ fetchYouTubeRecentVideos Error:", err.message);
    throw err;
  }
};
