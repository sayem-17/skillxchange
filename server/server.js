require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db'); // initializes DB + seeds demo data on first run

const authRoutes = require('./routes/auth');
const skillsRoutes = require('./routes/skills');
const exchangesRoutes = require('./routes/exchanges');
const walletRoutes = require('./routes/wallet');
const sessionsRoutes = require('./routes/sessions');
const ratingsRoutes = require('./routes/ratings');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/exchanges', exchangesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- Serve frontend (static) ----
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SkillXchange server running on http://localhost:${PORT}`);
});
