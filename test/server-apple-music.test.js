const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { router, normalizeAppleTrack } = require('../server/apple-music');

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

test('Apple Music tracks normalize safe catalog links and optional previews', () => {
  assert.deepEqual(normalizeAppleTrack({
    kind: 'song',
    trackId: 123,
    trackName: 'Yo (Excuse Me Miss)',
    artistName: 'Chris Brown',
    collectionName: 'Chris Brown (Expanded Edition)',
    primaryGenreName: 'R&B/Soul',
    artworkUrl100: 'https://is1-ssl.mzstatic.com/image.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
    trackViewUrl: 'https://music.apple.com/rw/album/yo/123'
  }), {
    source: 'apple',
    apple_id: '123',
    title: 'Yo (Excuse Me Miss)',
    artist: 'Chris Brown',
    album: 'Chris Brown (Expanded Edition)',
    genre: 'R&B/Soul',
    thumbnail: 'https://is1-ssl.mzstatic.com/image.jpg',
    preview_url: 'https://audio-ssl.itunes.apple.com/preview.m4a',
    apple_url: 'https://music.apple.com/rw/album/yo/123',
    duration: 0
  });
  assert.equal(normalizeAppleTrack({
    kind: 'song',
    trackId: 1,
    trackName: 'Track',
    artistName: 'Artist',
    previewUrl: 'http://example.com/audio',
    trackViewUrl: 'https://example.com/track'
  }), null);
});

test('Apple catalog route uses Rwanda storefront and returns normalized songs', async () => {
  const originalFetch = global.fetch;
  let requested;
  global.fetch = async (input) => {
    requested = new URL(input);
    return {
      ok: true,
      json: async () => ({
        results: [{
          kind: 'song',
          trackId: 123,
          trackName: 'Yo (Excuse Me Miss)',
          artistName: 'Chris Brown',
          collectionName: 'Chris Brown (Expanded Edition)',
          trackViewUrl: 'https://music.apple.com/rw/album/yo/123'
        }]
      })
    };
  };

  const app = express();
  app.use('/api/catalog', router);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    const response = await request(`http://127.0.0.1:${server.address().port}/api/catalog/search?q=Chris%20Brown`);
    assert.equal(response.status, 200);
    assert.equal(response.body.results[0].artist, 'Chris Brown');
    assert.equal(response.body.results[0].preview_url, '');
    assert.equal(requested.searchParams.get('term'), 'Chris Brown');
    assert.equal(requested.searchParams.get('entity'), 'song');
    assert.equal(requested.searchParams.get('country'), 'RW');
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
