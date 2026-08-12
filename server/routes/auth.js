const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, bio: u.bio, role: u.role, credits: u.credits, created_at: u.created_at };
}

// ---- FR1: Registration & Skill Profile ----
router.post('/register', (req, res) => {
  const { name, email, password, bio } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 8);
  const info = db.prepare(
    `INSERT INTO users (name, email, password_hash, bio, credits) VALUES (?,?,?,?,3)`
  ).run(name, email, hash, bio || '');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (user.is_banned) return res.status(403).json({ error: 'This account has been banned by an admin.' });
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});

router.put('/me', requireAuth, (req, res) => {
  const { name, bio } = req.body;
  db.prepare('UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio) WHERE id = ?')
    .run(name, bio, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

// Public profile view (for browsing peers)
router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const skills = db.prepare('SELECT * FROM skills WHERE user_id = ?').all(user.id);
  const ratings = db.prepare('SELECT AVG(score) avg, COUNT(*) count FROM ratings WHERE rated_id = ?').get(user.id);
  res.json({ user: publicUser(user), skills, rating: { avg: ratings.avg || 0, count: ratings.count } });
});

module.exports = router;
