export const generateAIInsights = async ({ type, data }) => {
  if (type === "spotify") {
    const topArtists = [...new Set(data.map((t) => t.artist))].slice(0, 5);
    const avgDuration =
      data.reduce((acc, t) => acc + t.duration_ms, 0) / data.length / 60000;
    const focusScore = Math.min(100, Math.round(avgDuration * 10));

    return {
      summary: `Top artists: ${topArtists.join(", ")}.`,
      avgListeningTime: `${avgDuration.toFixed(1)} mins per track`,
      focusScore,
      suggestion:
        focusScore > 70
          ? "Your listening habits suggest strong focus patterns. Keep your productive playlists handy!"
          : "Try more instrumental or low-lyric playlists to improve your focus sessions.",
    };
  }
  if (type === "notion") {
    const totalDatabases = data.length;
    const titles = data.map((d) => d.title).slice(0, 5);

    return {
      summary: `You have ${totalDatabases} active Notion databases. Top: ${titles.join(", ")}.`,
      recommendation:
        totalDatabases > 5
          ? "Consider consolidating some databases for focus."
          : "Your workspace looks well organized — keep it up!",
    };
  }
  if (type === "google_calendar") {
    const totalEvents = data.length;
    const firstEvent = data[0]?.summary || "No events";
    const workRatio = Math.round(
      (data.filter((e) => /meeting|work|call/i.test(e.summary)).length / totalEvents) * 100
    );

    return {
      summary: `You have ${totalEvents} events upcoming. Next: "${firstEvent}".`,
      workRatio: `${workRatio}% appear to be work-related.`,
      suggestion:
        workRatio > 70
          ? "Your schedule is heavily work-oriented — consider adding breaks or relaxation slots."
          : "Good balance! Maintain a healthy mix of tasks and downtime.",
    };
  }
  return { summary: "No AI insights available yet." };
};
