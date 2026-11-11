const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /sslmode=require|render\.com/.test(process.env.DATABASE_URL || '') ? { rejectUnauthorized: false } : undefined
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tracks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('upload','audius','legacy')),
  audius_id TEXT,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  genre TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  thumbnail_mirrors JSONB NOT NULL DEFAULT '[]'::jsonb,
  audius_url TEXT,
  file_name TEXT,
  mime TEXT,
  size BIGINT DEFAULT 0,
  duration INT DEFAULT 0,
  favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audius_id TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS genre TEXT NOT NULL DEFAULT '';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS thumbnail_mirrors JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audius_url TEXT;
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_source_check;
UPDATE tracks SET source='legacy' WHERE source='youtube';
ALTER TABLE tracks ADD CONSTRAINT tracks_source_check CHECK (source IN ('upload','audius','legacy'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_user_audius ON tracks(user_id,audius_id) WHERE audius_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS listening_history (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('upload','audius')),
  track_id INT REFERENCES tracks(id) ON DELETE CASCADE,
  audius_id TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  thumbnail TEXT NOT NULL DEFAULT '',
  thumbnail_mirrors JSONB NOT NULL DEFAULT '[]'::jsonb,
  audius_url TEXT NOT NULL DEFAULT '',
  duration INT NOT NULL DEFAULT 0,
  listened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((source='upload' AND track_id IS NOT NULL) OR (source='audius' AND audius_id IS NOT NULL))
);
ALTER TABLE listening_history ADD COLUMN IF NOT EXISTS event_id TEXT;
UPDATE listening_history SET event_id='legacy-' || id::text WHERE event_id IS NULL;
ALTER TABLE listening_history ALTER COLUMN event_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_listening_user_event ON listening_history(user_id,event_id);
CREATE INDEX IF NOT EXISTS idx_listening_user_time ON listening_history(user_id,listened_at DESC);
CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id INT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id INT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_tracks_user ON tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
`;

async function migrate() { await pool.query(SCHEMA); }
module.exports = { pool, migrate };
