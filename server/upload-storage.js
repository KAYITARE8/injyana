const fs = require('fs');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

const provider = process.env.UPLOAD_STORAGE || 'local';
if (provider !== 'local' && provider !== 'r2') {
  throw new Error('UPLOAD_STORAGE must be either local or r2.');
}

function createR2Client() {
  const required = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing ${missing.join(', ')} for Cloudflare R2 uploads.`);
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
}

const client = provider === 'r2' ? createR2Client() : null;

function parseByteRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || size <= 0 || (!match[1] && !match[2])) return false;

  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return false;
    end = Math.min(end, size - 1);
  }
  return { start, end, length: end - start + 1 };
}

async function putObject(key, file) {
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: fs.createReadStream(file.path),
    ContentLength: file.size,
    ContentType: file.mimetype
  }));
}

async function getObject(key, range) {
  const response = await client.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {})
  }));
  return response.Body;
}

async function removeObject(key) {
  await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
}

module.exports = {
  provider,
  parseByteRange,
  putObject,
  getObject,
  removeObject
};
