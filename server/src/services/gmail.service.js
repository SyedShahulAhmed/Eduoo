// src/services/gmail.service.js
import { google } from "googleapis";
import Connection from "../models/Connection.js";
import { ENV } from "../config/env.js";

const oauth2Client = new google.auth.OAuth2(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
  `${ENV.SERVER_URL}/api/connections/gmail/callback`
);

/** Ensure valid access token, refresh if needed */
export const ensureGmailClient = async (userId) => {
  const conn = await Connection.findOne({ userId, platform: "gmail" });
  if (!conn) throw new Error("Gmail connection not found");
  if (!conn.accessToken) throw new Error("No Gmail access token");

  oauth2Client.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken,
  });

  // optionally check expiry & refresh
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  return gmail;
};

/** Send a summary email */
export const sendGmailSummary = async (userId, toEmail, subject, bodyText) => {
  const gmail = await ensureGmailClient(userId);

  const raw = Buffer.from(
    `To: ${toEmail}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${bodyText}`
  ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
};
