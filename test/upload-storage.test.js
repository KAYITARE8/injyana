const test = require('node:test');
const assert = require('node:assert/strict');
const { parseByteRange } = require('../server/upload-storage');

test('upload storage parses bounded, open-ended, and suffix byte ranges', () => {
  assert.deepEqual(parseByteRange('bytes=10-19', 100), { start: 10, end: 19, length: 10 });
  assert.deepEqual(parseByteRange('bytes=90-', 100), { start: 90, end: 99, length: 10 });
  assert.deepEqual(parseByteRange('bytes=-20', 100), { start: 80, end: 99, length: 20 });
  assert.deepEqual(parseByteRange('bytes=90-150', 100), { start: 90, end: 99, length: 10 });
  assert.equal(parseByteRange(undefined, 100), null);
});

test('upload storage rejects malformed and unsatisfiable byte ranges', () => {
  for (const range of ['items=1-2', 'bytes=1-2,4-5', 'bytes=-0', 'bytes=10-5', 'bytes=100-']) {
    assert.equal(parseByteRange(range, 100), false, range);
  }
});
