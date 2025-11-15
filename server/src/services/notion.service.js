import fetch from "node-fetch";
import Connection from "../models/Connection.js";
import Goal from "../models/Goal.js";
import { ENV } from "../config/env.js";
import { generateOneLineReco } from "../services/aiInsights.service.js";
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
      method: "GET",
      headers: NOTION_HEADERS(accessToken),
    });

    const txt = await res.text();

    if (!res.ok) {
      // include Notion response body for debugging
      throw new Error(`Notion user fetch failed: ${res.status} ${txt}`);
    }

    // parse JSON (defensive)
    let data;
    try {
      data = JSON.parse(txt);
    } catch (parseErr) {
      throw new Error(`Notion user parse failed: ${parseErr.message}`);
    }

    // Normalise name/type across possible Notion shapes
    const id = data.id;
    const type =
      data.type || (data.person ? "person" : data.user ? "user" : undefined);
    const name =
      // prefer top-level name, then nested shapes Notion sometimes returns
      data.name ||
      data.person?.name ||
      data.user?.name ||
      (data?.role ? data.role : undefined) ||
      "Notion User";

    return { id, name, type };
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
        filter: { property: "object", value: "database" },
        page_size: 50,
      }),
    });

    const txt = await res.text();

    if (!res.ok) {
      throw new Error(`Notion search failed: ${res.status} ${txt}`);
    }

    let data;
    try {
      data = JSON.parse(txt);
    } catch (err) {
      throw new Error(`Notion search parse failed: ${err.message}`);
    }

    const dbs = (data.results || []).map((db) => ({
      id: db.id,
      title:
        db.title?.[0]?.plain_text ||
        db.properties?.title?.title?.[0]?.plain_text ||
        "Untitled Database",
    }));

    return dbs;
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

  // FIX: ensure parent page exists
  const homePageId = await ensureHomePage(conn);

  const body = {
    parent: { page_id: homePageId }, // FIXED ✔
    icon: { type: "emoji", emoji: "🎯" },

    title: [
      {
        type: "text",
        text: { content: "AICOO Goals" },
      },
    ],

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

  console.log("Creating database inside page:", homePageId);

  const res = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  const txt = await res.text();
  console.log("DB Create Response:", txt);

  if (!res.ok) {
    throw new Error(`Notion create database failed: ${res.status} ${txt}`);
  }

  const data = JSON.parse(txt);

  conn.notionDatabaseId = data.id;
  await conn.save();

  return data.id;
};

/* ===========================================================
    ENSURE WEEKLY REPORTS PARENT PAGE
=========================================================== */

export const ensureReportsParentPage = async (conn) => {
  if (conn.notionReportsPageId) return conn.notionReportsPageId;

  // FIX: Place Weekly Reports INSIDE EDUOO Home
  const homePageId = await ensureHomePage(conn);

  const body = {
    parent: { page_id: homePageId }, // FIXED ✔
    icon: { type: "emoji", emoji: "📝" }, // ADDED ✔
    properties: {
      title: {
        title: [
          {
            type: "text",
            text: { content: "AICOO Weekly Reports" },
          },
        ],
      },
    },

    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
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

  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Notion create reports page failed: ${res.status} ${txt}`);
  }

  const data = JSON.parse(txt);

  conn.notionReportsPageId = data.id;
  await conn.save();

  return data.id;
};

/* ===========================================================
    CREATE OR UPDATE GOAL PAGE
=========================================================== */

export const createOrUpdateGoalPage = async (conn, goal) => {
  // Ensure DB exists
  const dbId = await ensureNotionDatabase(conn, { _id: goal.userId });

  /* ---------------------------------------------
     BUILD NOTION PROPERTIES (CORRECT SCHEMA)
  --------------------------------------------- */
  const properties = {
    Name: {
      title: [
        {
          type: "text",
          text: { content: goal.title },
        },
      ],
    },

    Status: {
      select: { name: goal.status || "active" },
    },

    Progress: {
      number: goal.progress || 0,
    },

    Target: {
      number: goal.target || 1,
    },

    Deadline: goal.deadline
      ? {
          date: {
            start: goal.deadline.toISOString(),
          },
        }
      : undefined,

    Type: {
      rich_text: [
        {
          type: "text",
          text: { content: goal.type || "" },
        },
      ],
    },
  };

  // Remove undefined keys (Notion rejects them)
  Object.keys(properties).forEach((key) => {
    if (properties[key] === undefined) delete properties[key];
  });

  /* ---------------------------------------------
     UPDATE EXISTING PAGE
  --------------------------------------------- */
  if (goal.notionPageId) {
    const res = await fetch(
      `https://api.notion.com/v1/pages/${goal.notionPageId}`,
      {
        method: "PATCH",
        headers: NOTION_HEADERS(conn.accessToken),
        body: JSON.stringify({ properties }),
      }
    );

    const txt = await res.text();

    if (!res.ok) {
      throw new Error(`Notion update page failed: ${res.status} ${txt}`);
    }

    let data;
    try {
      data = JSON.parse(txt);
    } catch (e) {
      throw new Error(`Notion page update parse failed: ${e.message}`);
    }

    goal.syncedAt = new Date();
    goal.needsSync = false;
    await goal.save();

    conn.lastSync = new Date();
    await conn.save();

    return { id: data.id, url: data.url };
  }

  /* ---------------------------------------------
     CREATE NEW PAGE INSIDE DATABASE
  --------------------------------------------- */
  const createBody = {
    parent: { database_id: dbId },

    properties,

    // Description block if present
    children: goal.description
      ? [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: { content: goal.description },
                },
              ],
            },
          },
        ]
      : [],
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(createBody),
  });

  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Notion create page failed: ${res.status} ${txt}`);
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    throw new Error(`Notion page create parse failed: ${e.message}`);
  }

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
  // Get all unsynced goals
  const pending = await Goal.find({
    userId: conn.userId,
    needsSync: true,
  });

  const results = [];

  for (const g of pending) {
    try {
      if (!g) continue;

      // Call the corrected Notion sync function
      const pageInfo = await createOrUpdateGoalPage(conn, g);

      results.push({
        goalId: g._id,
        page: pageInfo,
      });
    } catch (err) {
      console.error("❌ syncPendingGoalsForUser error:", err.message);

      // Save truncated error to DB
      conn.lastError = err.message.substring(0, 1000);
      await conn.save();

      results.push({
        goalId: g._id,
        error: err.message,
      });
    }
  }

  return results;
};

/* ===========================================================
    DAILY DASHBOARD
=========================================================== */

export const ensureDailyDashboardDatabase = async (conn) => {
  if (conn.metadata?.dailyDashboardDbId) {
    return conn.metadata.dailyDashboardDbId;
  }

  // Parent page = Home Page
  const homePageId = await ensureHomePage(conn);

  const body = {
    parent: { page_id: homePageId },
    icon: { type: "emoji", emoji: "📊" }, // ADDED ✔
    title: [
      {
        type: "text",
        text: { content: "AICOO Daily Dashboard" },
      },
    ],

    properties: {
      Name: { title: {} }, // REQUIRED ✔

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

  const txt = await res.text();
  console.log("📊 Dashboard Create Response:", txt);

  if (!res.ok) {
    throw new Error(`Notion create dashboard DB failed: ${res.status} ${txt}`);
  }

  const data = JSON.parse(txt);

  conn.metadata = {
    ...(conn.metadata || {}),
    dailyDashboardDbId: data.id,
  };

  await conn.save();

  return data.id;
};

export const createDailyDashboardRow = async (conn, row) => {
  // Ensure DB exists
  const dbId = await ensureDailyDashboardDatabase(conn);

  const body = {
    parent: { database_id: dbId },

    properties: {
      Date: {
        date: {
          start: (row.date || new Date()).toISOString(),
        },
      },

      "GitHub Commits": {
        number: row.commits || 0,
      },

      "LeetCode Problems": {
        number: row.leetcode || 0,
      },

      "Spotify Focus Time (min)": {
        number: row.spotifyMinutes || 0,
      },

      Notes: {
        rich_text: [
          {
            type: "text",
            text: {
              content: row.notes || "",
            },
          },
        ],
      },
    },
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Notion create dashboard row failed: ${res.status} ${txt}`);
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch (err) {
    throw new Error(`Dashboard row parse failed: ${err.message}`);
  }

  return data;
};

/* ===========================================================
    WEEKLY REPORT PAGE
=========================================================== */

export const createWeeklyReportSubpage = async (conn, payload) => {
  const parentId = await ensureReportsParentPage(conn);

  const title = `Weekly Summary — ${payload.startDate.toLocaleDateString()} to ${payload.endDate.toLocaleDateString()}`;

  const metrics = payload.metrics;
  const connected = payload.connections;

  const metricBlocks = [];

  if (metrics.github) {
    metricBlocks.push(
      makeBullet(`🐙 GitHub Commits: ${metrics.github.commits}`)
    );
  }
  if (metrics.leetcode) {
    metricBlocks.push(
      makeBullet(`🧩 LeetCode Solved: ${metrics.leetcode.solved}`)
    );
  }
  if (metrics.spotify) {
    metricBlocks.push(
      makeBullet(`🎧 Spotify Focus: ${metrics.spotify.minutes} minutes`)
    );
  }
  if (metrics.codeforces) {
    metricBlocks.push(
      makeBullet(
        `🏆 Codeforces Rating Change: ${metrics.codeforces.ratingChange}`
      )
    );
  }
  if (metrics.codechef) {
    metricBlocks.push(
      makeBullet(`🍽️ CodeChef Rating: ${metrics.codechef.rating}`)
    );
  }
  if (metrics.duolingo) {
    metricBlocks.push(
      makeBullet(`🦉 Duolingo Streak: ${metrics.duolingo.streak} days`)
    );
  }

  const recoBlocks = [];

  for (const platform of Object.keys(connected)) {
    if (
      !metrics ||
      !metrics[platform] ||
      typeof metrics[platform] !== "object"
    ) {
      continue;
    }

    const aiReco = await generateOneLineReco(platform, metrics[platform]);
    recoBlocks.push(makeBullet(`💡 ${platform.toUpperCase()}: ${aiReco}`));
  }

  const body = {
    parent: { page_id: parentId },
    icon: { type: "emoji", emoji: "📘" },

    properties: {
      title: {
        title: [{ type: "text", text: { content: title } }],
      },
    },

    children: [
      makeHeading(`📅 ${title}`),

      makeHeading("📊 Activity Breakdown"),
      ...metricBlocks,

      makeHeading("✨ Recommendations for Next Week"),
      ...recoBlocks,
    ],
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Notion weekly page failed: ${res.status} ${txt}`);
  }

  return JSON.parse(txt);
};

// UTILITIES
const makeHeading = (text) => ({
  object: "block",
  type: "heading_2",
  heading_2: {
    rich_text: [
      {
        type: "text",
        text: { content: text },
      },
    ],
  },
});

const makeBullet = (text) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: {
    rich_text: [
      {
        type: "text",
        text: { content: text },
      },
    ],
  },
});

/* ===========================================================
    HOME PAGE (EDUOO Home) + LINK BLOCKS
=========================================================== */

export const ensureHomePage = async (conn) => {
  if (conn.notionHomePageId) return conn.notionHomePageId;

  const body = {
    parent: { workspace: true },
    icon: { type: "emoji", emoji: "📘" },

    properties: {
      title: {
        title: [
          {
            type: "text",
            text: { content: "EDUOO Home" },
          },
        ],
      },
    },

    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "Welcome to your central EDUOO productivity hub.",
              },
            },
          ],
        },
      },
    ],
  };

  console.log("📤 Creating Home Page:", JSON.stringify(body, null, 2));

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(conn.accessToken),
    body: JSON.stringify(body),
  });

  const txt = await res.text();
  console.log("📥 Home page response:", txt);

  if (!res.ok) {
    throw new Error(`Notion create home page failed: ${res.status} ${txt}`);
  }

  const data = JSON.parse(txt);

  conn.notionHomePageId = data.id;
  await conn.save();

  return data.id;
};

export const updateHomePageLinks = async (conn) => {
  const homeId = await ensureHomePage(conn);

  const blocks = [];

  // Add Goals DB link
  if (conn.notionDatabaseId) {
    blocks.push({
      object: "block",
      type: "bookmark",
      bookmark: {
        url: `https://www.notion.so/${conn.notionDatabaseId.replace(/-/g, "")}`,
      },
    });
  }

  // Add Daily Dashboard DB link
  if (conn.metadata?.dailyDashboardDbId) {
    blocks.push({
      object: "block",
      type: "bookmark",
      bookmark: {
        url: `https://www.notion.so/${conn.metadata.dailyDashboardDbId.replace(
          /-/g,
          ""
        )}`,
      },
    });
  }

  // Add Reports Parent Page link
  if (conn.notionReportsPageId) {
    blocks.push({
      object: "block",
      type: "bookmark",
      bookmark: {
        url: `https://www.notion.so/${conn.notionReportsPageId.replace(
          /-/g,
          ""
        )}`,
      },
    });
  }

  // Nothing to add?
  if (blocks.length === 0) return;

  const body = {
    children: blocks,
  };

  const res = await fetch(
    `https://api.notion.com/v1/blocks/${homeId}/children`,
    {
      method: "PATCH",
      headers: NOTION_HEADERS(conn.accessToken),
      body: JSON.stringify(body),
    }
  );

  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Notion update home links failed: ${res.status} ${txt}`);
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch (err) {
    throw new Error(`Home page link parse failed: ${err.message}`);
  }

  return data;
};

/* ===========================================================
    BACKUP PAGE (AUTO CREATE PARENT)
=========================================================== */

// notion.service.js (part 12)

export const backupReportToNotion = async (conn, title, rawJson) => {
  const parentId = await ensureReportsParentPage(conn);

  // Convert JSON to readable slice
  const jsonText = JSON.stringify(rawJson, null, 2).slice(0, 2000);

  const body = {
    parent: { page_id: parentId },

    // Correct Notion title format
    properties: {
      title: {
        title: [
          {
            type: "text",
            text: { content: title },
          },
        ],
      },
    },

    // JSON content
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: jsonText },
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

  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Notion backup page failed: ${res.status} ${txt}`);
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch (err) {
    throw new Error(`Backup parse failed: ${err.message}`);
  }

  return data;
};
