// src/services/googleTasks.service.js
import { google } from "googleapis";
import Connection from "../models/Connection.js";
import { ENV } from "../config/env.js";

const oauth2Client = new google.auth.OAuth2(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
  `${ENV.SERVER_URL}/api/connections/google-tasks/callback`
);

/**
 * Get authenticated Google Tasks client
 */
export const getGoogleTasksClient = async (userId) => {
  const conn = await Connection.findOne({ userId, platform: "google_tasks" });
  if (!conn?.accessToken) throw new Error("Google Tasks not connected");

  oauth2Client.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken,
  });

  return google.tasks({ version: "v1", auth: oauth2Client });
};

/**
 * Fetch user's task lists
 */
export const fetchGoogleTaskLists = async (userId) => {
  const client = await getGoogleTasksClient(userId);
  const res = await client.tasklists.list();
  return res.data.items || [];
};

/**
 * Create a task in the user's primary list
 */
export const createGoogleTask = async (userId, title, notes = "") => {
  const client = await getGoogleTasksClient(userId);
  const lists = await client.tasklists.list();
  const taskListId = lists.data.items?.[0]?.id;

  const res = await client.tasks.insert({
    tasklist: taskListId,
    requestBody: {
      title,
      notes,
      due: new Date(Date.now() + 86400000).toISOString(),
    },
  });

  return res.data;
};

/**
 * Fetch tasks (optionally completed)
 */
export const fetchGoogleTasks = async (userId, showCompleted = false) => {
  const client = await getGoogleTasksClient(userId);
  const lists = await client.tasklists.list();
  const listId = lists.data.items?.[0]?.id;

  const res = await client.tasks.list({
    tasklist: listId,
    showCompleted,
    maxResults: 20,
  });

  return res.data.items || [];
};
