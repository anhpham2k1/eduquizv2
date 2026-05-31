const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, generateToken } = require('../middleware/auth');

const router = express.Router();

const USERNAME_REGEX = /^\S+$/;

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateUsername(username) {
  return username.length >= 3 && USERNAME_REGEX.test(username);
}

function getStoredEmail(username) {
  return username.includes('@') ? username : `${username}@local.eduquiz.invalid`;
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, password } = req.body;
    const username = normalizeUsername(req.body.username);

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Please enter name, username, and password' });
    }
    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Username must be at least 3 characters and cannot contain spaces' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const storedEmail = getStoredEmail(username);
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, storedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, name, username, email, password_hash, provider, has_password, email_verified)
      VALUES (?, ?, ?, ?, ?, 'LOCAL', 1, 1)
    `).run(id, name.trim(), username, storedEmail, passwordHash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: formatUser(user)
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    const username = normalizeUsername(req.body.username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter username and password' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Username or password is incorrect' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Username or password is incorrect' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: formatUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me - get current user from JWT
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: formatUser(user) });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    hasPassword: !!row.has_password,
    provider: row.provider,
    emailVerified: !!row.email_verified,
    pendingEmail: row.pending_email
  };
}

module.exports = router;
