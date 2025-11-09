import fetch from "node-fetch";

export const fetchSpotifyData = async (accessToken) => {
  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1️⃣ Basic user profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", { headers });
    const profile = await profileRes.json();

    // 2️⃣ Recently played tracks
    const recentRes = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", { headers });
    const recent = await recentRes.json();

    // 3️⃣ User playlists
    const playlistsRes = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", { headers });
    const playlists = await playlistsRes.json();

    // 4️⃣ Top artists
    const topArtistsRes = await fetch("https://api.spotify.com/v1/me/top/artists?limit=10", { headers });
    const topArtists = await topArtistsRes.json();

    // 5️⃣ Top tracks
    const topTracksRes = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=10", { headers });
    const topTracks = await topTracksRes.json();

    // 6️⃣ Currently playing track (if any)
    const currentRes = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers });
    let currentTrack = null;
    if (currentRes.status === 200) {
      const currentData = await currentRes.json();
      currentTrack = currentData?.item
        ? {
            name: currentData.item.name,
            artist: currentData.item.artists.map((a) => a.name).join(", "),
            album: currentData.item.album.name,
            progressMs: currentData.progress_ms,
            durationMs: currentData.item.duration_ms,
          }
        : null;
    }

    // 7️⃣ Audio features for top tracks
    let audioFeatures = [];
    if (topTracks.items?.length) {
      const trackIds = topTracks.items.map((t) => t.id).join(",");
      const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, { headers });
      const featuresData = await featuresRes.json();
      audioFeatures = featuresData.audio_features || [];
    }

    // 8️⃣ Aggregated statistics
    const avgTempo = Math.round(
      audioFeatures.reduce((sum, f) => sum + (f?.tempo || 0), 0) / (audioFeatures.length || 1)
    );
    const avgEnergy = Math.round(
      (audioFeatures.reduce((sum, f) => sum + (f?.energy || 0), 0) / (audioFeatures.length || 1)) * 100
    );

    // 9️⃣ Data summary for AI & Reports
    return {
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        followers: profile.followers?.total,
        country: profile.country,
        email: profile.email,
        profileUrl: profile.external_urls?.spotify,
        image: profile.images?.[0]?.url,
      },
      currentTrack,
      recentTracks: recent.items?.map((i) => ({
        name: i.track.name,
        artist: i.track.artists.map((a) => a.name).join(", "),
        album: i.track.album.name,
      })) || [],
      topArtists: topArtists.items?.map((a) => a.name) || [],
      topTracks: topTracks.items?.map((t) => t.name) || [],
      playlists: playlists.items?.map((p) => ({
        name: p.name,
        totalTracks: p.tracks.total,
        owner: p.owner.display_name,
      })) || [],
      stats: {
        totalPlaylists: playlists.items?.length || 0,
        avgTempo,
        avgEnergy,
        totalRecentTracks: recent.items?.length || 0,
      },
    };
  } catch (err) {
    console.error("❌ Spotify API Error:", err.message);
    throw new Error("Failed to fetch Spotify data");
  }
};
