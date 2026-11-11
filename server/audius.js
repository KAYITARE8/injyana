const express = require('express');

const router = express.Router();
const API_BASE = 'https://api.audius.co/v1';
const API_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();
const TRENDING_GENRES = new Set([
  'Hip-Hop/Rap', 'R&B/Soul', 'Afrobeats', 'Gospel', 'Dancehall', 'Rock',
  'Country', 'Electronic', 'Pop', 'Latin', 'Jazz', 'Alternative',
  'Classical', 'Folk', 'Metal', 'Reggae'
]);
const TRENDING_TYPES = new Set(['tracks', 'artists', 'albums', 'playlists']);

function apiHeaders() {
  const headers = {};
  if (process.env.AUDIUS_API_KEY) headers['x-api-key'] = process.env.AUDIUS_API_KEY;
  return headers;
}

function normalizeTrack(track) {
  if (!track || typeof track !== 'object') return null;
  const artwork = track.artwork || {};
  const id = String(track.id || '');
  if (!id || !track.title || track.is_streamable !== true || track.is_available === false || track.is_unlisted) return null;
  return {
    source: 'audius',
    audius_id: id,
    title: String(track.title).slice(0, 300),
    artist: String((track.user && track.user.name) || 'Unknown artist').slice(0, 200),
    genre: typeof track.genre === 'string' ? track.genre.slice(0, 100) : '',
    thumbnail: String(artwork['480x480'] || artwork['150x150'] || artwork['1000x1000'] || ''),
    thumbnail_mirrors: Array.isArray(artwork.mirrors) ? artwork.mirrors.filter((url) => typeof url === 'string').slice(0, 10) : [],
    duration: Number.isSafeInteger(track.duration) && track.duration >= 0 ? track.duration : 0,
    audius_url: typeof track.permalink === 'string' && track.permalink.startsWith('/')
      ? `https://audius.co${track.permalink}`.slice(0, 1000)
      : ''
  };
}

function audiusLink(permalink) {
  return typeof permalink === 'string' && permalink.startsWith('/') && !permalink.startsWith('//')
    ? `https://audius.co${permalink}`.slice(0, 1000)
    : '';
}

function normalizeRelease(release, type) {
  if (!release || typeof release !== 'object' || !release.id) return null;
  const artwork = release.artwork || {};
  return {
    id: String(release.id),
    title: String(release.playlist_name || release.title || 'Untitled release').slice(0, 300),
    artist: String((release.user && release.user.name) || 'Unknown artist').slice(0, 200),
    thumbnail: String(artwork['480x480'] || artwork['150x150'] || artwork['1000x1000'] || ''),
    thumbnail_mirrors: Array.isArray(artwork.mirrors) ? artwork.mirrors.filter((url) => typeof url === 'string').slice(0, 10) : [],
    track_count: Number.isSafeInteger(release.track_count) && release.track_count >= 0 ? release.track_count : 0,
    type,
    audius_url: audiusLink(release.permalink)
  };
}

function normalizeArtist(user) {
  if (!user || typeof user !== 'object' || !user.handle) return null;
  const picture = user.profile_picture || {};
  return {
    id: String(user.id || user.handle),
    name: String(user.name || user.handle).slice(0, 200),
    handle: String(user.handle).slice(0, 100),
    thumbnail: String(picture['480x480'] || picture['150x150'] || picture['1000x1000'] || ''),
    thumbnail_mirrors: Array.isArray(picture.mirrors) ? picture.mirrors.filter((url) => typeof url === 'string').slice(0, 10) : [],
    audius_url: `https://audius.co/${encodeURIComponent(String(user.handle))}`
  };
}

function cacheResult(key, data) {
  for (const [cachedKey, value] of cache) {
    if (Date.now() - value.t >= CACHE_TTL_MS) cache.delete(cachedKey);
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { t: Date.now(), data });
}

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) return res.json({ results: [] });

  const key = `search:${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) return res.json({ results: hit.data });

  try {
    const url = new URL(`${API_BASE}/tracks/search`);
    url.search = new URLSearchParams({ query: q, limit: '20' });
    const response = await fetch(url, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
    const body = await response.json();
    if (!response.ok) {
      console.error('Audius API error', body && body.error);
      return res.status(502).json({ error: 'Search is unavailable right now.' });
    }

    const results = (Array.isArray(body.data) ? body.data : [])
      .map(normalizeTrack)
      .filter(Boolean);

    cacheResult(key, results);
    res.json({ results });
  } catch (error) {
    console.error('Audius search failed:', error);
    res.status(502).json({ error: 'Search is unavailable right now.' });
  }
});

router.get('/trending', async (req, res) => {
  const type = String(req.query.type || 'tracks');
  const genre = String(req.query.genre || '');
  if (!TRENDING_TYPES.has(type)) return res.status(400).json({ error: 'Choose a valid trending category.' });
  if (genre && !TRENDING_GENRES.has(genre)) return res.status(400).json({ error: 'Choose a valid music genre.' });

  const key = `trending:${type}:${genre}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) return res.json({ results: hit.data });

  const path = type === 'tracks' || type === 'artists' ? 'tracks/trending' : 'playlists/trending';
  const params = { limit: '50', time: 'week' };
  if (genre) params.genre = genre;
  if (type === 'albums' || type === 'playlists') params.type = type === 'albums' ? 'album' : 'playlist';

  try {
    const url = new URL(`${API_BASE}/${path}`);
    url.search = new URLSearchParams(params);
    const response = await fetch(url, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
    const body = await response.json();
    if (!response.ok) {
      console.error('Audius trending API error', body && body.error);
      return res.status(502).json({ error: 'Trending music is unavailable right now.' });
    }

    let results;
    if (type === 'tracks' || type === 'artists') {
      const tracks = (Array.isArray(body.data) ? body.data : [])
        .map((track) => ({ raw: track, normalized: normalizeTrack(track) }))
        .filter((track) => track.normalized);
      if (type === 'tracks') {
        results = tracks.map((track) => track.normalized);
      } else {
        const seen = new Set();
        results = tracks.map(({ raw }) => normalizeArtist(raw.user)).filter((artist) => {
          if (!artist || seen.has(artist.id)) return false;
          seen.add(artist.id);
          return true;
        });
      }
    } else {
      results = (Array.isArray(body.data) ? body.data : [])
        .map((release) => normalizeRelease(release, type))
        .filter(Boolean);
    }

    cacheResult(key, results);
    res.json({ results });
  } catch (error) {
    console.error('Audius trending request failed:', error);
    res.status(502).json({ error: 'Trending music is unavailable right now.' });
  }
});

router.get('/tracks/:id/stream', async (req, res) => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid Audius track ID.' });
  }

  try {
    const response = await fetch(`${API_BASE}/tracks/${encodeURIComponent(req.params.id)}/stream`, {
      headers: apiHeaders(),
      redirect: 'manual',
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      console.error('Audius stream unavailable:', response.status);
      return res.status(502).json({ error: 'This track is unavailable right now.' });
    }
    const streamUrl = new URL(location);
    if (streamUrl.protocol !== 'https:') {
      return res.status(502).json({ error: 'Audius returned an invalid stream URL.' });
    }
    res.redirect(302, streamUrl.href);
  } catch (error) {
    console.error('Audius stream request failed:', error);
    res.status(502).json({ error: 'This track is unavailable right now.' });
  }
});

module.exports = { router, normalizeTrack, normalizeRelease, normalizeArtist };
