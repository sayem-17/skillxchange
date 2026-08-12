const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'skillxchange.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');


db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'student', -- student | admin
  credits REAL DEFAULT 3.0,     -- starting time-credit balance
  is_banned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  type TEXT NOT NULL, -- 'teach' | 'learn'
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exchange_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending', -- pending | accepted | rejected | cancelled
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_id INTEGER NOT NULL REFERENCES exchange_requests(id) ON DELETE CASCADE,
  scheduled_time TEXT NOT NULL,
  duration_hours REAL DEFAULT 1.0,
  status TEXT DEFAULT 'scheduled', -- scheduled | completed | disputed | cancelled
  teacher_confirmed INTEGER DEFAULT 0,
  learner_confirmed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disputes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  raised_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open | resolved
  resolution TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  session_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
`);


const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (userCount === 0) {
  const insertUser = db.prepare(`INSERT INTO users (name, email, password_hash, bio, role, credits) VALUES (?,?,?,?,?,?)`);
  const hash = (pw) => bcrypt.hashSync(pw, 8);

  const admin = insertUser.run('Admin', 'admin@skillxchange.com', hash('admin123'), 'Platform administrator', 'admin', 0);
  const u1 = insertUser.run('Ibney Sayem', 'sayem@diu.edu.bd', hash('pass123'), 'CS student who loves coding & photography.', 'student', 3);
  const u2 = insertUser.run('Farhana Akter', 'farhana@diu.edu.bd', hash('pass123'), 'Guitarist, teaches music theory.', 'student', 3);
  const u3 = insertUser.run('Rakib Hasan', 'rakib@diu.edu.bd', hash('pass123'), 'Graphic designer, wants to learn Python.', 'student', 3);

  const insertSkill = db.prepare(`INSERT INTO skills (user_id, skill_name, category, type, description) VALUES (?,?,?,?,?)`);
  insertSkill.run(u1.lastInsertRowid, 'Python Programming', 'Programming', 'teach', 'Basics to intermediate Python, DSA fundamentals.');
  insertSkill.run(u1.lastInsertRowid, 'Guitar', 'Music', 'learn', 'Want to learn acoustic guitar basics.');
  insertSkill.run(u2.lastInsertRowid, 'Guitar', 'Music', 'teach', 'Beginner to intermediate acoustic guitar.');
  insertSkill.run(u2.lastInsertRowid, 'Graphic Design', 'Design', 'learn', 'Want to learn Photoshop basics.');
  insertSkill.run(u3.lastInsertRowid, 'Graphic Design', 'Design', 'teach', 'Photoshop & Canva design fundamentals.');
  insertSkill.run(u3.lastInsertRowid, 'Python Programming', 'Programming', 'learn', 'Want to learn Python for automation.');

  console.log('Seeded demo data: admin@skillxchange.com/admin123, sayem@diu.edu.bd/pass123, farhana@diu.edu.bd/pass123, rakib@diu.edu.bd/pass123');
}

module.exports = db;
