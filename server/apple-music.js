const express = require('express');

const router = express.Router();
const API_BASE = 'https://itunes.apple.com/search';
const API_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

function appleUrl(value, hosts) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.has(url.hostname) ? url.href.slice(0, 1000) : '';
  } catch {
    return '';
  }
}

function normalizeAppleTrack(track) {
  if (!track || track.kind !== 'song' || !track.trackId || !track.trackName || !track.artistName) return null;
  const previewUrl = appleUrl(track.previewUrl, new Set(['audio-ssl.itunes.apple.com']));
  const appleUrlValue = appleUrl(track.trackViewUrl, new Set(['music.apple.com', 'itunes.apple.com']));
  if (!appleUrlValue) return null;
  return {
    source: 'apple',
    apple_id: String(track.trackId),
    title: String(track.trackName).slice(0, 300),
    artist: String(track.artistName).slice(0, 200),
    album: String(track.collectionName || '').slice(0, 300),
    genre: String(track.primaryGenreName || '').slice(0, 100),
    thumbnail: typeof track.artworkUrl100 === 'string' && track.artworkUrl100.startsWith('https:')
      ? track.artworkUrl100.slice(0, 1000)
      : '',
    preview_url: previewUrl,
    apple_url: appleUrlValue,
    duration: 0
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
  const query = String(req.query.q || '').trim().slice(0, 120);
  if (!query) return res.json({ results: [] });

  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) return res.json({ results: hit.data });

  try {
    const url = new URL(API_BASE);
    url.search = new URLSearchParams({
      term: query,
      entity: 'song',
      limit: '25',
      country: 'RW'
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
    const body = await response.json();
    if (!response.ok) {
      console.error('Apple Music catalog error', response.status);
      return res.status(502).json({ error: 'Apple Music search is unavailable right now.' });
    }

    const results = (Array.isArray(body.results) ? body.results : [])
      .map(normalizeAppleTrack)
      .filter(Boolean);
    cacheResult(key, results);
    res.json({ results });
  } catch (error) {
    console.error('Apple Music search failed:', error);
    res.status(502).json({ error: 'Apple Music search is unavailable right now.' });
  }
});

module.exports = { router, normalizeAppleTrack };
