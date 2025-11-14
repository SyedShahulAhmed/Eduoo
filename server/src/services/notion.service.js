
import fetch from "node-fetch";
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";
import { ENV } from "../config/env.js";

/**
 * Minimal wrappers for Notion API calls used by the sync logic.
 * Corrected parents and added EDUOO Home page + links + backup auto-create.
 */

const NOTION_HEADERS = (token) => ({
  Authorization: `Bearer ${token}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

/* ===========================================================
    USER
=========================================================== */

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

/* ===========================================================
    SEARCH DATABASES
=========================================================== */

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

/* ===========================================================
    ENSURE GOALS DATABASE
=========================================================== */

export const ensureNotionDatabase = async (conn, user) => {
  if (conn.notionDatabaseId) return conn.notionDatabaseId;

  const body = {
    parent: { workspace: true }, // VALID
    icon: { type: "emoji", emoji: "🎯" },
    title: [{ type: "text", text: { content: "AICOO Goals" } }],
    properties: {
      Name: { title: {} },
      Status: {
        select: {
          options: [
            { name: "active" },
            { name: "completed" },
            { name: "paused" },
          ],
        },
      },
      Progress: { number: {} },
      Target: { number: {} },
      Deadline: { date: {} },
      Type: { rich_text: {} },
    },
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

/* ===========================================================
    ENSURE WEEKLY REPORTS PARENT PAGE
=========================================================== */

export const ensureReportsParentPage = async (conn) => {
  if (conn.notionReportsPageId) return conn.notionReportsPageId;

  const body = {
    parent: { workspace: true },
    properties: {
      title: [
        {
          type: "text",
          text: { content: "AICOO Weekly Reports" },
        },
      ],
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          text: [
            {
              type: "text",
              text: {
                content: "Weekly reports for your EDUOO account.",
              },
            },
          ],
        },
      },
    ],
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

/* ===========================================================
    CREATE OR UPDATE GOAL PAGE
=========================================================== */

export const createOrUpdateGoalPage = async (conn, goal) => {
  const dbId = await ensureNotionDatabase(conn, { _id: goal.userId });

  const properties = {
    Name: { title: [{ text: { content: goal.title } }] },
    Status: { select: { name: goal.status || "active" } },
    Progress: { number: goal.progress || 0 },
    Target: { number: goal.target || 1 },
    Deadline: goal.deadline
      ? { date: { start: goal.deadline.toISOString() } }
      : undefined,
    Type: { rich_text: [{ text: { content: goal.type || "" } }] },
  };

  Object.keys(properties).forEach(
    (k) => properties[k] === undefined && delete properties[k]
  );

  // Update
  if (goal.notionPageId) {
    const res = await fetch(
      `https://api.notion.com/v1/pages/${goal.notionPageId}`,
      {
        method: "PATCH",
        headers: NOTION_HEADERS(conn.accessToken),
        body: JSON.stringify({ properties }),
      }
    );

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

  // Create
  const body = {
    parent: { database_id: dbId },
    properties,
    children: goal.description
      ? [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              text: [{ type: "text", text: { content: goal.description } }],
            },
          },
        ]
      : [],
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

/* ===========================================================
    SYNC PENDING GOALS
=========================================================== */

export const syncPendingGoalsForUser = async (conn) => {
  const pending = await Goal.find({
    userId: conn.userId,
    needsSync: true,
  });

  const results = [];

  for (const g of pending) {
    try {
      const r = await createOrUpdateGoalPage(conn, g);
      results.push({ goalId: g._id, page: r });
    } catch (err) {
      console.error("❌ syncPendingGoalsForUser error:", err.message);
      conn.lastError = err.message.slice(0, 1000);
      await conn.save();
    }
  }

  return results;
};

/* ===========================================================
    DAILY DASHBOARD
=========================================================== */

export const ensureDailyDashboardDatabase = async (conn) => {
  if (conn.metadata?.dailyDashboardDbId)
    return conn.metadata.dailyDashboardDbId;

  const body = {
    parent: { workspace: true },
    title: [{ type: "text", text: { content: "AICOO Daily Dashboard" } }],
    properties: {
      Date: { date: {} },
      "GitHub Commits": { number: {} },
      "LeetCode Problems": { number: {} },
      "Spotify Focus Time (min)": { number: {} },
      Notes: { rich_text: {} },
    },
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

  const body = {
    parent: { database_id: dbId },
    properties: {
      Date: { date: { start: (row.date || new Date()).toISOString() } },
      "GitHub Commits": { number: row.commits || 0 },
      "LeetCode Problems": { number: row.leetcode || 0 },
      "Spotify Focus Time (min)": { number: row.spotifyMinutes || 0 },
      Notes: {
        rich_text: [{ text: { content: row.notes || "" } }],
      },
    },
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create dashboard row failed: ${res.status} ${txt}`);
  }

  return await res.json();
};

/* ===========================================================
    WEEKLY REPORT PAGE
=========================================================== */

export const createWeeklyReportSubpage = async (conn, payload) => {
  const parentId = await ensureReportsParentPage(conn);

  const title = `Weekly Summary — ${payload.startDate.toLocaleDateString()} to ${payload.endDate.toLocaleDateString()}`;

  const body = {
    parent: { page_id: parentId },
    properties: { title: [{ text: { content: title } }] },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: { text: [{ type: "text", text: { content: title } }] },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          text: [{ type: "text", text: { content: payload.summaryText || "" } }],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          text: [
            {
              type: "text",
              text: {
                content: `GitHub: ${payload.metrics.github || 0} commits`,
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          text: [
            {
              type: "text",
              text: {
                content: `LeetCode: ${payload.metrics.leetcode || 0} problems`,
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          text: [
            {
              type: "text",
              text: {
                content: `Spotify: ${payload.metrics.spotify || 0} minutes focus`,
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          text: [
            {
              type: "text",
              text: {
                content: `Streaks: ${payload.metrics.streaks || "N/A"}`,
              },
            },
          ],
        },
      },
    ],
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

  return await res.json();
};

/* ===========================================================
    HOME PAGE (EDUOO Home) + LINK BLOCKS
=========================================================== */

export const ensureHomePage = async (conn) => {
  if (conn.notionHomePageId) return conn.notionHomePageId;

  const body = {
    parent: { workspace: true },
    icon: { type: "emoji", emoji: "📘" },
    properties: {
      title: [
        {
          type: "text",
          text: { content: "EDUOO Home" },
        },
      ],
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          text: [
            {
              type: "text",
              text: {
                content:
                  "Welcome! This is your EDUOO home — your central productivity hub.",
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          text: [
            {
              type: "text",
              text: { content: "🎯 Your Databases" },
            },
          ],
        },
      },
    ],
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create home page failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  conn.notionHomePageId = data.id;
  await conn.save();
  return data.id;
};

export const updateHomePageLinks = async (conn) => {
  const homeId = await ensureHomePage(conn);

  const blocks = [];

  if (conn.notionDatabaseId) {
    blocks.push({
      object: "block",
      type: "bookmark",
      bookmark: { url: `https://www.notion.so/${conn.notionDatabaseId.replace(/-/g, "")}` },
    });
  }

  if (conn.metadata?.dailyDashboardDbId) {
    blocks.push({
      object: "block",
      type: "bookmark",
      bookmark: {
        url: `https://www.notion.so/${conn.metadata.dailyDashboardDbId.replace(/-/g, "")}`,
      },
    });
  }

  if (conn.notionReportsPageId) {
    blocks.push({
      object: "block",
      type: "bookmark",
      bookmark: {
        url: `https://www.notion.so/${conn.notionReportsPageId.replace(/-/g, "")}`,
      },
    });
  }

  if (blocks.length === 0) return;

  const res = await fetch("https://api.notion.com/v1/blocks/" + homeId + "/children", {
    method: "PATCH",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify({ children: blocks }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion update home links failed: ${res.status} ${txt}`);
  }

  return await res.json();
};

/* ===========================================================
    BACKUP PAGE (AUTO CREATE PARENT)
=========================================================== */

export const backupReportToNotion = async (conn, title, rawJson) => {
  const parentId = await ensureReportsParentPage(conn);

  const body = {
    parent: { page_id: parentId },
    properties: {
      title: [{ text: { content: title } }],
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          text: [
            {
              type: "text",
              text: {
                content: JSON.stringify(rawJson, null, 2).slice(0, 2000),
              },
            },
          ],
        },
      },
    ],
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

  return await res.json();
};
