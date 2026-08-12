const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ---- FR8: Admin / Dispute Panel ----
router.get('/stats', (req, res) => {
  const users = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'student'").get().c;
  const skills = db.prepare('SELECT COUNT(*) c FROM skills').get().c;
  const exchanges = db.prepare('SELECT COUNT(*) c FROM exchange_requests').get().c;
  const sessionsCompleted = db.prepare("SELECT COUNT(*) c FROM sessions WHERE status = 'completed'").get().c;
  const openDisputes = db.prepare("SELECT COUNT(*) c FROM disputes WHERE status = 'open'").get().c;
  res.json({ users, skills, exchanges, sessionsCompleted, openDisputes });
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, credits, is_banned, created_at FROM users ORDER BY id').all();
  res.json({ users });
});

router.put('/users/:id/ban', (req, res) => {
  const { banned } = req.body;
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(banned ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.get('/disputes', (req, res) => {
  const disputes = db.prepare(`
    SELECT d.*, u.name AS raised_by_name, sess.scheduled_time, sess.exchange_id
    FROM disputes d
    JOIN users u ON d.raised_by = u.id
    JOIN sessions sess ON d.session_id = sess.id
    ORDER BY d.created_at DESC`).all();
  res.json({ disputes });
});

router.put('/disputes/:id/resolve', (req, res) => {
  const { resolution, restore_session } = req.body;
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found.' });

  db.prepare(`UPDATE disputes SET status = 'resolved', resolution = ? WHERE id = ?`)
    .run(resolution || 'Resolved by admin.', req.params.id);

  if (restore_session) {
    db.prepare(`UPDATE sessions SET status = 'scheduled', teacher_confirmed = 0, learner_confirmed = 0 WHERE id = ?`)
      .run(dispute.session_id);
  }
  res.json({ success: true });
});

module.exports = router;
