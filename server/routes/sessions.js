const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


router.post('/', requireAuth, (req, res) => {
  const { exchange_id, scheduled_time, duration_hours } = req.body;
  const ex = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(exchange_id);
  if (!ex) return res.status(404).json({ error: 'Exchange request not found.' });
  if (ex.status !== 'accepted') return res.status(400).json({ error: 'Exchange must be accepted before scheduling.' });
  if (![ex.requester_id, ex.provider_id].includes(req.user.id)) {
    return res.status(403).json({ error: 'Not a participant in this exchange.' });
  }
  if (!scheduled_time) return res.status(400).json({ error: 'scheduled_time is required (ISO date string).' });

  const info = db.prepare(
    `INSERT INTO sessions (exchange_id, scheduled_time, duration_hours) VALUES (?,?,?)`
  ).run(exchange_id, scheduled_time, duration_hours || 1.0);
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ session });
});

function enrichSession(session) {
  const ex = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(session.exchange_id);
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(ex.skill_id);
  const requester = db.prepare('SELECT id, name FROM users WHERE id = ?').get(ex.requester_id);
  const provider = db.prepare('SELECT id, name FROM users WHERE id = ?').get(ex.provider_id);
  return { ...session, skill_name: skill.skill_name, requester, provider };
}


router.get('/', requireAuth, (req, res) => {
  const sql = `
    SELECT sess.* FROM sessions sess
    JOIN exchange_requests er ON sess.exchange_id = er.id
    WHERE er.requester_id = ? OR er.provider_id = ?
    ORDER BY sess.scheduled_time ASC`;
  const sessions = db.prepare(sql).all(req.user.id, req.user.id).map(enrichSession);
  res.json({ sessions });
});


router.put('/:id/confirm', requireAuth, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  const ex = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(session.exchange_id);

  const isProvider = ex.provider_id === req.user.id; // the teacher
  const isRequester = ex.requester_id === req.user.id; // the learner
  if (!isProvider && !isRequester) return res.status(403).json({ error: 'Not a participant in this session.' });
  if (session.status === 'completed') return res.status(400).json({ error: 'Session already completed and credited.' });

  const field = isProvider ? 'teacher_confirmed' : 'learner_confirmed';
  db.prepare(`UPDATE sessions SET ${field} = 1 WHERE id = ?`).run(session.id);
  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);

  if (updated.teacher_confirmed && updated.learner_confirmed && updated.status !== 'completed') {
    const amount = updated.duration_hours;
    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(amount, ex.provider_id);
      db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(amount, ex.requester_id);
      db.prepare('INSERT INTO credit_transactions (user_id, amount, reason, session_id) VALUES (?,?,?,?)')
        .run(ex.provider_id, amount, 'Teaching session completed', session.id);
      db.prepare('INSERT INTO credit_transactions (user_id, amount, reason, session_id) VALUES (?,?,?,?)')
        .run(ex.requester_id, -amount, 'Learning session completed', session.id);
      db.prepare(`UPDATE sessions SET status = 'completed' WHERE id = ?`).run(session.id);
    });
    tx();
  }

  const finalSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
  res.json({ session: finalSession });
});


router.post('/:id/dispute', requireAuth, (req, res) => {
  const { reason } = req.body;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (!reason) return res.status(400).json({ error: 'A reason is required to raise a dispute.' });

  db.prepare(`UPDATE sessions SET status = 'disputed' WHERE id = ?`).run(session.id);
  const info = db.prepare(
    `INSERT INTO disputes (session_id, raised_by, reason) VALUES (?,?,?)`
  ).run(session.id, req.user.id, reason);
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ dispute });
});

module.exports = router;
