const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ---- FR3: send an exchange request for a listed skill ----
router.post('/', requireAuth, (req, res) => {
  const { skill_id, message } = req.body;
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
  if (!skill) return res.status(404).json({ error: 'Skill not found.' });
  if (skill.user_id === req.user.id) return res.status(400).json({ error: 'You cannot request your own skill.' });
  if (skill.type !== 'teach') return res.status(400).json({ error: 'You can only request skills listed as teachable.' });

  const info = db.prepare(
    `INSERT INTO exchange_requests (requester_id, provider_id, skill_id, message) VALUES (?,?,?,?)`
  ).run(req.user.id, skill.user_id, skill_id, message || '');
  const exchange = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ exchange });
});

// list requests involving the current user (sent + received)
router.get('/', requireAuth, (req, res) => {
  const sql = `
    SELECT er.*, s.skill_name, s.category,
      req.name AS requester_name, prov.name AS provider_name
    FROM exchange_requests er
    JOIN skills s ON er.skill_id = s.id
    JOIN users req ON er.requester_id = req.id
    JOIN users prov ON er.provider_id = prov.id
    WHERE er.requester_id = ? OR er.provider_id = ?
    ORDER BY er.created_at DESC`;
  const exchanges = db.prepare(sql).all(req.user.id, req.user.id);
  res.json({ exchanges });
});

// provider accepts/rejects; requester can cancel
router.put('/:id', requireAuth, (req, res) => {
  const { status } = req.body; // accepted | rejected | cancelled
  const ex = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'Exchange request not found.' });

  if (['accepted', 'rejected'].includes(status) && ex.provider_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the skill provider can accept or reject this request.' });
  }
  if (status === 'cancelled' && ex.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the requester can cancel this request.' });
  }
  db.prepare('UPDATE exchange_requests SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(req.params.id);
  res.json({ exchange: updated });
});

module.exports = router;
