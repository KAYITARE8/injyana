const path = require('path');

const MAX_UPLOAD_MB_DEFAULT = 50;

class InputError extends Error {}

function maxUploadMb(value = process.env.MAX_UPLOAD_MB) {
  if (value === undefined || value === '') return MAX_UPLOAD_MB_DEFAULT;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > Math.floor(Number.MAX_SAFE_INTEGER / (1024 * 1024))) {
    throw new Error('MAX_UPLOAD_MB must be a positive whole number.');
  }
  return parsed;
}

function uploadMetadata(body, originalname) {
  const title = body.title === undefined || body.title === '' ? path.parse(originalname).name : body.title;
  const artist = body.artist === undefined ? '' : body.artist;
  const duration = body.duration === undefined || body.duration === '' ? 0 : Number(body.duration);

  if (typeof title !== 'string' || typeof artist !== 'string') {
    throw new InputError('Track title and artist must be text.');
  }
  if (!Number.isSafeInteger(duration) || duration < 0) {
    throw new InputError('Track duration must be a non-negative whole number.');
  }

  return { title: title.slice(0, 300), artist: artist.slice(0, 200), duration };
}

module.exports = { InputError, maxUploadMb, uploadMetadata };
