require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { migrate } = require('./db');
const auth = require('./auth');
const library = require('./library');
const audius = require('./audius');

for (const k of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[k]) { console.error(`Missing ${k}. Copy .env.example to .env and fill it in.`); process.exit(1); }
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'https:'],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const searchLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth', authLimiter, auth.router);
app.use('/api/audius', searchLimiter, audius.router);
app.use('/api', auth.requireAuth, library);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Something went wrong.' }); });

const port = process.env.PORT || 3000;
migrate()
  .then(() => app.listen(port, () => console.log(`Injyana running on http://localhost:${port}`)))
  .catch((e) => { console.error('Database setup failed:', e.message); process.exit(1); });
