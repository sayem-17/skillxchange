const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


router.post('/', requireAuth, (req, res) => {
  const { session_id, score, comment } = req.body;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.status !== 'completed') return res.status(400).json({ error: 'You can only rate after the session is completed by both sides.' });

  const ex = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(session.exchange_id);
  let ratedId;
  if (req.user.id === ex.requester_id) ratedId = ex.provider_id;
  else if (req.user.id === ex.provider_id) ratedId = ex.requester_id;
  else return res.status(403).json({ error: 'Not a participant in this session.' });

  const already = db.prepare('SELECT id FROM ratings WHERE session_id = ? AND rater_id = ?').get(session_id, req.user.id);
  if (already) return res.status(409).json({ error: 'You already rated this session.' });

  if (!score || score < 1 || score > 5) return res.status(400).json({ error: 'score must be between 1 and 5.' });

  const info = db.prepare(
    `INSERT INTO ratings (session_id, rater_id, rated_id, score, comment) VALUES (?,?,?,?,?)`
  ).run(session_id, req.user.id, ratedId, score, comment || '');
  const rating = db.prepare('SELECT * FROM ratings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ rating });
});

router.get('/user/:id', (req, res) => {
  const ratings = db.prepare(`
    SELECT ratings.*, u.name AS rater_name FROM ratings
    JOIN users u ON ratings.rater_id = u.id
    WHERE rated_id = ? ORDER BY ratings.created_at DESC`).all(req.params.id);
  const avg = db.prepare('SELECT AVG(score) avg, COUNT(*) count FROM ratings WHERE rated_id = ?').get(req.params.id);
  res.json({ ratings, avg: avg.avg || 0, count: avg.count });
});

module.exports = router;
