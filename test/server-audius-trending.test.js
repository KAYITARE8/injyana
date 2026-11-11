const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { router } = require('../server/audius');

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
    }).on('error', reject);
  });
}

test('Audius trending route filters and normalizes songs, artists, albums and playlists', async () => {
  const originalFetch = global.fetch;
  const requested = [];
  global.fetch = async (input) => {
    const url = new URL(input);
    requested.push(url);
    if (url.pathname.endsWith('/tracks/trending')) {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'track-1', title: 'Trending song', genre: 'Rock', duration: 120,
              is_streamable: true, is_available: true, permalink: '/artist/song',
              artwork: {}, user: { id: 'artist-1', handle: 'artist', name: 'Artist' }
            },
            { id: 'track-2', title: 'Unavailable', is_streamable: false, user: { handle: 'bad' } }
          ]
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        data: [{
          id: 'release-1', playlist_name: 'Release', track_count: 5,
          permalink: '/artist/album/release', artwork: {},
          user: { name: 'Artist' }
        }]
      })
    };
  };

  const app = express();
  app.use('/api/audius', router);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/audius/trending`;
  try {
    const songs = await request(`${base}?type=tracks&genre=Rock`);
    assert.equal(songs.status, 200);
    assert.deepEqual(songs.body.results.map((item) => item.title), ['Trending song']);
    assert.equal(requested[0].searchParams.get('time'), 'week');
    assert.equal(requested[0].searchParams.get('genre'), 'Rock');

    const artists = await request(`${base}?type=artists&genre=Rock`);
    assert.equal(artists.status, 200);
    assert.deepEqual(artists.body.results.map((item) => item.name), ['Artist']);
    assert.equal(artists.body.results[0].audius_url, 'https://audius.co/artist');

    for (const type of ['albums', 'playlists']) {
      const releases = await request(`${base}?type=${type}`);
      assert.equal(releases.status, 200);
      assert.equal(releases.body.results[0].type, type);
      assert.equal(releases.body.results[0].track_count, 5);
    }

    const invalid = await request(`${base}?type=unknown`);
    assert.equal(invalid.status, 400);
    assert.equal(requested.length, 4);
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
