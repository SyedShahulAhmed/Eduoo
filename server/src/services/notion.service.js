// src/services/notion.sync.service.js
import fetch from "node-fetch";
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";
import { ENV } from "../config/env.js";

/**
 * Minimal wrappers for Notion API calls used by the sync logic.
 * NOTE: Notion API expects Notion-Version header; we use 2022-06-28 for stability.
 */

const NOTION_HEADERS = (token) => ({
  Authorization: `Bearer ${token}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

export const fetchNotionUser = async (accessToken) => {
  try {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: NOTION_HEADERS(accessToken),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Notion user fetch failed: ${res.status} ${txt}`);
    }

    const data = await res.json();

    return {
      id: data.id,
      name: data.name || data.user?.name || "Notion User",
      type: data.type,
    };
  } catch (err) {
    console.error("❌ fetchNotionUser Error:", err.message);
    throw err;
  }
};


/**
 * 2️⃣ Search Notion databases accessible to user
 */
export const searchNotionDatabases = async (accessToken) => {
  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: NOTION_HEADERS(accessToken),
      body: JSON.stringify({
        filter: { value: "database", property: "object" },
        page_size: 50,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Notion search failed: ${res.status} ${txt}`);
    }

    const data = await res.json();

    return (data.results || []).map((r) => ({
      id: r.id,
      title:
        r?.title?.[0]?.plain_text ||
        r?.properties?.title?.title?.[0]?.plain_text ||
        "Database",
    }));
  } catch (err) {
    console.error("❌ searchNotionDatabases Error:", err.message);
    throw err;
  }
};


export const ensureNotionDatabase = async (conn, user) => {
  // If connection already has notionDatabaseId, verify it exists; otherwise create DB
  if (conn.notionDatabaseId) return conn.notionDatabaseId;

  // Create a simple database for goals with columns: Name (title), Status (select), Progress (number), Target (number), Deadline (date)
  const body = {
    parent: { type: "user", user_id: conn.profileId || user._id.toString() }, // fallback
    icon: { type: "emoji", emoji: "🎯" },
    title: [{ type: "text", text: { content: "AICOO Goals" } }],
    properties: {
      Name: { title: {} },
      Status: { select: { options: [{ name: "active" }, { name: "completed" }, { name: "paused" }] } },
      Progress: { number: {} },
      Target: { number: {} },
      Deadline: { date: {} },
      Type: { rich_text: {} }
    }
  };

  const res = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create database failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  conn.notionDatabaseId = data.id;
  await conn.save();
  return data.id;
};

export const ensureReportsParentPage = async (conn, user) => {
  // Create or return a single reports page id (under which weekly reports become subpages)
  if (conn.notionReportsPageId) return conn.notionReportsPageId;

  const body = {
    parent: { type: "page_id", page_id: null }, // create top-level page (Notion requires a parent; use user page if needed)
    properties: {
      title: { title: [{ text: { content: "AICOO Weekly Reports" } }] }
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: { text: [{ type: "text", text: { content: "Weekly reports for your EDUOO account." } }] }
      }
    ]
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create reports page failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  conn.notionReportsPageId = data.id;
  await conn.save();
  return data.id;
};

export const createOrUpdateGoalPage = async (conn, goal) => {
  // Ensure DB exists
  const dbId = await ensureNotionDatabase(conn, { _id: goal.userId });

  const properties = {
    Name: { title: [{ text: { content: goal.title } }] },
    Status: { select: { name: goal.status || "active" } },
    Progress: { number: goal.progress || 0 },
    Target: { number: goal.target || 1 },
    Deadline: goal.deadline ? { date: { start: goal.deadline.toISOString() } } : undefined,
    Type: { rich_text: [{ text: { content: goal.type || "" } }] }
  };

  // Remove undefined properties (Notion doesn't like them)
  Object.keys(properties).forEach(k => properties[k] === undefined && delete properties[k]);

  // If page exists, update it
  if (goal.notionPageId) {
    const body = { properties };
    const res = await fetch(`https://api.notion.com/v1/pages/${goal.notionPageId}`, {
      method: "PATCH",
      headers: NOTION_HEADERS(conn.accessToken),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Notion update page failed: ${res.status} ${txt}`);
    }
    const data = await res.json();
    goal.syncedAt = new Date();
    goal.needsSync = false;
    await goal.save();
    conn.lastSync = new Date();
    await conn.save();
    return { id: data.id, url: data.url };
  }

  // Create a new page in DB
  const body = {
    parent: { database_id: dbId },
    properties,
    children: goal.description ? [{ object: "block", type: "paragraph", paragraph: { text: [{ type: "text", text: { content: goal.description } }] } }] : []
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create page failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  goal.notionPageId = data.id;
  goal.syncedAt = new Date();
  goal.needsSync = false;
  await goal.save();
  conn.lastSync = new Date();
  await conn.save();

  return { id: data.id, url: data.url };
};

export const syncPendingGoalsForUser = async (conn) => {
  // Fetch goals with needsSync true for user
  const pending = await Goal.find({ userId: conn.userId, needsSync: true });
  const results = [];
  for (const g of pending) {
    try {
      const r = await createOrUpdateGoalPage(conn, g);
      results.push({ goalId: g._id, page: r });
    } catch (err) {
      console.error("❌ syncPendingGoalsForUser error:", err.message);
      // mark error on connection but continue
      conn.lastError = err.message.slice(0, 1000);
      await conn.save();
    }
  }
  return results;
};

/**
 * Create a daily dashboard row in a 'Daily Dashboard' database (we'll reuse the same DB or create another)
 * For simplicity we store daily rows in a database named 'AICOO Daily Dashboard'
 */
export const ensureDailyDashboardDatabase = async (conn) => {
  if (conn.metadata && conn.metadata.dailyDashboardDbId) return conn.metadata.dailyDashboardDbId;

  const body = {
    parent: { type: "user", user_id: conn.profileId || conn.userId.toString() },
    title: [{ type: "text", text: { content: "AICOO Daily Dashboard" } }],
    properties: {
      Date: { date: {} },
      "GitHub Commits": { number: {} },
      "LeetCode Problems": { number: {} },
      "Spotify Focus Time (min)": { number: {} },
      Notes: { rich_text: {} }
    }
  };

  const res = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create dashboard DB failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  conn.metadata = { ...(conn.metadata || {}), dailyDashboardDbId: data.id };
  await conn.save();
  return data.id;
};

export const createDailyDashboardRow = async (conn, row) => {
  const dbId = await ensureDailyDashboardDatabase(conn);
  const properties = {
    Date: { date: { start: (row.date || new Date()).toISOString() } },
    "GitHub Commits": { number: row.commits || 0 },
    "LeetCode Problems": { number: row.leetcode || 0 },
    "Spotify Focus Time (min)": { number: row.spotifyMinutes || 0 },
    Notes: { rich_text: [{ text: { content: row.notes || "" } }] }
  };

  const body = { parent: { database_id: dbId }, properties };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create dashboard row failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return { id: data.id, url: data.url };
};

/**
 * Weekly report creation as a subpage under Reports parent page (user chose "append as subpage")
 */
export const createWeeklyReportSubpage = async (conn, payload) => {
  // payload: { startDate, endDate, summaryText, metrics: { github, leetcode, spotify, streaks } }
  const parentId = await ensureReportsParentPage(conn, { _id: conn.userId });

  const title = `Weekly Summary — ${payload.startDate.toLocaleDateString()} to ${payload.endDate.toLocaleDateString()}`;
  const children = [
    { object: "block", type: "heading_2", heading_2: { text: [{ type: "text", text: { content: title } }] } },
    { object: "block", type: "paragraph", paragraph: { text: [{ type: "text", text: { content: payload.summaryText || "" } }] } },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { text: [{ type: "text", text: { content: `GitHub: ${payload.metrics.github || 0} commits` } }] }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { text: [{ type: "text", text: { content: `LeetCode: ${payload.metrics.leetcode || 0} problems` } }] }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { text: [{ type: "text", text: { content: `Spotify: ${payload.metrics.spotify || 0} minutes focus` } }] }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { text: [{ type: "text", text: { content: `Streaks: ${payload.metrics.streaks || "N/A"}` } }] }
    }
  ];

  const body = {
    parent: { page_id: parentId },
    properties: { title: [{ text: { content: title } }] },
    children,
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create weekly page failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return { id: data.id, url: data.url };
};

/**
 * Backup: create a top-level page with full content JSON (store as text)
 */
export const backupReportToNotion = async (conn, title, rawJson) => {
  const body = {
    parent: { type: "page_id", page_id: conn.notionReportsPageId || null },
    properties: { title: [{ text: { content: title } }] },
    children: [
      { object: "block", type: "paragraph", paragraph: { text: [{ type: "text", text: { content: JSON.stringify(rawJson, null, 2).slice(0, 2000) } }] } }
    ]
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion backup page failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return { id: data.id, url: data.url };
};
