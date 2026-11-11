(() => {
'use strict';

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ICON = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  trending: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  week: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><circle cx="12" cy="15" r="2.5"/><path d="M12 13.5V15l1 1"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  library: '<path d="M4 4v16M9 4v16M14 6l5 14"/>',
  playlist: '<path d="M3 6h13M3 12h13M3 18h7"/><circle cx="17" cy="18" r="2.5"/><path d="M19.5 18V8l3 1"/>',
  playlists: '<path d="M4 5h12M4 10h12M4 15h7"/><path d="M16 16.5V11l4 1v5.5"/><circle cx="14" cy="18.5" r="2"/><circle cx="18" cy="18" r="2"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  settings: '<path d="M4 7h10"/><circle cx="17" cy="7" r="3"/><path d="M20 17H10"/><circle cx="7" cy="17" r="3"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8"/>',
  wifioff: '<path d="M2 2l20 20M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5-2.7M2 9a15 15 0 0 1 4-2.4M19 12.5a10 10 0 0 0-2.4-1.9"/><circle cx="12" cy="19.5" r=".8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  prev: '<path d="M6 5v14M19 5L9 12l10 7z"/>',
  next: '<path d="M18 5v14M5 5l10 7-10 7z"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 10a4 4 0 0 1 0 8z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>'
};
const icon = (n, cls) => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICON[n]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const wave = () => '<span class="wave"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
const keyOf = (t) => {
  if (t.id != null) return 'i' + t.id;
  if (t.apple_id) return 'apple:' + t.apple_id;
  return 'audius:' + t.audius_id;
};
const year = new Date().getFullYear();

function toast(msg, err) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ================= offline storage (IndexedDB) ================= */
const idb = (() => {
  let dbp;
  const open = () => (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('injyana', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('audio'); r.result.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => {
    try {
      const d = await open();
      return await new Promise((res, rej) => {
        const t = d.transaction(store, mode);
        const rq = fn(t.objectStore(store));
        t.oncomplete = () => res(rq && rq.result);
        t.onerror = () => rej(t.error);
      });
    } catch { return undefined; }
  };
  return {
    get: (s, k) => tx(s, 'readonly', (o) => o.get(k)),
    set: (s, k, v) => tx(s, 'readwrite', (o) => o.put(v, k)),
    del: (s, k) => tx(s, 'readwrite', (o) => o.delete(k)),
    keys: async (s) => (await tx(s, 'readonly', (o) => o.getAllKeys())) || []
  };
})();

/* ================= state + api ================= */
const S = {
  user: null, tracks: [], playlists: [], online: navigator.onLine, downloaded: new Set(),
  queue: [], baseQueue: [], qi: -1, cur: null, playing: false, vol: 1, shuffle: false, repeat: 'off', lastSync: null,
  results: [], q: '', searchErr: '', searching: false, searchSource: 'apple', searchRequestId: 0, filter: 'all', lists: {}, plId: null,
  trendingType: 'tracks', trendingGenre: 'all', trendingItems: [], trendingLoading: false,
  trendingLoadedKey: '', trendingError: '', trendingRequestId: 0,
  weekTracks: [], weekLoaded: false, weekLoading: false, weekError: '', weekMeta: null,
  listenedSeconds: 0, listenLastTime: null, loggedSeq: null
};

async function api(path, opts = {}) {
  const o = { credentials: 'same-origin', headers: {}, ...opts };
  if (o.json) { o.method = o.method || 'POST'; o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(o.json); }
  let r;
  try { r = await fetch(path, o); } catch { const e = new Error('You are offline.'); e.offline = true; throw e; }
  let data = {};
  try { data = await r.json(); } catch { /* empty body */ }
  if (r.status === 401 && !path.startsWith('/api/auth/')) signedOut();
  if (!r.ok) { const e = new Error(data.error || 'Something went wrong.'); e.status = r.status; throw e; }
  return data;
}

const libTrack = (t) => (t.id != null ? S.tracks.find((x) => x.id === t.id) : S.tracks.find((x) => x.audius_id && x.audius_id === t.audius_id));
const supportsApplePreview = () => audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '';
const playable = (t) => !!t && S.online && (
  t.source === 'upload' || t.source === 'audius' ||
  (t.source === 'apple' && !!t.preview_url && supportsApplePreview())
);

async function saveSnapshot() { await idb.set('kv', 'snapshot', { tracks: S.tracks, playlists: S.playlists, t: S.lastSync }); }

async function sync(quiet) {
  if (!S.online || !S.user) return;
  try {
    const d = await api('/api/sync');
    S.tracks = d.tracks; S.playlists = d.playlists; S.lastSync = Date.now();
    await saveSnapshot();
    paintStatus();
    const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
    if (!typing && !$('.modal-back')) renderView();
  } catch (e) { if (!e.offline && !quiet) toast(e.message, true); }
}

async function queueOp(op) { const q = (await idb.get('kv', 'outbox')) || []; q.push(op); await idb.set('kv', 'outbox', q); }
async function flush() {
  if (!S.online) return;
  const q = (await idb.get('kv', 'outbox')) || [];
  if (!q.length) return;
  const rest = [];
  let recordedListen = false;
  for (const op of q) {
    if (op.user_id != null && op.user_id !== S.user.id) { rest.push(op); continue; }
    try {
      await api(op.path, { method: op.method, json: op.json });
      if (op.path === '/api/history/listen') recordedListen = true;
    } catch (e) { if (e.offline) rest.push(op); }
  }
  await idb.set('kv', 'outbox', rest);
  if (recordedListen) {
    S.weekLoaded = false;
    if (S.route === 'week') loadWeek(true);
  }
}
// Optimistic change that is queued when offline and replayed on reconnect.
async function mutate(local, op) {
  local(); await saveSnapshot(); renderView();
  if (!S.online) { await queueOp(op); return; }
  try { await api(op.path, { method: op.method, json: op.json }); } catch (e) { if (e.offline) await queueOp(op); else { toast(e.message, true); sync(true); } }
}

/* ================= theme ================= */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('injyana_theme', t);
  const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#120c33' : '#f1eeff';
}
const toggleTheme = () => { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); if (S.route === 'profile') renderView(); };

/* ================= player ================= */
const audio = $('#audio');
let blobUrl = null;

function setPlaying(p) {
  S.playing = p;
  if (p) S.playedSeq = S.seq;
  document.body.classList.toggle('playing', p);
  paintPlayer();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = p ? 'playing' : 'paused';
}

function position() {
  if (!S.cur) return { cur: 0, dur: 0 };
  return { cur: audio.currentTime || 0, dur: isFinite(audio.duration) ? audio.duration : S.cur.duration || 0 };
}

function tick() {
  const { cur, dur } = position();
  const pct = dur ? Math.min(100, (cur / dur) * 100) : 0;
  $$('[data-prog]').forEach((el) => (el.style.width = pct + '%'));
  const c = $('#np-cur'), d = $('#np-dur'), pd = $('#p-dur');
  if (c) c.textContent = fmt(cur);
  if (d) d.textContent = fmt(dur);
  if (pd) pd.textContent = fmt(dur);
}
function livePlaying() {
  return !!S.cur && !audio.paused && !audio.ended;
}
function createListenEventId() {
  if (typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function recordListeningProgress() {
  if (!S.user || !S.cur || (S.cur.source !== 'audius' && S.cur.source !== 'upload')) return;
  const currentTime = audio.currentTime || 0;
  if (audio.paused) { S.listenLastTime = null; return; }
  if (S.listenLastTime != null) {
    const elapsed = currentTime - S.listenLastTime;
    if (elapsed > 0 && elapsed <= 2.5) S.listenedSeconds += elapsed;
  }
  S.listenLastTime = currentTime;
  const duration = Number.isFinite(audio.duration) ? audio.duration : S.cur.duration || 0;
  const threshold = duration > 0 ? Math.min(30, Math.max(5, duration / 2)) : 30;
  if (S.listenedSeconds < threshold || S.loggedSeq === S.seq) return;

  S.loggedSeq = S.seq;
  const track = S.cur;
  const eventId = createListenEventId();
  const json = track.source === 'upload'
    ? { source: 'upload', track_id: track.id, event_id: eventId }
    : {
      source: 'audius',
      event_id: eventId,
      audius_id: track.audius_id,
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      thumbnail: track.thumbnail,
      thumbnail_mirrors: track.thumbnail_mirrors,
      audius_url: track.audius_url,
      duration: track.duration
    };
  const op = { path: '/api/history/listen', method: 'POST', json };
  api(op.path, { method: op.method, json: op.json })
    .then(() => {
      S.weekLoaded = false;
      if (S.route === 'week') loadWeek(true);
    })
    .catch((error) => {
      if (error.offline) queueOp({ ...op, user_id: S.user.id }).catch((queueError) => {
        console.error('Could not queue listening history:', queueError);
        toast('Could not save your listening history.', true);
      });
      else toast(error.message, true);
    });
}
setInterval(() => {
  const p = livePlaying(); if (p !== S.playing) setPlaying(p); if (S.playing) tick();
}, 400);

async function getBlob(id) { return S.downloaded.has(id) ? idb.get('audio', id) : null; }

async function playTrack(t, list, idx) {
  if (list) {
    S.baseQueue = list.slice();
    S.queue = list.slice();
    S.qi = idx;
    if (S.shuffle) {
      const rest = S.queue.filter((_, i) => i !== idx);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      S.queue = [t, ...rest];
      S.qi = 0;
    }
  }
  if (!playable(t)) {
    if (t && t.source === 'apple') {
      toast(t.preview_url ? 'This browser cannot play Apple Music previews. Open the full track in Apple Music.' : 'No preview is available. Open the full track in Apple Music.', true);
      return;
    }
    toast(S.online ? 'This saved track is no longer playable.' : 'You are offline. Connect to listen.', true);
    return;
  }
  audio.pause();
  S.cur = t; S.auto = true; S.startedAt = Date.now(); S.seq = (S.seq || 0) + 1;
  S.listenedSeconds = 0; S.listenLastTime = null; paintPlayer(); markRows();
  try {
    if (t.source === 'upload') {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      const blob = await getBlob(t.id);
      if (blob) blobUrl = URL.createObjectURL(blob);
      audio.src = blobUrl || `/api/tracks/${t.id}/audio`;
    } else if (t.source === 'apple') {
      audio.src = t.preview_url;
    } else {
      audio.src = `/api/audius/tracks/${encodeURIComponent(t.audius_id)}/stream`;
    }
    audio.volume = S.vol;
    await audio.play();
    mediaSession(t);
  } catch (e) {
    if (e && e.name === 'NotAllowedError') return;
    toast(t.source === 'apple'
      ? 'Could not play this preview. Open the full track in Apple Music.'
      : 'Could not play this track.', true);
  }
}

function toggle() {
  if (!S.cur) {
    if (S.queue.length) return playTrack(S.queue[Math.max(0, S.qi)], null);
    const t = S.tracks.find(playable);
    if (t) return playTrack(t, [t], 0);
    return toast('Pick a song to start listening.');
  }
  if (audio.paused) audio.play(); else audio.pause();
}
function shuffled(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
// Called when a song finishes: moves on to the next song in the queue (the whole search list, library list, etc.).
// Guarded so a song can only advance once, even if two events report its end.
function advance() {
  if (S.advancedFor === S.seq) return;
  S.advancedFor = S.seq;
  if (S.repeat === 'one' && S.cur) {
    S.seq = (S.seq || 0) + 1;
    S.listenedSeconds = 0;
    S.listenLastTime = null;
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error('Could not repeat current track:', error);
      toast('Could not repeat this track.', true);
    });
    return;
  }
  next(true);
}
function next(auto) {
  if (!S.queue.length) return;
  let i = S.qi + 1;
  while (i < S.queue.length && !playable(S.queue[i])) i++;
  if (i >= S.queue.length) {
    if (S.repeat === 'all' && S.baseQueue.length) {
      S.queue = S.shuffle ? shuffled(S.baseQueue.filter(playable)) : S.baseQueue.slice();
      S.qi = -1;
      return next(auto);
    }
    if (auto) setPlaying(false);
    return;
  }
  S.qi = i; playTrack(S.queue[i], null);
}
function prev() {
  if (position().cur > 3) return seek(0);
  let i = S.qi - 1;
  while (i >= 0 && !playable(S.queue[i])) i--;
  if (i < 0) return seek(0);
  S.qi = i; playTrack(S.queue[i], null);
}
function seek(frac) {
  const { dur } = position(); if (!dur) return;
  audio.currentTime = frac * dur;
  tick();
}
function setVolume(v) { S.vol = v; audio.volume = v; localStorage.setItem('injyana_vol', v); }

function toggleShuffle() {
  S.shuffle = !S.shuffle;
  if (S.queue.length && S.qi >= 0) {
    const played = new Set(S.queue.slice(0, S.qi + 1).map(keyOf));
    const remaining = S.baseQueue.filter((track) => playable(track) && !played.has(keyOf(track)));
    S.queue = [...S.queue.slice(0, S.qi + 1), ...(S.shuffle ? shuffled(remaining) : remaining)];
  }
  paintPlayer();
  saveSession();
}

function toggleRepeat() {
  S.repeat = ({ off: 'all', all: 'one', one: 'off' })[S.repeat] || 'off';
  paintPlayer();
  saveSession();
}

audio.addEventListener('play', () => { S.listenLastTime = audio.currentTime; setPlaying(true); });
audio.addEventListener('pause', () => { S.listenLastTime = null; if (!audio.ended) setPlaying(false); });
audio.addEventListener('ended', () => { setPlaying(false); advance(); });
audio.addEventListener('timeupdate', () => { tick(); recordListeningProgress(); });
audio.addEventListener('seeking', () => { S.listenLastTime = null; });
audio.addEventListener('loadedmetadata', tick);

function mediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || 'Injyana', artwork: t.thumbnail ? [{ src: t.thumbnail }] : [{ src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' }] });
  navigator.mediaSession.setActionHandler('play', toggle);
  navigator.mediaSession.setActionHandler('pause', toggle);
  navigator.mediaSession.setActionHandler('nexttrack', () => next());
  navigator.mediaSession.setActionHandler('previoustrack', prev);
}

/* ================= shared markup ================= */
const thumb = (t, play) => `<${play ? 'button' : 'span'} class="thumb" ${play ? `data-act="play" data-list="${play.list}" data-i="${play.i}" aria-label="Play ${esc(t.title)}"` : ''}><span>${esc((t.title || '?').trim().charAt(0).toUpperCase())}</span>${t.thumbnail ? `<img src="${esc(t.thumbnail)}" alt="" loading="lazy" data-hide data-mirrors="${esc(JSON.stringify(t.thumbnail_mirrors || []))}">` : ''}${play ? `<span class="pl">${icon('play', 'i-play')}${icon('pause', 'i-pause')}</span>` : ''}</${play ? 'button' : 'span'}>`;

function footer() {
  return `<footer class="foot"><span class="ek">ek</span><div class="foot-row"><span>Injyana · your melody, anywhere</span><span>© ${year} Injyana. All rights reserved.</span></div></footer>`;
}
function head(eyebrow, title, sub, right) {
  const r = right || '';
  return `<div class="page-head"><div><p class="eyebrow">${esc(eyebrow)}</p><h1 class="title">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>${r}</div>`;
}
function empty(ic, title, text, cta) {
  return `<div class="empty"><div class="ico">${icon(ic)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${cta || ''}</div>`;
}

function rowHTML(t, i, listName, o = {}) {
  const saved = libTrack(t);
  const fav = saved && saved.favorite;
  const dur = t.duration ? fmt(t.duration) : '';
  const details = [
    t.artist || (t.source === 'upload' ? 'Your upload' : ''),
    t.album || '',
    t.genre || '',
    listName === 'week' ? `${t.play_count} play${t.play_count === 1 ? '' : 's'}` : ''
  ].filter(Boolean).map(esc).join(' · ');
  const sourceLink = t.source === 'apple' && t.apple_url
    ? `${details ? ' · ' : ''}<a href="${esc(t.apple_url)}" target="_blank" rel="noopener noreferrer">Apple Music</a>`
    : t.source === 'audius' && t.audius_url
      ? `${details ? ' · ' : ''}<a href="${esc(t.audius_url)}" target="_blank" rel="noopener noreferrer">Audius</a>`
      : '';
  const canPlay = t.source !== 'apple' || (!!t.preview_url && supportsApplePreview());
  const actions = t.source === 'apple'
    ? (t.apple_url ? `<a class="source-action" href="${esc(t.apple_url)}" target="_blank" rel="noopener noreferrer">Full track</a>` : '')
    : `<button class="icon-btn fav ${fav ? 'on' : ''}" data-act="fav" data-list="${listName}" data-i="${i}" aria-label="${fav ? 'Remove from favorites' : 'Add to favorites'}">${icon('heart')}</button>
      <button class="icon-btn" data-act="more" data-list="${listName}" data-i="${i}" aria-label="More options">${icon('more')}</button>`;
  const unavailable = t.source === 'apple' ? false : !playable(t);
  return `<div class="row ${keyOf(t) === (S.cur && keyOf(S.cur)) ? 'current' : ''} ${unavailable ? 'unavailable' : ''}" data-key="${keyOf(t)}">
    <span class="idx">${String(i + 1).padStart(2, '0')}</span>
    ${thumb(t, canPlay ? { list: listName, i } : null)}
    <div class="t"><b>${esc(t.title)}</b><small>${details}${sourceLink}${t.source === 'apple' && !canPlay ? `${details || sourceLink ? ' · ' : ''}${t.preview_url ? 'Preview unsupported in this browser' : 'No preview'}` : ''}</small></div>
    ${wave()}
    <span class="dur">${dur}</span>
    <div class="acts">${actions}</div></div>`;
}
function listHTML(arr, name) {
  S.lists[name] = arr;
  return `<div class="list">${arr.map((t, i) => rowHTML(t, i, name)).join('')}</div>`;
}

/* ================= views ================= */
const gate = (title, sub, text) => `<div class="page-inner">${head('Your audio space', title, sub)}${empty('heart', 'Sign up to unlock this', text, '<button class="btn btn-yellow" data-act="signin">Sign Up/In</button>')}${footer()}</div>`;

const views = {
  home() {
    const h = new Date().getHours();
    const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'night';
    const d = new Date();
    const eyebrow = `${d.toLocaleDateString('en-GB', { weekday: 'long' })} · ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'long' })}`;
    const recent = S.tracks.slice(0, 5);
    return `<div class="page-inner">
      ${head(eyebrow, `Your ${part}, in rotation.`, `A soundtrack for the ${part === 'night' ? 'evening' : 'day'}.`)}
      <div class="home-grid">
        <section class="card hero">
          <span class="tag"><span class="dot"></span>Curated for your ${part === 'night' ? 'late shift' : part + ' shift'}</span>
          <h2>Let the room <span>sound like you.</span></h2>
          <p>Discover music from independent artists and keep the tracks you love close.</p>
          <div><a class="btn btn-yellow" href="#/search">Search ${icon('chevron')}</a></div>
          ${wave()}
        </section>
        <aside class="card np">
          <div class="np-head"><span class="eyebrow" style="margin:0">Now playing</span></div>
          <div class="np-art" id="np-art"></div>
          <div class="np-meta"><div class="t"><b id="np-title">Nothing playing</b><small id="np-artist">Pick a song to begin</small></div><button class="icon-btn fav" id="np-fav" data-act="np-fav" aria-label="Favorite">${icon('heart')}</button></div>
          <div class="progress" data-act="seek"><span data-prog></span></div>
          <div class="times"><span id="np-cur">0:00</span><span id="np-dur">0:00</span></div>
        </aside>
      </div>
      <div class="section-head"><div><p class="eyebrow">A little something</p><h2 class="section">Made for the moment</h2></div></div>
      <div class="moments">
        <button class="moment m1" data-act="moment" data-q="chill"><b>Chill</b><small>mellow sounds for slowing down</small></button>
        <button class="moment m2" data-act="moment" data-q="lofi"><b>Lo-fi</b><small>laid-back beats for focus</small></button>
        <button class="moment m3" data-act="moment" data-q="electronic"><b>Electronic</b><small>independent electronic sounds</small></button>
      </div>
      ${recent.length ? `<div class="section-head"><div><h2 class="section">Recently added</h2></div><a class="link" href="#/library">See all ${icon('chevron')}</a></div>${listHTML(recent, 'recent')}` : ''}
      ${footer()}</div>`;
  },

  search() {
    let body;
    const appleSearch = S.searchSource === 'apple';
    const previewCount = S.results.filter((track) => track.preview_url && supportsApplePreview()).length;
    if (S.searching) body = empty('search', 'Searching…', appleSearch ? 'Looking through the Apple Music catalog.' : 'Looking through Audius.');
    else if (S.searchErr) body = `<div class="notice">${esc(S.searchErr)}</div>`;
    else if (S.results.length) body = `<div class="count-row" style="margin-bottom:6px"><span>${S.results.length} tracks${appleSearch ? ` · ${previewCount} previews` : ' · Audius'}</span>${previewCount ? `<button class="btn btn-yellow" data-act="listall" data-list="search">${icon('play')}Play previews</button>` : ''}</div>${listHTML(S.results, 'search')}`;
    else if (S.q) body = empty('search', 'No matches', 'Try a different song, artist or mood.');
    else body = empty('search', 'What are you in the mood for?', S.online ? 'Search songs or artists to listen to a preview.' : 'Search needs an internet connection.');
    return `<div class="page-inner">
      ${head(appleSearch ? 'Official catalog · Apple Music' : 'Independent music · Audius', 'Find your next feeling.', 'Search official releases, or switch to Audius for independent uploads.')}
      <label class="search-source"><span>Music source</span><select id="search-source" aria-label="Choose a music source"><option value="apple" ${appleSearch ? 'selected' : ''}>Apple Music catalog</option><option value="audius" ${!appleSearch ? 'selected' : ''}>Audius independent</option></select></label>
      <form class="searchbox" id="search-form" role="search">${icon('search')}<input id="q" type="search" placeholder="Search songs, artists, moods…" value="${esc(S.q)}" autocomplete="off" aria-label="Search songs"><button class="btn btn-purple" type="submit">Search</button></form>
      <p class="search-source-note">${appleSearch ? (supportsApplePreview() ? 'Play available previews here; open Apple Music for full tracks.' : 'This browser may not play Apple preview clips; open full tracks in Apple Music.') : 'Audius uploads are community-published; remixes and unofficial uploads may appear.'}</p>
      ${body}${footer()}</div>`;
  },

  trending() {
    const genres = [
      ['all', 'All genres'], ['Hip-Hop/Rap', 'Rap / Hip-hop'], ['R&B/Soul', 'R&B'],
      ['Afrobeats', 'Afro'], ['Gospel', 'Gospel'], ['Dancehall', 'Dancehall'],
      ['Rock', 'Rock'], ['Country', 'Country'], ['Electronic', 'Electronic'],
      ['Pop', 'Pop'], ['Latin', 'Latin'], ['Jazz', 'Jazz'], ['Alternative', 'Alternative'],
      ['Classical', 'Classical'], ['Folk', 'Folk'], ['Metal', 'Metal'], ['Reggae', 'Reggae']
    ];
    const kinds = [
      ['tracks', 'Songs'], ['artists', 'Artists'], ['albums', 'Albums / EPs'], ['playlists', 'Playlists']
    ];
    const body = S.trendingLoading
      ? empty('playlist', 'Finding what is trending…', 'Loading this week’s trending music.')
      : S.trendingError
        ? empty('wifi', 'Could not load trending music.', S.trendingError, '<button class="btn btn-ghost" data-act="refresh-trending">Try again</button>')
        : !S.trendingItems.length
          ? empty('search', 'Nothing trending here yet.', 'Try another genre or category.')
          : S.trendingType === 'tracks'
            ? `<div class="count-row" style="margin-bottom:6px"><span>${S.trendingItems.length} trending songs</span><button class="btn btn-yellow" data-act="listall" data-list="trending">${icon('play')}Play all</button></div>${listHTML(S.trendingItems, 'trending')}`
            : S.trendingType === 'artists'
              ? `<div class="artist-grid">${S.trendingItems.map((artist) => `<a class="release-card" href="${esc(artist.audius_url)}" target="_blank" rel="noopener noreferrer"><span class="release-art artist-art">${artist.thumbnail ? `<img src="${esc(artist.thumbnail)}" alt="" loading="lazy" data-hide data-mirrors="${esc(JSON.stringify(artist.thumbnail_mirrors || []))}">` : esc(artist.name.charAt(0).toUpperCase())}</span><b>${esc(artist.name)}</b><small>@${esc(artist.handle)} · Audius</small></a>`).join('')}</div>`
              : `<div class="release-grid">${S.trendingItems.map((release) => `<a class="release-card" href="${esc(release.audius_url)}" target="_blank" rel="noopener noreferrer"><span class="release-art">${release.thumbnail ? `<img src="${esc(release.thumbnail)}" alt="" loading="lazy" data-hide data-mirrors="${esc(JSON.stringify(release.thumbnail_mirrors || []))}">` : icon('playlist')}</span><b>${esc(release.title)}</b><small>${esc(release.artist)} · ${release.track_count} tracks · Audius</small></a>`).join('')}</div>`;
    return `<div class="page-inner">
      ${head('Discover on Audius', 'Trending this week.', 'Explore tracks and artists making waves, or browse albums, EPs and playlists.')}
      <div class="trending-filters">
        <label><span>Genre</span><select id="trending-genre" aria-label="Filter by genre">${genres.map(([value, label]) => `<option value="${esc(value)}" ${S.trendingGenre === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
        <label><span>Show</span><select id="trending-type" aria-label="Choose what to browse">${kinds.map(([value, label]) => `<option value="${value}" ${S.trendingType === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      </div>
      ${body}${footer()}</div>`;
  },

  week() {
    if (!S.user) return gate('Your week in music.', 'A playlist shaped by what you listened to.', 'Create an account to build your personal rolling 7-day playlist.');
    if (S.weekLoading && !S.weekLoaded) {
      return `<div class="page-inner">${head('Listening recap', 'Your week in music.', 'Building a playlist from songs you have listened to in the past seven days.')}${empty('playlist', 'Putting your week together…', 'We count a listen after you have played a meaningful part of a track.')}${footer()}</div>`;
    }
    if (S.weekError) {
      return `<div class="page-inner">${head('Listening recap', 'Your week in music.', 'A rolling playlist of tracks you have listened to in the past seven days.')}${empty('wifi', 'Could not load your week.', S.weekError, '<button class="btn btn-ghost" data-act="refresh-week">Try again</button>')}${footer()}</div>`;
    }
    const tracks = S.weekTracks;
    const total = S.weekMeta ? S.weekMeta.total_listens : 0;
    const genre = S.weekMeta && S.weekMeta.favorite_genre;
    const summary = `${total} listen${total === 1 ? '' : 's'} · ${tracks.length} track${tracks.length === 1 ? '' : 's'} in the last seven days${genre ? ` · leaning ${genre}` : ''}.`;
    return `<div class="page-inner">
      ${head('Listening recap', 'Your week in music.', summary,
        tracks.length ? `<button class="btn btn-yellow" data-act="listall" data-list="week">${icon('play')}Play all</button>` : '')}
      ${tracks.length ? listHTML(tracks, 'week') : empty('playlist', 'Your week is still quiet.', 'Play a meaningful part of a few tracks and your weekly playlist will start to take shape.', `<a class="link" href="#/search">Discover music ${icon('chevron')}</a>`)}
      ${footer()}</div>`;
  },

  library() {
    if (!S.user) return gate('Your library.', 'Your saved songs live here.', 'Create a free account to save songs and find them on every device.');
    const f = S.filter;
    let arr = S.tracks;
    if (f === 'fav') arr = arr.filter((t) => t.favorite);
    if (f === 'up') arr = arr.filter((t) => t.source === 'upload');
    const n = S.tracks.length;
    return `<div class="page-inner">
      ${head('Your audio space', 'Your library.', n ? `${n} saved track${n === 1 ? '' : 's'}.` : 'No saved tracks in your collection.')}
      <div class="stats">
        <div class="stat"><small>Saved tracks</small><b>${n}</b></div>
        <div class="stat"><small>Uploads</small><b>${S.tracks.filter((t) => t.source === 'upload').length}</b></div>
        <div class="stat"><small>Sync state</small><b>${S.online ? 'Cloud' : 'Offline'}</b></div>
      </div>
      ${n ? `<div class="chips">${[['all', 'All'], ['fav', 'Favorites'], ['up', 'My uploads']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>` : ''}
      ${arr.length ? listHTML(arr, 'library') : n ? empty('heart', 'Nothing here yet', 'No tracks match this filter.') : empty('heart', 'Your library is quiet.', 'Save a track from Home or Search and it will live here.', `<a class="link" href="#/search">Explore audio ${icon('chevron')}</a>`)}
      ${footer()}</div>`;
  },

  playlists() {
    if (!S.user) return gate('Make it a mood.', 'Organize favorite tracks into your own small worlds.', 'Create a free account to build playlists and keep them on every device.');
    const p = S.playlists;
    return `<div class="page-inner">
      ${head('Your audio space', 'Make it a mood.', 'Organize favorite tracks into your own small worlds.')}
      <div class="count-row"><span>${p.length} playlist${p.length === 1 ? '' : 's'}</span><button class="btn btn-yellow" data-act="newpl">${icon('plus')}New playlist</button></div>
      ${p.length ? `<div class="pl-grid">${p.map((x) => `<a class="pl-card" href="#/playlist/${x.id}"><div class="cover">${icon('playlist')}</div><b>${esc(x.name)}</b><small>${x.track_ids.length} track${x.track_ids.length === 1 ? '' : 's'}</small></a>`).join('')}</div>`
        : empty('playlist', 'Start a new rotation.', 'Create a playlist for the mood you want to come back to.', `<button class="link" data-act="newpl">Create playlist ${icon('chevron')}</button>`)}
      ${footer()}</div>`;
  },

  playlist() {
    if (!S.user) return views.playlists();
    const pl = S.playlists.find((x) => x.id === S.plId);
    if (!pl) return `<div class="page-inner">${empty('playlist', 'Playlist not found', 'It may have been deleted on another device.', '<a class="link" href="#/playlists">Back to playlists</a>')}${footer()}</div>`;
    const arr = pl.track_ids.map((id) => S.tracks.find((t) => t.id === id)).filter(Boolean);
    return `<div class="page-inner">
      ${head('Playlist', pl.name, `${arr.length} track${arr.length === 1 ? '' : 's'}`,
        `<div class="detail-actions"><button class="btn btn-yellow" data-act="playall">${icon('play')}Play all</button><button class="btn btn-ghost" data-act="renamepl">${icon('edit')}Rename</button><button class="btn btn-danger" data-act="delpl">${icon('trash')}Delete</button></div>`)}
      ${arr.length ? listHTML(arr, 'playlist') : empty('playlist', 'This playlist is empty.', 'Use the ⋯ menu on any track to add it here.', '<a class="link" href="#/search">Find songs</a>')}
      ${footer()}</div>`;
  },

  uploads() {
    if (!S.user) return gate('Your uploads.', 'Audio you upload will live here.', 'Create a free account to upload your own audio.');
    const arr = S.tracks.filter((t) => t.source === 'upload');
    return `<div class="page-inner">
      ${head('Your audio space', 'Your uploads.', arr.length ? `${arr.length} track${arr.length === 1 ? '' : 's'} you uploaded.` : 'Audio you upload will live here.',
        `<button class="btn btn-ghost" data-act="upload">${icon('upload')}Upload audio</button>`)}
      ${arr.length ? `<div class="count-row" style="margin-bottom:6px"><span>${arr.length} upload${arr.length === 1 ? '' : 's'}</span><button class="btn btn-yellow" data-act="listall" data-list="uploads">${icon('play')}Play all</button></div>${listHTML(arr, 'uploads')}`
        : empty('upload', 'No uploads yet.', 'Upload your own audio files and they will play on every device you sign in on.', `<button class="link" data-act="upload">Upload audio ${icon('chevron')}</button>`)}
      ${footer()}</div>`;
  },

  profile() {
    const dark = document.documentElement.dataset.theme === 'dark';
    if (!S.user) return `<div class="page-inner">
      ${head('Your audio space', 'Your profile.', 'You are browsing as a guest.', '')}
      <div class="settings">
        <div class="account"><div><p class="eyebrow" style="margin:0">Account</p><h3>Guest</h3><small style="color:var(--muted)">Sign up to save songs, build playlists and upload your own audio.</small></div><div style="display:grid;gap:12px;justify-items:end"><span class="avatar">${icon('user')}</span><button class="btn btn-yellow" data-act="signin">Sign Up/In</button></div></div>
        <div class="set-card"><span class="ico">${icon('moon')}</span><div class="grow"><b>Dark listening mode</b><small>Keep the interface low-glare at night.</small></div><button class="switch" role="switch" aria-checked="${dark}" aria-label="Dark listening mode" data-act="theme"></button></div>
      </div>${footer()}</div>`;
    const nT = S.tracks.length, nP = S.playlists.length;
    return `<div class="page-inner">
      ${head('Your audio space', 'Your profile.', 'Your account and listening preferences.', '')}
      <div class="settings">
        <div class="account"><div><p class="eyebrow" style="margin:0">Account</p><h3>${esc(S.user.name)}</h3><small style="color:var(--muted)">${esc(S.user.email)}</small><div style="margin-top:10px;color:var(--faint);font-size:13px">${nT} saved track${nT === 1 ? '' : 's'} · ${nP} playlist${nP === 1 ? '' : 's'}</div></div><div style="display:grid;gap:12px;justify-items:end"><span class="avatar">${esc(S.user.name.charAt(0).toUpperCase())}</span><button class="btn btn-ghost" data-act="signout">${icon('logout')}Sign out</button></div></div>
        <div class="set-card"><span class="ico">${icon('moon')}</span><div class="grow"><b>Dark listening mode</b><small>Keep the interface low-glare at night.</small></div><button class="switch" role="switch" aria-checked="${dark}" aria-label="Dark listening mode" data-act="theme"></button></div>
      </div>${footer()}</div>`;
  }
};

/* ================= shell + routing ================= */
const NAV = [['home', 'Home', 'home'], ['search', 'Search', 'search'], ['trending', 'Trending', 'trending'], ['week', 'Your week', 'week'], ['library', 'Your library', 'library'], ['playlists', 'Playlists', 'playlists']];
const nav2 = () => (S.user ? [['uploads', 'Uploads', 'upload'], ['profile', 'Profile', 'user']] : [['profile', 'Profile', 'user']]);
const navLink = ([r, l, ic]) => `<a href="#/${r}" data-route="${r}">${icon(ic)}<span>${l}</span></a>`;

function renderShell() {
  S.screen = 'app';
  $('#root').innerHTML = `<div class="app">
    <aside class="side">
      <div class="brand"><img src="/assets/logo-mark.png" alt="Injyana"></div>
      <p class="nav-label">Listen</p><nav class="nav" aria-label="Main">${NAV.map(navLink).join('')}</nav>
      <p class="nav-label">Your space</p><nav class="nav" aria-label="Your space">${nav2().map(navLink).join('')}</nav>
      <div class="side-foot"><span class="ek">ek</span><small>© ${year} Injyana. All rights reserved.</small></div>
    </aside>
    <div class="main">
      <header class="topbar"><span class="mobile-brand"><img src="/assets/logo-mark.png" alt="Injyana"></span></header>
      <main class="page" id="view"></main>
    </div>
    <div class="player idle" id="player">
      <div class="info"><span id="p-thumb"></span><div style="min-width:0"><b id="p-title">Nothing playing</b><small id="p-artist">Pick a song to begin</small></div></div>
      <div class="controls">
        <button class="icon-btn mode-btn" data-act="shuffle" id="p-shuffle" aria-label="Shuffle off" aria-pressed="false" title="Shuffle">${icon('shuffle')}</button>
        <button class="icon-btn" data-act="prev" aria-label="Previous">${icon('prev')}</button>
        <button class="play" data-act="toggle" id="p-play" aria-label="Play">${icon('play')}</button>
        <button class="icon-btn" data-act="next" aria-label="Next">${icon('next')}</button>
        <button class="icon-btn mode-btn repeat-btn" data-act="repeat" id="p-repeat" aria-label="Repeat off" aria-pressed="false" title="Repeat off">${icon('repeat')}</button>
      </div>
      <div class="right">${wave()}<span id="p-dur">0:00</span><span class="icon-btn" style="width:auto">${icon('volume')}</span><input class="vol" type="range" min="0" max="1" step="0.02" value="${S.vol}" aria-label="Volume" id="vol"></div>
      <div class="pbar" data-act="seek"><span data-prog></span></div>
    </div></div>`;
  applyTheme(document.documentElement.dataset.theme);
  paintStatus(); paintPlayer();
}

function paintStatus() {
  const sc = $('#sync-card');
  if (sc) {
    sc.className = 'sync-card' + (S.online ? '' : ' offline');
    const when = S.lastSync ? (Date.now() - S.lastSync < 60000 ? 'Synced just now' : 'Synced ' + new Date(S.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'Not synced yet';
    sc.innerHTML = `<span class="ico">${icon('cloud')}</span><div><b>${S.online ? 'Online &amp; ready' : 'Offline mode'}</b><small>${S.online ? when : 'Connect to keep listening'}</small></div>`;
  }
}

function paintPlayer() {
  const t = S.cur, p = $('#player'); if (!p) return;
  p.classList.toggle('idle', !t);
  $('#p-title').textContent = t ? t.title : 'Nothing playing';
  $('#p-artist').textContent = t ? (t.artist || (t.source === 'upload' ? 'Your upload' : '')) : 'Pick a song to begin';
  $('#p-thumb').innerHTML = t ? thumb(t) : thumb({ title: 'i' });
  $('#p-play').innerHTML = icon(S.playing ? 'pause' : 'play');
  $('#p-play').setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
  const shuffle = $('#p-shuffle');
  shuffle.classList.toggle('on', S.shuffle);
  shuffle.setAttribute('aria-pressed', String(S.shuffle));
  shuffle.setAttribute('aria-label', S.shuffle ? 'Shuffle on' : 'Shuffle off');
  shuffle.title = S.shuffle ? 'Shuffle on' : 'Shuffle off';
  const repeat = $('#p-repeat');
  repeat.classList.toggle('on', S.repeat !== 'off');
  repeat.setAttribute('aria-pressed', String(S.repeat !== 'off'));
  repeat.setAttribute('aria-label', `Repeat ${S.repeat}`);
  repeat.title = `Repeat ${S.repeat}`;
  repeat.innerHTML = `${icon('repeat')}${S.repeat === 'one' ? '<span class="repeat-one">1</span>' : ''}`;
  fillNP(); tick();
}

function fillNP() {
  const art = $('#np-art'); if (!art) return;
  const t = S.cur;
  art.innerHTML = t && t.thumbnail ? `<img src="${esc(t.thumbnail)}" alt="" data-hide data-mirrors="${esc(JSON.stringify(t.thumbnail_mirrors || []))}">` : esc(t ? t.title.charAt(0).toUpperCase() : 'i');
  $('#np-title').textContent = t ? t.title : 'Nothing playing';
  $('#np-artist').textContent = t ? (t.artist || 'Your upload') : 'Pick a song to begin';
  const f = $('#np-fav'); const saved = t && libTrack(t);
  f.classList.toggle('on', !!(saved && saved.favorite));
}

function markRows() {
  const k = S.cur && keyOf(S.cur);
  $$('.row').forEach((r) => r.classList.toggle('current', r.dataset.key === k));
}

const rawRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [r, id] = h.split('/');
  if (r === 'playlist') { S.plId = parseInt(id, 10); return 'playlist'; }
  if (r === 'settings') return 'profile';
  if (r === 'downloads') return 'uploads';
  if (r === 'uploads' && !S.user) return 'home'; // guests have no Uploads tab
  return views[r] ? r : 'home';
}
function renderView() {
  if (S.screen !== 'app') return;
  S.route = parseRoute();
  const v = $('#view'); if (!v) return;
  v.innerHTML = views[S.route]();
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (S.route === 'playlist' ? 'playlists' : S.route)));
  fillNP(); tick();
  if (S.route === 'week' && S.user && !S.weekLoaded && !S.weekLoading) loadWeek();
  if (S.route === 'trending' && !S.trendingLoading && S.trendingLoadedKey !== `${S.trendingType}:${S.trendingGenre}`) loadTrending();
}
window.addEventListener('hashchange', () => {
  if (rawRoute() === 'signin') { if (S.screen !== 'auth') renderAuth(authMode()); return; }
  if (S.screen !== 'app') { enterApp(); return; }
  renderView(); window.scrollTo(0, 0);
});
const authMode = () => { const m = sessionStorage.getItem('injyana_mode'); sessionStorage.removeItem('injyana_mode'); return m === 'register' ? 'register' : 'login'; };
function enterApp() { renderShell(); renderView(); restoreScroll(); }

/* ================= auth view ================= */
function renderAuth(mode = 'login') {
  S.screen = 'auth';
  $('#root').innerHTML = `<div class="auth"><div class="card auth-card">
    <img class="logo" src="/assets/logo.png" alt="Injyana - your melody, anywhere">
    <div class="tabs" role="tablist"><button class="${mode === 'login' ? 'on' : ''}" data-tab="login">Sign in</button><button class="${mode === 'register' ? 'on' : ''}" data-tab="register">Create account</button></div>
    <form id="auth-form" novalidate>
      ${mode === 'register' ? '<label class="field"><span>Your name</span><input name="name" autocomplete="name" required></label>' : ''}
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>Password</span><input name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="8" required></label>
      <p class="form-error" id="auth-error"></p>
      <button class="btn btn-yellow" style="width:100%" type="submit">${mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form>${S.user ? '' : '<p style="margin:20px 0 0"><button class="link" data-act="guestback" style="margin:0 auto">Continue without an account</button></p>'}</div>${footer()}</div>`;
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => renderAuth(b.dataset.tab)));
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const { user } = await api(`/api/auth/${mode}`, { json: f });
      S.user = user; await idb.set('kv', 'user', user);
      clearSession();
      await startApp();
      const back = returnHash();
      if (location.hash !== back) location.hash = back; else renderView();
    } catch (err) { $('#auth-error').textContent = err.offline ? 'You need to be online to sign in.' : err.message; btn.disabled = false; }
  });
}

const returnHash = () => { const h = sessionStorage.getItem('injyana_return'); sessionStorage.removeItem('injyana_return'); return h && h !== '#/signin' ? h : '#/home'; };

async function signedOut() {
  if (!S.user) return;
  S.user = null; S.tracks = []; S.playlists = []; S.cur = null; S.queue = []; audio.pause();
  S.weekTracks = []; S.weekLoaded = false; S.weekLoading = false; S.weekError = ''; S.weekMeta = null;
  for (const k of await idb.keys('audio')) await idb.del('audio', k);
  for (const k of ['user', 'snapshot', 'outbox']) await idb.del('kv', k);
  S.downloaded = new Set(); S.q = ''; S.results = []; setPlaying(false);
  clearSession();
  location.hash = '#/home';
  enterApp(); // back to browsing as a guest
}

/* ================= modals ================= */
function openModal(html) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { back.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc_);
  $('#modal-root').appendChild(back);
  const first = $('input, button', back); if (first) first.focus();
  return { el: back.firstElementChild, close };
}

function needAccount(what) {
  const m = openModal(`<h3>Create account</h3><p style="color:var(--muted);margin:0 0 20px">Create an account to ${esc(what)}. You can keep listening without one.</p><div class="actions"><button class="btn btn-ghost" data-x>Not now</button><button class="btn btn-yellow" data-act="signin" data-mode="register">Create account</button></div><p style="margin:18px 0 0;text-align:center;color:var(--muted);font-size:14px">Already have an account? <button class="link" data-act="signin" data-mode="login" style="display:inline">Sign in</button></p>`);
  m.el.querySelector('[data-x]').onclick = m.close;
  return null;
}

function askText(title, value, cta) {
  return new Promise((resolve) => {
    const m = openModal(`<h3>${esc(title)}</h3><form><label class="field"><input name="v" maxlength="80" value="${esc(value || '')}" required></label><div class="actions"><button type="button" class="btn btn-ghost" data-x>Cancel</button><button class="btn btn-yellow">${esc(cta)}</button></div></form>`);
    m.el.querySelector('[data-x]').onclick = () => { m.close(); resolve(null); };
    m.el.querySelector('form').onsubmit = (e) => { e.preventDefault(); const v = e.target.v.value.trim(); m.close(); resolve(v || null); };
  });
}
function confirmBox(title, text, cta) {
  return new Promise((resolve) => {
    const m = openModal(`<h3>${esc(title)}</h3><p style="color:var(--muted);margin:0 0 20px">${esc(text)}</p><div class="actions"><button class="btn btn-ghost" data-x>Cancel</button><button class="btn btn-danger" data-ok>${esc(cta)}</button></div>`);
    m.el.querySelector('[data-x]').onclick = () => { m.close(); resolve(false); };
    m.el.querySelector('[data-ok]').onclick = () => { m.close(); resolve(true); };
  });
}

/* ================= actions ================= */
async function ensureSaved(t) {
  const have = libTrack(t); if (have) return have;
  if (!S.online) throw new Error('Connect to the internet to save this song.');
  const { track } = await api('/api/tracks/audius', {
    json: {
      audius_id: t.audius_id,
      title: t.title,
      artist: t.artist,
      genre: t.genre,
      thumbnail: t.thumbnail,
      thumbnail_mirrors: t.thumbnail_mirrors,
      audius_url: t.audius_url,
      duration: t.duration
    }
  });
  track.duration = track.duration || t.duration || 0;
  S.tracks.unshift(track); await saveSnapshot();
  return track;
}

async function toggleFav(t) {
  if (!S.user) return needAccount('save songs to your favorites');
  try {
    const saved = await ensureSaved(t);
    const val = !saved.favorite;
    await mutate(() => { saved.favorite = val; }, { path: `/api/tracks/${saved.id}`, method: 'PATCH', json: { favorite: val } });
    if (val) toast('Added to favorites');
  } catch (e) { toast(e.message, true); }
}

function openUpload() {
  if (!S.user) return needAccount('upload audio');
  if (!S.online) return toast('Connect to the internet to upload audio.', true);
  const m = openModal(`<h3>Upload audio</h3><form id="up-form">
    <label class="drop"><input type="file" name="audio" accept="audio/*" required><span id="drop-text">Choose an audio file</span></label>
    <label class="field"><span>Title</span><input name="title" maxlength="300" required></label>
    <label class="field"><span>Artist</span><input name="artist" maxlength="200"></label>
    <p class="form-error" id="up-error"></p>
    <div class="actions"><button type="button" class="btn btn-ghost" data-x>Cancel</button><button class="btn btn-yellow" id="up-go">Upload</button></div></form>`);
  const form = m.el.querySelector('form');
  let dur = 0;
  form.querySelector('[data-x]').onclick = m.close;
  form.audio.onchange = () => {
    const f = form.audio.files[0]; if (!f) return;
    $('#drop-text').textContent = f.name;
    if (!form.title.value) form.title.value = f.name.replace(/\.[^.]+$/, '');
    const a = new Audio(URL.createObjectURL(f));
    a.onloadedmetadata = () => { dur = Math.round(a.duration) || 0; URL.revokeObjectURL(a.src); };
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const file = form.audio.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('title', form.title.value); fd.append('artist', form.artist.value); fd.append('duration', dur); fd.append('audio', file);
    const go = $('#up-go'); go.disabled = true; go.textContent = 'Uploading…';
    try {
      const r = await fetch('/api/tracks/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Upload failed.');
      S.tracks.unshift(data.track);
      await saveSnapshot(); m.close(); renderView(); toast('Uploaded');
    } catch (err) { $('#up-error').textContent = err.message; go.disabled = false; go.textContent = 'Upload'; }
  };
}

async function newPlaylist(name) {
  if (!S.user) return needAccount('create playlists');
  name = name || await askText('New playlist', '', 'Create'); if (!name) return null;
  if (!S.online) { toast('Connect to the internet to create a playlist.', true); return null; }
  try {
    const { playlist } = await api('/api/playlists', { json: { name } });
    S.playlists.push(playlist); await saveSnapshot(); renderView(); toast('Playlist created');
    return playlist;
  } catch (e) { toast(e.message, true); return null; }
}

function pickPlaylist(t) {
  if (!S.user) return needAccount('add songs to playlists');
  const draw = () => S.playlists.map((p) => {
    const saved = libTrack(t); const has = saved && p.track_ids.includes(saved.id);
    return `<button class="pick" data-pl="${p.id}">${icon(has ? 'check' : 'playlist')}<span style="flex:1">${esc(p.name)}</span><small style="color:var(--faint)">${p.track_ids.length}</small></button>`;
  }).join('');
  const m = openModal(`<h3>Add to playlist</h3><div id="pl-list">${draw() || '<p style="color:var(--muted)">No playlists yet.</p>'}</div><button class="pick" data-newpl>${icon('plus')}New playlist</button><div class="actions"><button class="btn btn-ghost" data-x>Done</button></div>`);
  m.el.querySelector('[data-x]').onclick = m.close;
  m.el.addEventListener('click', async (e) => {
    const nb = e.target.closest('[data-newpl]');
    if (nb) {
      const p = await newPlaylist(); if (!p) return;
      m.close(); return pickPlaylist(t);
    }
    const b = e.target.closest('[data-pl]'); if (!b) return;
    const p = S.playlists.find((x) => x.id === +b.dataset.pl);
    try {
      const saved = await ensureSaved(t);
      const has = p.track_ids.includes(saved.id);
      await mutate(() => { p.track_ids = has ? p.track_ids.filter((x) => x !== saved.id) : [...p.track_ids, saved.id]; },
        { path: `/api/playlists/${p.id}/tracks/${saved.id}`, method: has ? 'DELETE' : 'PUT' });
      $('#pl-list').innerHTML = draw(); toast(has ? 'Removed from playlist' : 'Added to playlist');
    } catch (err) { toast(err.message, true); }
  });
}

function trackMenu(t, listName) {
  if (!S.user) return needAccount('add songs to playlists');
  const saved = libTrack(t);
  const onPl = listName === 'playlist' && saved;
  const m = openModal(`<h3>${esc(t.title)}</h3>
    <button class="pick" data-m="pl">${icon('playlist')}Add to playlist</button>
    ${onPl ? `<button class="pick" data-m="rmpl">${icon('trash')}Remove from this playlist</button>` : ''}
    ${saved ? `<button class="pick" data-m="rm" style="color:var(--pink)">${icon('trash')}${t.source === 'upload' ? 'Delete upload' : 'Remove from library'}</button>` : ''}
    <div class="actions"><button class="btn btn-ghost" data-x>Close</button></div>`);
  m.el.querySelector('[data-x]').onclick = m.close;
  m.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    m.close();
    if (b.dataset.m === 'pl') pickPlaylist(t);
    if (b.dataset.m === 'rmpl') {
      const p = S.playlists.find((x) => x.id === S.plId);
      mutate(() => { p.track_ids = p.track_ids.filter((x) => x !== saved.id); }, { path: `/api/playlists/${p.id}/tracks/${saved.id}`, method: 'DELETE' });
    }
    if (b.dataset.m === 'rm') {
      if (!(await confirmBox(saved.source === 'upload' ? 'Delete this upload?' : 'Remove from library?', saved.source === 'upload' ? 'The audio file is deleted from your account and leaves your playlists.' : 'It will also leave your playlists.', saved.source === 'upload' ? 'Delete' : 'Remove'))) return;
      if (!S.online) return toast('Connect to the internet to remove tracks.', true);
      try {
        await api(`/api/tracks/${saved.id}`, { method: 'DELETE' });
        S.tracks = S.tracks.filter((x) => x.id !== saved.id);
        S.playlists.forEach((p) => (p.track_ids = p.track_ids.filter((x) => x !== saved.id)));
        await idb.del('audio', saved.id); S.downloaded.delete(saved.id);
        await saveSnapshot(); renderView(); toast('Removed');
      } catch (err) { toast(err.message, true); }
    }
  });
}

const SESS = 'injyana_session_v1';
function saveSession() {
  if (S.screen !== 'app') return;
  try {
    localStorage.setItem(SESS, JSON.stringify({
      uid: S.user ? S.user.id : 0, hash: location.hash, scroll: window.scrollY, q: S.q, results: S.results.slice(0, 25), searchSource: S.searchSource, filter: S.filter,
      cur: S.cur, queue: S.queue.slice(0, 50), baseQueue: S.baseQueue.slice(0, 50), qi: S.qi, pos: S.cur ? position().cur : 0,
      shuffle: S.shuffle, repeat: S.repeat
    }));
  } catch { /* storage full or blocked */ }
}
function clearSession() { try { localStorage.removeItem(SESS); } catch { /* ignore */ } }
function readSession() {
  try { const d = JSON.parse(localStorage.getItem(SESS) || 'null'); return d && d.uid === (S.user ? S.user.id : 0) ? d : null; } catch { return null; }
}
function restoreScroll() {
  const d = readSession();
  if (d && d.hash === location.hash && d.scroll) setTimeout(() => window.scrollTo(0, d.scroll), 50);
}
function restoreSession() {
  const d = readSession(); if (!d) return;
  const refreshLegacySearch = !d.searchSource && d.results && d.results.length > 0;
  S.q = d.q || ''; S.results = refreshLegacySearch ? [] : d.results || []; S.filter = d.filter || 'all';
  S.searchSource = d.searchSource === 'audius' ? 'audius' : 'apple';
  S.shuffle = d.shuffle === true;
  S.repeat = ['off', 'all', 'one'].includes(d.repeat) ? d.repeat : 'off';
  if (d.cur) {
    S.cur = d.cur; S.queue = d.queue || []; S.baseQueue = d.baseQueue || S.queue.slice(); S.qi = d.qi == null ? -1 : d.qi;
    S.seq = (S.seq || 0) + 1; S.hinted = S.seq; S.startedAt = 0;
    if (d.cur.source === 'upload' || d.cur.source === 'audius' || d.cur.source === 'apple') {
      audio.src = d.cur.source === 'upload'
        ? `/api/tracks/${d.cur.id}/audio`
        : d.cur.source === 'apple'
          ? d.cur.preview_url
          : `/api/audius/tracks/${encodeURIComponent(d.cur.audius_id)}/stream`;
      audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = d.pos || 0; } catch { /* not seekable yet */ } }, { once: true });
    }
  }
  paintPlayer(); renderView(); restoreScroll();
  if (refreshLegacySearch && S.q) doSearch(S.q, S.searchSource);
}
setInterval(saveSession, 3000);
window.addEventListener('pagehide', saveSession);
window.addEventListener('beforeunload', saveSession);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveSession(); });

async function doSearch(q, source = S.searchSource) {
  const requestId = ++S.searchRequestId;
  S.q = q; S.searchSource = source === 'audius' ? 'audius' : 'apple'; S.searchErr = ''; S.results = []; S.searching = false;
  if (!q) return renderView();
  if (!S.online) { S.searchErr = 'Search needs an internet connection.'; return renderView(); }
  S.searching = true; renderView();
  try {
    const endpoint = S.searchSource === 'apple' ? '/api/catalog/search' : '/api/audius/search';
    const data = await api(endpoint + '?q=' + encodeURIComponent(q));
    if (requestId === S.searchRequestId) S.results = data.results;
  } catch (e) {
    if (requestId === S.searchRequestId) S.searchErr = e.message;
  }
  if (requestId !== S.searchRequestId) return;
  S.searching = false; renderView(); saveSession();
  const i = $('#q'); if (i) i.focus();
}

async function loadTrending(force = false) {
  const key = `${S.trendingType}:${S.trendingGenre}`;
  if (S.trendingLoading || (!force && S.trendingLoadedKey === key)) return;
  if (!S.online) {
    S.trendingError = 'Connect to the internet to load trending music.';
    S.trendingLoadedKey = key;
    renderView();
    return;
  }
  const requestId = ++S.trendingRequestId;
  S.trendingLoading = true;
  S.trendingError = '';
  renderView();
  try {
    const params = new URLSearchParams({ type: S.trendingType });
    if (S.trendingGenre !== 'all') params.set('genre', S.trendingGenre);
    const data = await api('/api/audius/trending?' + params);
    if (requestId !== S.trendingRequestId) return;
    S.trendingItems = data.results || [];
    S.trendingLoadedKey = key;
  } catch (error) {
    if (requestId !== S.trendingRequestId) return;
    S.trendingError = error.message;
    S.trendingLoadedKey = key;
  } finally {
    if (requestId === S.trendingRequestId) {
      S.trendingLoading = false;
      if (S.route === 'trending') renderView();
    }
  }
}

async function loadWeek(force = false) {
  if (!S.user || S.weekLoading || (S.weekLoaded && !force)) return;
  if (!S.online) {
    S.weekError = 'Connect to the internet to refresh your listening history.';
    S.weekLoaded = true;
    if (S.route === 'week') renderView();
    return;
  }
  S.weekLoading = true;
  S.weekError = '';
  try {
    const data = await api('/api/history/week');
    S.weekTracks = data.tracks || [];
    S.weekMeta = data;
  } catch (error) {
    S.weekError = error.message;
  } finally {
    S.weekLoading = false;
    S.weekLoaded = true;
    if (S.route === 'week') renderView();
  }
}

/* ================= events ================= */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.hasAttribute('data-hide')) return;
  let mirrors = [];
  try { mirrors = JSON.parse(img.dataset.mirrors || '[]'); } catch { /* Ignore malformed cached metadata. */ }
  const next = mirrors[Number(img.dataset.mirrorIndex || 0)];
  if (typeof next === 'string') {
    try {
      const currentUrl = new URL(img.src);
      const mirrorUrl = new URL(next);
      if (currentUrl.protocol === 'https:' && mirrorUrl.protocol === 'https:') {
        img.dataset.mirrorIndex = String(Number(img.dataset.mirrorIndex || 0) + 1);
        currentUrl.host = mirrorUrl.host;
        img.src = currentUrl.href;
        return;
      }
    } catch { /* Fall through to the placeholder. */ }
  }
  img.remove();
}, true);

document.addEventListener('submit', (e) => {
  if (e.target.id === 'search-form') { e.preventDefault(); doSearch($('#q').value.trim()); }
});

document.addEventListener('input', (e) => { if (e.target.id === 'vol') setVolume(+e.target.value); });

document.addEventListener('change', (e) => {
  if (e.target.id === 'search-source') {
    S.searchSource = e.target.value;
    if (S.q) doSearch(S.q, S.searchSource);
    else renderView();
  }
  if (e.target.id === 'trending-genre') {
    S.trendingGenre = e.target.value;
    S.trendingLoadedKey = '';
    loadTrending();
  }
  if (e.target.id === 'trending-type') {
    S.trendingType = e.target.value;
    S.trendingLoadedKey = '';
    loadTrending();
  }
});

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  const item = () => (S.lists[el.dataset.list] || [])[+el.dataset.i];
  switch (act) {
    case 'play': {
      const arr = S.lists[el.dataset.list] || []; const t = arr[+el.dataset.i]; if (!t) return;
      if (S.cur && keyOf(S.cur) === keyOf(t)) return toggle();
      const q = arr.filter(playable);
      return playTrack(t, q, q.indexOf(t));
    }
    case 'listall': {
      const arr = (S.lists[el.dataset.list] || []).filter(playable);
      return arr.length ? playTrack(arr[0], arr, 0) : toast('Nothing playable here.');
    }
    case 'fav': return toggleFav(item());
    case 'np-fav': return S.cur && toggleFav(S.cur);
    case 'more': return trackMenu(item(), el.dataset.list);
    case 'upload': return openUpload();
    case 'newpl': return newPlaylist();
    case 'theme': return toggleTheme();
    case 'toggle': return toggle();
    case 'shuffle': return toggleShuffle();
    case 'repeat': return toggleRepeat();
    case 'next': return next();
    case 'prev': return prev();
    case 'seek': { const r = el.getBoundingClientRect(); return seek((e.clientX - r.left) / r.width); }
    case 'filter': S.filter = el.dataset.f; saveSession(); return renderView();
    case 'refresh-week': S.weekLoaded = false; S.weekError = ''; return loadWeek(true);
    case 'refresh-trending': S.trendingLoadedKey = ''; S.trendingError = ''; return loadTrending(true);
    case 'signin': $$('.modal-back').forEach((m) => m.remove()); sessionStorage.setItem('injyana_return', location.hash || '#/home'); sessionStorage.setItem('injyana_mode', el.dataset.mode || 'login'); location.hash = '#/signin'; return;
    case 'guestback': location.hash = returnHash(); return;
    case 'moment': location.hash = '#/search'; return doSearch(el.dataset.q);
    case 'playall': {
      const pl = S.playlists.find((x) => x.id === S.plId);
      const arr = (pl ? pl.track_ids : []).map((id) => S.tracks.find((t) => t.id === id)).filter(Boolean).filter(playable);
      return arr.length ? playTrack(arr[0], arr, 0) : toast('Nothing playable in this playlist.');
    }
    case 'renamepl': {
      const pl = S.playlists.find((x) => x.id === S.plId);
      const name = await askText('Rename playlist', pl.name, 'Save'); if (!name) return;
      if (!S.online) return toast('Connect to the internet to rename.', true);
      try { await api(`/api/playlists/${pl.id}`, { method: 'PATCH', json: { name } }); pl.name = name; await saveSnapshot(); renderView(); } catch (err) { toast(err.message, true); }
      return;
    }
    case 'delpl': {
      const pl = S.playlists.find((x) => x.id === S.plId);
      if (!(await confirmBox('Delete playlist?', 'The songs stay in your library.', 'Delete'))) return;
      if (!S.online) return toast('Connect to the internet to delete.', true);
      try { await api(`/api/playlists/${pl.id}`, { method: 'DELETE' }); S.playlists = S.playlists.filter((x) => x.id !== pl.id); await saveSnapshot(); location.hash = '#/playlists'; } catch (err) { toast(err.message, true); }
      return;
    }
    case 'signout': { try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* offline */ } S.user && signedOut(); }
  }
});

function setOnline(v) {
  S.online = v; paintStatus();
  if (v && S.route === 'trending') S.trendingLoadedKey = '';
  renderView();
  if (v && S.user) flush().then(() => sync(true));
}
window.addEventListener('online', () => setOnline(true));
window.addEventListener('offline', () => setOnline(false));
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.user) sync(true); });

/* ================= boot ================= */
async function startApp() {
  const snap = await idb.get('kv', 'snapshot');
  if (snap) { S.tracks = snap.tracks || []; S.playlists = snap.playlists || []; S.lastSync = snap.t; }
  for (const k of await idb.keys('audio')) await idb.del('audio', k); // local copies are no longer used
  S.downloaded = new Set();
  renderShell();
  renderView();
  restoreSession();
  await flush(); await sync(true);
}

async function startGuest() {
  if (rawRoute() === 'signin') return renderAuth(authMode());
  renderShell();
  renderView();
  restoreSession();
}

(async function boot() {
  applyTheme(localStorage.getItem('injyana_theme') || 'dark');
  S.vol = parseFloat(localStorage.getItem('injyana_vol') || '1');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  try {
    const { user } = await api('/api/auth/me');
    S.user = user; await idb.set('kv', 'user', user);
  } catch (e) { if (e.offline) S.user = (await idb.get('kv', 'user')) || null; }
  if (S.user) await startApp(); else await startGuest();
  setInterval(() => { if (S.user && S.online && !document.hidden) sync(true); }, 30000);
})();
})();
