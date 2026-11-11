const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');
const { pool } = require('./db');

const SECRET = process.env.JWT_SECRET;
const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 1000 * 60 * 60 * 24 * 30
});

function requireAuth(req, res, next) {
  try {
    const t = req.cookies.injyana_token;
    if (!t) throw new Error('no token');
    req.user = jwt.verify(t, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in.' });
  }
}

const router = express.Router();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

function coerceString(value) {
  return typeof value === 'string' ? value : '';
}

function validateRegisterInput(body) {
  const email = coerceString(body && body.email).trim().toLowerCase();
  const password = coerceString(body && body.password);
  const name = coerceString(body && body.name).trim();

  if (!emailOk(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (!name) return { ok: false, error: 'Enter your name.' };

  return {
    ok: true,
    payload: {
      email,
      password,
      name: name.slice(0, 60)
    }
  };
}

function validateLoginInput(body) {
  const email = coerceString(body && body.email).trim().toLowerCase();
  const password = coerceString(body && body.password);

  if (!emailOk(email)) return { ok: false, error: 'Wrong email or password.' };
  if (!password) return { ok: false, error: 'Wrong email or password.' };

  return { ok: true, payload: { email, password } };
}

router.post('/register', async (req, res) => {
  const parsed = validateRegisterInput(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const hash = await bcrypt.hash(parsed.payload.password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name',
      [parsed.payload.email, parsed.payload.name, hash]
    );
    const u = rows[0];
    res.cookie('injyana_token', jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' }), cookieOpts());
    res.json({ user: u });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That email is already registered.' });
    console.error(e);
    res.status(500).json({ error: 'Could not create the account.' });
  }
});

router.post('/login', async (req, res) => {
  const parsed = validateLoginInput(req.body);
  if (!parsed.ok) return res.status(401).json({ error: parsed.error });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [parsed.payload.email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(parsed.payload.password, u.password_hash)))
      return res.status(401).json({ error: 'Wrong email or password.' });
    res.cookie('injyana_token', jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' }), cookieOpts());
    res.json({ user: { id: u.id, email: u.email, name: u.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not sign in.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('injyana_token', cookieOpts());
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id,email,name FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ error: 'Please sign in.' });
  res.json({ user: rows[0] });
});

module.exports = { router, requireAuth, validateRegisterInput, validateLoginInput };
