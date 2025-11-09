// src/services/googleCalendar.service.js
import fetch from "node-fetch";

/**
 * Fetch user’s Google Calendar list
 */
export const fetchGoogleCalendarList = async (accessToken) => {
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch calendar list");
  const data = await res.json();
  return data.items || [];
};

/**
 * Fetch events from primary calendar (next 7 days)
 */
export const fetchGoogleCalendarEvents = async (accessToken) => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch events");

  const data = await res.json();
  return (data.items || []).map((e) => ({
    id: e.id,
    summary: e.summary,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
  }));
};
