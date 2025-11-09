// src/services/notion.service.js
import fetch from "node-fetch";

/**
 * fetchNotionUser - call Notion API to get user info
 */
export const fetchNotionUser = async (accessToken) => {
  try {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
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
 * searchNotionDatabases - returns a lightweight list of databases the bot/user can access
 */
export const searchNotionDatabases = async (accessToken) => {
  try {
    // Notion does not have a single 'list databases' endpoint for all accessible DBs;
    // use search endpoint with filter type=database
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filter: { value: "database", property: "object" }, page_size: 50 }),
    });
    const data = await res.json();
    return (data.results || []).map(r => ({ id: r.id, title: r?.title?.[0]?.plain_text || (r?.properties?.title?.title?.[0]?.plain_text || "Database") }));
  } catch (err) {
    console.error("❌ searchNotionDatabases Error:", err.message);
    throw new Error("Failed to list Notion databases");
  }
};

/**
 * createNotionPage - create a page in a database or as a top-level page
 * options = { databaseId (optional), title, properties, content (string) }
 */
export const createNotionPage = async (accessToken, options = {}) => {
  try {
    const { databaseId, title, properties = {}, content = "" } = options;

    // Build properties payload (Notion expects specific property types; we use simple mapping)
    const notionProperties = {};
    if (properties) {
      Object.entries(properties).forEach(([k, v]) => {
        if (typeof v === "number") {
          notionProperties[k] = { number: v };
        } else {
          notionProperties[k] = { rich_text: [{ text: { content: String(v) } }] };
        }
      });
    }

    const body = databaseId
      ? {
          parent: { database_id: databaseId },
          properties: {
            Name: { title: [{ text: { content: title } }] },
            ...notionProperties,
          },
          children: content ? [{ object: "block", type: "paragraph", paragraph: { text: [{ type: "text", text: { content } }] } }] : [],
        }
      : {
          parent: { type: "page_id", page_id: null },
          properties: { title: [{ text: { content: title } }] },
          children: content ? [{ object: "block", type: "paragraph", paragraph: { text: [{ type: "text", text: { content } }] } }] : [],
        };

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Notion create page failed: ${res.status} ${txt}`);
    }

    const data = await res.json();
    return { id: data.id, url: data.url };
  } catch (err) {
    console.error("❌ createNotionPage Error:", err.message);
    throw err;
  }
};
