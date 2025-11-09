// controllers/Integrations/codechef.controller.js
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Connection from "../../models/Connection.js";
import { ENV } from "../../config/env.js";

/** 1️⃣ Redirect user to CodeChef OAuth (configurable) */
export const connectCodeChef = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    // Use configured auth url (set ENV.CODECHEF_AUTH_URL) or fallback
    const authUrlBase = ENV.CODECHEF_AUTH_URL || "https://www.codechef.com/oauth/authorize";
    const redirectUri = `${ENV.SERVER_URL}/api/connections/codechef/callback?token=${token}`;

    const scope = ENV.CODECHEF_SCOPE || "user:read"; // adjust if needed
    const url = `${authUrlBase}?response_type=code&client_id=${ENV.CODECHEF_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

    return res.redirect(url);
  } catch (err) {
    console.error("❌ connectCodeChef Error:", err);
    return res.status(500).json({ message: "CodeChef connect failed", error: err.message });
  }
};

/** 2️⃣ Callback to exchange code for access token (configurable token endpoint) */
export const codechefCallback = async (req, res) => {
  try {
    const { code, token } = req.query;
    if (!code) return res.status(400).json({ message: "Missing CodeChef code" });
    if (!token) return res.status(400).json({ message: "Missing user token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const userId = decoded.id;

    const tokenEndpoint = ENV.CODECHEF_TOKEN_URL || `${ENV.CODECHEF_API_BASE || "https://api.codechef.com"}/oauth/token`;

    // standard OAuth token exchange using application/x-www-form-urlencoded
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${ENV.SERVER_URL}/api/connections/codechef/callback?token=${token}`,
      client_id: ENV.CODECHEF_CLIENT_ID,
      client_secret: ENV.CODECHEF_CLIENT_SECRET,
    });

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    // Token shape may vary — try common keys
    const accessToken = tokenData?.result?.data?.access_token || tokenData?.access_token || tokenData?.result?.data?.token || tokenData?.token;

    if (!accessToken) {
      console.error("⚠️ CodeChef token response:", JSON.stringify(tokenData, null, 2));
      return res.status(400).json({ message: "Failed to obtain CodeChef access token", raw: tokenData });
    }

    await Connection.findOneAndUpdate(
      { userId, platform: "codechef" },
      { accessToken, connected: true, lastSync: new Date() },
      { upsert: true, new: true }
    );

    console.log(`✅ CodeChef connected for user: ${userId}`);
    return res.status(200).json({ message: "CodeChef connected successfully ✅" });
  } catch (err) {
    console.error("❌ CodeChef callback error:", err);
    return res.status(500).json({ message: "CodeChef connection failed", error: err.message });
  }
};

/** 3️⃣ Disconnect CodeChef */
export const disconnectCodeChef = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { userId: req.user.id, platform: "codechef" },
      { connected: false, accessToken: null }
    );
    return res.status(200).json({ message: "CodeChef disconnected successfully" });
  } catch (err) {
    console.error("❌ disconnectCodeChef Error:", err);
    return res.status(500).json({ message: "Failed to disconnect CodeChef", error: err.message });
  }
};

/** 4️⃣ Check connection status */
export const checkCodeChefConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({ userId: req.user.id, platform: "codechef" });
    if (!connection || !connection.connected) {
      return res.status(200).json({ connected: false, message: "CodeChef not connected" });
    }
    return res.status(200).json({ connected: true, lastSync: connection.lastSync, message: "CodeChef connected ✅" });
  } catch (err) {
    console.error("❌ checkCodeChefConnection Error:", err);
    return res.status(500).json({ connected: false, message: "Error checking CodeChef connection", error: err.message });
  }
};
