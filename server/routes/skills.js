const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


router.post('/', requireAuth, (req, res) => {
  const { skill_name, category, type, description } = req.body;
  if (!skill_name || !type || !['teach', 'learn'].includes(type)) {
    return res.status(400).json({ error: "skill_name and type ('teach'|'learn') are required." });
  }
  const info = db.prepare(
    `INSERT INTO skills (user_id, skill_name, category, type, description) VALUES (?,?,?,?,?)`
  ).run(req.user.id, skill_name, category || 'General', type, description || '');
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ skill });
});

router.get('/mine', requireAuth, (req, res) => {
  const skills = db.prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ skills });
});

router.delete('/:id', requireAuth, (req, res) => {
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill not found.' });
  if (skill.user_id !== req.user.id) return res.status(403).json({ error: 'Not your skill.' });
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});


router.get('/', (req, res) => {
  const { q, category, type } = req.query;
  let sql = `
    SELECT skills.*, users.name AS teacher_name, users.id AS owner_id,
      (SELECT AVG(score) FROM ratings WHERE rated_id = users.id) AS owner_rating
    FROM skills JOIN users ON skills.user_id = users.id
    WHERE users.is_banned = 0`;
  const params = [];
  if (q) { sql += ` AND (skills.skill_name LIKE ? OR skills.description LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
  if (category) { sql += ` AND skills.category = ?`; params.push(category); }
  if (type) { sql += ` AND skills.type = ?`; params.push(type); }
  sql += ` ORDER BY skills.created_at DESC`;
  const skills = db.prepare(sql).all(...params);
  res.json({ skills });
});

router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM skills ORDER BY category').all();
  res.json({ categories: rows.map(r => r.category) });
});

module.exports = router;
