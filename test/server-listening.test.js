const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { pool } = require('../server/db');
const library = require('../server/library');

async function withLibrary(mockQuery, run) {
  const originalQuery = pool.query;
  pool.query = mockQuery;
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: 7 }; next(); });
  app.use('/api', library);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    await run(`http://127.0.0.1:${server.address().port}/api`);
  } finally {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('weekly playlist aggregates the past week and groups tracks by top genre and artist', async () => {
  await withLibrary(async (sql) => {
    if (sql.startsWith('DELETE FROM listening_history')) return { rows: [], rowCount: 0 };
    if (sql.includes('COUNT(*)::int AS play_count')) {
      return {
        rowCount: 3,
        rows: [
          { source: 'audius', audius_id: 'a1', track_id: null, title: 'Ambient', artist: 'One', genre: 'Ambient', thumbnail: '', thumbnail_mirrors: [], audius_url: '', duration: 60, play_count: 2, last_played: '2026-11-09T12:00:00Z' },
          { source: 'audius', audius_id: 'r1', track_id: null, title: 'Rock', artist: 'Two', genre: 'Rock', thumbnail: '', thumbnail_mirrors: [], audius_url: '', duration: 60, play_count: 3, last_played: '2026-11-09T12:00:00Z' },
          { source: 'upload', audius_id: null, track_id: 44, title: 'Local rock', artist: 'Three', genre: 'Rock', thumbnail: '', thumbnail_mirrors: [], audius_url: '', duration: 60, play_count: 1, last_played: '2026-11-09T12:00:00Z' }
        ]
      };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }, async (base) => {
    const response = await fetch(`${base}/history/week`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.total_listens, 6);
    assert.equal(body.favorite_genre, 'rock');
    assert.deepEqual(body.tracks.map((track) => track.title), ['Rock', 'Local rock', 'Ambient']);
    assert.equal(body.tracks[1].id, 44);
  });
});

test('listening history validates events and uses the event ID to deduplicate retries', async () => {
  let inserted = 0;
  await withLibrary(async (sql, params) => {
    if (sql.includes('INSERT INTO listening_history')) {
      inserted += 1;
      assert.match(sql, /ON CONFLICT \(user_id,event_id\) DO NOTHING/);
      assert.equal(params[0], 'event_123456');
      assert.equal(params[1], 7);
      assert.equal(params.length, 10);
      return { rows: [], rowCount: inserted === 1 ? 1 : 0 };
    }
    if (sql.startsWith('DELETE FROM listening_history')) return { rows: [], rowCount: 0 };
    throw new Error(`Unexpected query: ${sql}`);
  }, async (base) => {
    const invalid = await fetch(`${base}/history/listen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'audius', audius_id: 'abc', title: 'Song' })
    });
    assert.equal(invalid.status, 400);
    assert.equal(inserted, 0);

    const request = () => fetch(`${base}/history/listen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'audius',
        event_id: 'event_123456',
        audius_id: 'abc',
        title: 'Song',
        artist: 'Artist',
        genre: 'Jazz'
      })
    });
    assert.equal((await request()).status, 201);
    assert.equal((await request()).status, 201);
    assert.equal(inserted, 2);
  });
});
