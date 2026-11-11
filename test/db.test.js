const test = require('node:test');
const assert = require('node:assert/strict');
const { poolConfig } = require('../server/db');

test('database SSL options are not overridden by sslmode=require in the URL', () => {
  const config = poolConfig('postgresql://user:secret@example.supabase.com:5432/postgres?sslmode=require');
  const url = new URL(config.connectionString);

  assert.equal(url.searchParams.has('sslmode'), false);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
  assert.equal(url.password, 'secret');
});

test('local database URLs do not force SSL', () => {
  const connectionString = 'postgresql://localhost:5432/injyana';

  assert.deepEqual(poolConfig(connectionString), { connectionString });
});
