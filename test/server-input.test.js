const test = require('node:test');
const assert = require('node:assert/strict');
const { InputError, maxUploadMb, uploadMetadata } = require('../server/input');
const { validateRegisterInput, validateLoginInput } = require('../server/auth');
const { normalizeTrack, normalizeRelease, normalizeArtist } = require('../server/audius');

test('upload size defaults to 50 MB and accepts a positive integer', () => {
  assert.equal(maxUploadMb(''), 50);
  assert.equal(maxUploadMb('12'), 12);
});

test('upload size rejects invalid configuration', () => {
  for (const value of ['0', '-1', '2.5', '12mb', 'Infinity']) {
    assert.throws(() => maxUploadMb(value), /MAX_UPLOAD_MB/);
  }
});

test('upload metadata uses the filename as the default title and validates fields', () => {
  assert.deepEqual(uploadMetadata({ artist: 'Artist', duration: '123' }, 'song.mp3'), {
    title: 'song',
    artist: 'Artist',
    duration: 123
  });
  assert.throws(() => uploadMetadata({ title: {}, duration: '0' }, 'song.mp3'), InputError);
  assert.throws(() => uploadMetadata({ title: 'song', duration: '1.5' }, 'song.mp3'), InputError);
  assert.throws(() => uploadMetadata({ title: 'song', duration: '-1' }, 'song.mp3'), InputError);
});

test('auth validation normalizes inputs and rejects weak payloads', () => {
  assert.deepEqual(validateRegisterInput({ email: '  USER@EXAMPLE.com ', password: 'secret123', name: '  Alice  ' }), {
    ok: true,
    payload: { email: 'user@example.com', password: 'secret123', name: 'Alice' }
  });
  assert.deepEqual(validateLoginInput({ email: '  USER@EXAMPLE.com ', password: 'secret123' }), {
    ok: true,
    payload: { email: 'user@example.com', password: 'secret123' }
  });
  assert.equal(validateRegisterInput({ email: 'bad', password: 'short', name: 'A' }).ok, false);
  assert.equal(validateRegisterInput({ email: 'good@example.com', password: 'short', name: 'A' }).error, 'Password must be at least 8 characters.');
  assert.equal(validateLoginInput({ email: 'good@example.com', password: '' }).error, 'Wrong email or password.');
});

test('Audius search results normalize playable tracks and preserve artwork mirrors', () => {
  assert.deepEqual(normalizeTrack({
    id: 'mWB22',
    title: 'Ambient Snow',
    duration: 509,
    genre: 'Ambient',
    is_streamable: true,
    is_available: true,
    permalink: '/artist/ambient-snow',
    artwork: {
      '480x480': 'https://content.example/480.jpg',
      mirrors: ['https://mirror.example'],
    },
    user: { name: 'Blop' }
  }), {
    source: 'audius',
    audius_id: 'mWB22',
    title: 'Ambient Snow',
    artist: 'Blop',
    genre: 'Ambient',
    thumbnail: 'https://content.example/480.jpg',
    thumbnail_mirrors: ['https://mirror.example'],
    duration: 509,
    audius_url: 'https://audius.co/artist/ambient-snow'
  });
  assert.equal(normalizeTrack({ id: 'x', title: 'Unavailable', is_streamable: false }), null);
});

test('Audius trending releases and artists normalize links and artwork', () => {
  assert.deepEqual(normalizeRelease({
    id: 'album-1',
    playlist_name: 'First Light',
    track_count: 7,
    permalink: '/artist/album/first-light',
    artwork: { '480x480': 'https://content.example/album.jpg', mirrors: ['https://mirror.example'] },
    user: { name: 'Artist' }
  }, 'albums'), {
    id: 'album-1',
    title: 'First Light',
    artist: 'Artist',
    thumbnail: 'https://content.example/album.jpg',
    thumbnail_mirrors: ['https://mirror.example'],
    track_count: 7,
    type: 'albums',
    audius_url: 'https://audius.co/artist/album/first-light'
  });
  assert.equal(normalizeRelease({ id: 'bad', permalink: '//example.com/path' }, 'playlists').audius_url, '');
  assert.deepEqual(normalizeArtist({
    id: 'artist-1',
    name: 'Artist',
    handle: 'artist',
    profile_picture: { '480x480': 'https://content.example/artist.jpg' }
  }), {
    id: 'artist-1',
    name: 'Artist',
    handle: 'artist',
    thumbnail: 'https://content.example/artist.jpg',
    thumbnail_mirrors: [],
    audius_url: 'https://audius.co/artist'
  });
});
