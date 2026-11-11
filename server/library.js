const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pool } = require('./db');
const { InputError, maxUploadMb, uploadMetadata } = require('./input');
const uploadStorage = require('./upload-storage');

const router = express.Router();
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const UPLOAD_TEMP_ROOT = path.join(UPLOAD_ROOT, '.tmp');
const MAX_MB = maxUploadMb();

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (uploadStorage.provider === 'r2') {
      fs.mkdirSync(UPLOAD_TEMP_ROOT, { recursive: true });
      return cb(null, UPLOAD_TEMP_ROOT);
    }
    const dir = path.join(UPLOAD_ROOT, String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase().slice(0, 8))
});
const upload = multer({
  storage: localStorage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^audio\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only audio files can be uploaded.'))
});

const TRACK_COLS = 'id,source,audius_id,title,artist,genre,thumbnail,thumbnail_mirrors,audius_url,duration,favorite,size,created_at';

// ---- Sync: one call returns everything in this account's library.
router.get('/sync', async (req, res) => {
  const uid = req.user.id;
  const [tracks, playlists, links] = await Promise.all([
    pool.query(`SELECT ${TRACK_COLS} FROM tracks WHERE user_id=$1 ORDER BY created_at DESC`, [uid]),
    pool.query('SELECT id,name,created_at FROM playlists WHERE user_id=$1 ORDER BY created_at', [uid]),
    pool.query(
      `SELECT pt.playlist_id, pt.track_id FROM playlist_tracks pt
       JOIN playlists p ON p.id=pt.playlist_id WHERE p.user_id=$1 ORDER BY pt.position`, [uid])
  ]);
  const byPl = {};
  links.rows.forEach((l) => (byPl[l.playlist_id] ||= []).push(l.track_id));
  res.json({
    tracks: tracks.rows,
    playlists: playlists.rows.map((p) => ({ ...p, track_ids: byPl[p.id] || [] })),
    serverTime: Date.now()
  });
});

router.post('/history/listen', async (req, res) => {
  const body = req.body || {};
  const eventId = typeof body.event_id === 'string' ? body.event_id : '';
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(eventId)) return res.status(400).json({ error: 'Invalid listening event.' });
  if (body.source === 'upload') {
    const trackId = Number(body.track_id);
    if (!Number.isSafeInteger(trackId) || trackId < 1) return res.status(400).json({ error: 'Invalid track.' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO listening_history(event_id,user_id,source,track_id,title,artist,genre,thumbnail,duration)
         SELECT $3,user_id,'upload',id,title,artist,genre,thumbnail,duration
         FROM tracks WHERE id=$1 AND user_id=$2 AND source='upload'
         ON CONFLICT (user_id,event_id) DO NOTHING
         RETURNING id`,
        [trackId, req.user.id, eventId]
      );
      if (!rows[0]) {
        const { rowCount } = await pool.query(
          "SELECT 1 FROM tracks WHERE id=$1 AND user_id=$2 AND source='upload'",
          [trackId, req.user.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'Track not found.' });
      }
      await pool.query("DELETE FROM listening_history WHERE user_id=$1 AND listened_at < now() - interval '14 days'", [req.user.id]);
      return res.status(201).json({ ok: true });
    } catch (error) {
      console.error('Could not record upload listen:', error);
      return res.status(500).json({ error: 'Could not update your listening history.' });
    }
  }

  const {
    audius_id, title, artist, genre, thumbnail, thumbnail_mirrors, audius_url, duration
  } = body;
  if (body.source !== 'audius' || typeof audius_id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(audius_id) ||
      typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Invalid track.' });
  }
  const mirrors = Array.isArray(thumbnail_mirrors)
    ? thumbnail_mirrors.filter((url) => {
      if (typeof url !== 'string') return false;
      try { return new URL(url).protocol === 'https:'; } catch { return false; }
    }).slice(0, 10)
    : [];
  let audiusLink = '';
  try {
    const candidate = new URL(audius_url);
    if (candidate.origin === 'https://audius.co') audiusLink = candidate.href.slice(0, 1000);
  } catch { /* Optional metadata; the listen can still be recorded without a link. */ }
  try {
    await pool.query(
      `INSERT INTO listening_history(
         event_id,user_id,source,audius_id,title,artist,genre,thumbnail,thumbnail_mirrors,audius_url,duration
       ) VALUES($1,$2,'audius',$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id,event_id) DO NOTHING`,
      [
        eventId,
        req.user.id,
        audius_id,
        title.trim().slice(0, 300),
        typeof artist === 'string' ? artist.slice(0, 200) : '',
        typeof genre === 'string' ? genre.slice(0, 100) : '',
        typeof thumbnail === 'string' ? thumbnail.slice(0, 500) : '',
        JSON.stringify(mirrors),
        audiusLink,
        Number.isSafeInteger(duration) && duration >= 0 ? duration : 0
      ]
    );
    await pool.query("DELETE FROM listening_history WHERE user_id=$1 AND listened_at < now() - interval '14 days'", [req.user.id]);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Could not record Audius listen:', error);
    res.status(500).json({ error: 'Could not update your listening history.' });
  }
});

router.get('/history/week', async (req, res) => {
  try {
    await pool.query("DELETE FROM listening_history WHERE user_id=$1 AND listened_at < now() - interval '14 days'", [req.user.id]);
    const { rows } = await pool.query(
      `SELECT source,audius_id,track_id,title,artist,genre,thumbnail,thumbnail_mirrors,audius_url,duration,
         COUNT(*)::int AS play_count,MAX(listened_at) AS last_played
       FROM listening_history
       WHERE user_id=$1 AND listened_at >= now() - interval '7 days'
       GROUP BY source,audius_id,track_id,title,artist,genre,thumbnail,thumbnail_mirrors,audius_url,duration
       ORDER BY play_count DESC,last_played DESC`,
      [req.user.id]
    );
    rows.forEach((track) => {
      if (track.source === 'upload') track.id = track.track_id;
    });
    const genres = new Map();
    const artists = new Map();
    let totalListens = 0;
    for (const track of rows) {
      totalListens += track.play_count;
      const genre = track.genre.trim().toLowerCase();
      const artist = track.artist.trim().toLowerCase();
      if (genre) genres.set(genre, (genres.get(genre) || 0) + track.play_count);
      if (artist) artists.set(artist, (artists.get(artist) || 0) + track.play_count);
    }
    const topGenre = [...genres.entries()].sort((a, b) => b[1] - a[1])[0];
    const topArtist = [...artists.entries()].sort((a, b) => b[1] - a[1])[0];
    rows.sort((a, b) => {
      const aRelated = (topGenre && a.genre.trim().toLowerCase() === topGenre[0] ? 1 : 0) +
        (topArtist && a.artist.trim().toLowerCase() === topArtist[0] ? 1 : 0);
      const bRelated = (topGenre && b.genre.trim().toLowerCase() === topGenre[0] ? 1 : 0) +
        (topArtist && b.artist.trim().toLowerCase() === topArtist[0] ? 1 : 0);
      return bRelated - aRelated || b.play_count - a.play_count ||
        new Date(b.last_played) - new Date(a.last_played);
    });
    res.json({
      tracks: rows,
      total_listens: totalListens,
      favorite_genre: topGenre ? topGenre[0] : '',
      window_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Could not load weekly listening history:', error);
    res.status(500).json({ error: 'Could not load your weekly playlist.' });
  }
});

// ---- Tracks
router.post('/tracks/audius', async (req, res) => {
  const { audius_id, title, artist, genre, thumbnail, thumbnail_mirrors, audius_url, duration } = req.body || {};
  if (typeof audius_id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(audius_id) || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Missing or invalid track details.' });
  }
  const mirrors = Array.isArray(thumbnail_mirrors)
    ? thumbnail_mirrors.filter((url) => {
      if (typeof url !== 'string') return false;
      try { return new URL(url).protocol === 'https:'; } catch { return false; }
    }).slice(0, 10)
    : [];
  let audiusLink = '';
  try {
    const candidate = new URL(audius_url);
    if (candidate.origin === 'https://audius.co') audiusLink = candidate.href.slice(0, 1000);
  } catch { /* Optional metadata; the track remains saveable without a link. */ }
  try {
    const { rows } = await pool.query(
      `INSERT INTO tracks(user_id,source,audius_id,title,artist,genre,thumbnail,thumbnail_mirrors,audius_url,duration)
       VALUES($1,'audius',$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id,audius_id) WHERE audius_id IS NOT NULL
       DO UPDATE SET title=EXCLUDED.title,artist=EXCLUDED.artist,genre=EXCLUDED.genre,thumbnail=EXCLUDED.thumbnail,
         thumbnail_mirrors=EXCLUDED.thumbnail_mirrors,audius_url=EXCLUDED.audius_url,duration=EXCLUDED.duration
       RETURNING ${TRACK_COLS}`,
      [
        req.user.id,
        audius_id,
        title.trim().slice(0, 300),
        typeof artist === 'string' ? artist.slice(0, 200) : '',
        typeof genre === 'string' ? genre.slice(0, 100) : '',
        typeof thumbnail === 'string' ? thumbnail.slice(0, 500) : '',
        JSON.stringify(mirrors),
        audiusLink,
        Number.isSafeInteger(duration) && duration >= 0 ? duration : 0
      ]
    );
    res.json({ track: rows[0] });
  } catch (error) {
    console.error('Could not save Audius track:', error);
    res.status(500).json({ error: 'Could not save the track.' });
  }
});

router.post('/tracks/upload', (req, res) => {
  upload.single('audio')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? `File is larger than ${MAX_MB} MB.` : err.message });
    if (!req.file) return res.status(400).json({ error: 'Choose an audio file.' });
    const fileName = uploadStorage.provider === 'r2'
      ? `${req.user.id}/${crypto.randomBytes(12).toString('hex') + path.extname(req.file.originalname).toLowerCase().slice(0, 8)}`
      : req.file.filename;
    let remoteUpload = false;
    try {
      const { title, artist, duration } = uploadMetadata(req.body || {}, req.file.originalname);
      if (uploadStorage.provider === 'r2') {
        await uploadStorage.putObject(fileName, req.file);
        remoteUpload = true;
      }
      const { rows } = await pool.query(
        `INSERT INTO tracks(user_id,source,title,artist,file_name,mime,size,duration)
         VALUES($1,'upload',$2,$3,$4,$5,$6,$7) RETURNING ${TRACK_COLS}`,
        [req.user.id, title, artist, fileName, req.file.mimetype, req.file.size, duration]
      );
      if (uploadStorage.provider === 'r2') {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Could not remove temporary upload:', unlinkErr);
        });
      }
      res.json({ track: rows[0] });
    } catch (e) {
      if (remoteUpload) {
        try { await uploadStorage.removeObject(fileName); }
        catch (cleanupError) { console.error('Could not remove failed remote upload:', cleanupError); }
      }
      if (req.file.path) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Could not remove failed upload:', unlinkErr);
        });
      }
      if (e instanceof InputError) {
        return res.status(400).json({ error: e.message });
      }
      console.error(e);
      res.status(500).json({ error: 'Could not save the uploaded track.' });
    }
  });
});

router.get('/tracks/:id/audio', async (req, res) => {
  const { rows } = await pool.query("SELECT file_name,mime,size FROM tracks WHERE id=$1 AND user_id=$2 AND source='upload'", [req.params.id, req.user.id]);
  const t = rows[0];
  if (!t) return res.status(404).json({ error: 'Track not found.' });
  if (uploadStorage.provider === 'r2') {
    const range = uploadStorage.parseByteRange(req.headers.range, Number(t.size));
    if (range === false) {
      res.set('Content-Range', `bytes */${t.size}`);
      return res.status(416).end();
    }
    try {
      const body = await uploadStorage.getObject(t.file_name, range);
      res.set('Accept-Ranges', 'bytes');
      res.type(t.mime || 'audio/mpeg');
      if (range) {
        res.status(206);
        res.set('Content-Range', `bytes ${range.start}-${range.end}/${t.size}`);
        res.set('Content-Length', String(range.length));
      } else {
        res.set('Content-Length', String(t.size));
      }
      body.on('error', (error) => {
        console.error('Could not stream remote upload:', error);
        if (res.headersSent) res.destroy(error);
        else res.status(502).json({ error: 'Could not stream the uploaded track.' });
      });
      body.pipe(res);
    } catch (error) {
      console.error('Could not load remote upload:', error);
      res.status(502).json({ error: 'Could not stream the uploaded track.' });
    }
    return;
  }
  const file = path.join(UPLOAD_ROOT, String(req.user.id), t.file_name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File is missing on the server.' });
  res.type(t.mime || 'audio/mpeg');
  res.sendFile(file); // supports Range requests for seeking
});

router.patch('/tracks/:id', async (req, res) => {
  const { favorite } = req.body || {};
  const { rows } = await pool.query(
    `UPDATE tracks SET favorite=$1 WHERE id=$2 AND user_id=$3 RETURNING ${TRACK_COLS}`,
    [!!favorite, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Track not found.' });
  res.json({ track: rows[0] });
});

router.delete('/tracks/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM tracks WHERE id=$1 AND user_id=$2 RETURNING file_name', [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Track not found.' });
  if (rows[0].file_name) {
    if (uploadStorage.provider === 'r2') {
      try { await uploadStorage.removeObject(rows[0].file_name); }
      catch (error) {
        console.error('Could not remove remote upload:', error);
        return res.status(502).json({ error: 'Track removed, but its stored audio could not be deleted.' });
      }
    } else {
      fs.unlink(path.join(UPLOAD_ROOT, String(req.user.id), rows[0].file_name), (error) => {
        if (error) console.error('Could not remove uploaded audio:', error);
      });
    }
  }
  res.json({ ok: true });
});

// ---- Playlists
router.post('/playlists', async (req, res) => {
  const name = String((req.body || {}).name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Name the playlist.' });
  const { rows } = await pool.query('INSERT INTO playlists(user_id,name) VALUES($1,$2) RETURNING id,name,created_at', [req.user.id, name]);
  res.json({ playlist: { ...rows[0], track_ids: [] } });
});

router.patch('/playlists/:id', async (req, res) => {
  const name = String((req.body || {}).name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Name the playlist.' });
  const { rows } = await pool.query('UPDATE playlists SET name=$1 WHERE id=$2 AND user_id=$3 RETURNING id,name', [name, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Playlist not found.' });
  res.json({ playlist: rows[0] });
});

router.delete('/playlists/:id', async (req, res) => {
  await pool.query('DELETE FROM playlists WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

async function ownsBoth(uid, pid, tid) {
  const a = await pool.query('SELECT 1 FROM playlists WHERE id=$1 AND user_id=$2', [pid, uid]);
  const b = await pool.query('SELECT 1 FROM tracks WHERE id=$1 AND user_id=$2', [tid, uid]);
  return a.rowCount && b.rowCount;
}

router.put('/playlists/:id/tracks/:trackId', async (req, res) => {
  if (!(await ownsBoth(req.user.id, req.params.id, req.params.trackId))) return res.status(404).json({ error: 'Not found.' });
  await pool.query(
    `INSERT INTO playlist_tracks(playlist_id,track_id,position)
     VALUES($1,$2,COALESCE((SELECT MAX(position)+1 FROM playlist_tracks WHERE playlist_id=$1),0))
     ON CONFLICT DO NOTHING`, [req.params.id, req.params.trackId]);
  res.json({ ok: true });
});

router.delete('/playlists/:id/tracks/:trackId', async (req, res) => {
  if (!(await ownsBoth(req.user.id, req.params.id, req.params.trackId))) return res.status(404).json({ error: 'Not found.' });
  await pool.query('DELETE FROM playlist_tracks WHERE playlist_id=$1 AND track_id=$2', [req.params.id, req.params.trackId]);
  res.json({ ok: true });
});

module.exports = router;
