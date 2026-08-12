const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ---- FR4: Time-Credit Wallet & transaction history ----
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
  const transactions = db.prepare(
    'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ balance: user.credits, transactions });
});

module.exports = router;
