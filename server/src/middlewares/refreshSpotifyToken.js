import fetch from "node-fetch";

export const refreshSpotifyToken = async (connection) => {
  if (Date.now() < connection.expiresAt) {
    return connection.accessToken; // token still valid
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
    client_id: ENV.SPOTIFY_CLIENT_ID,
    client_secret: ENV.SPOTIFY_CLIENT_SECRET,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();

  if (!data.access_token) throw new Error("Failed to refresh Spotify token");

  // update in DB
  connection.accessToken = data.access_token;
  connection.expiresAt = Date.now() + data.expires_in * 1000;
  await connection.save();

  return data.access_token;
};
