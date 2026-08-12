# SkillXchange — Student Skill Exchange Platform

Trade what you know for what you want to learn — no money, just time and skill.

Built by Ibney Sayem Milky · ID: 242-35-525

## What this is

A full-stack web application (Node.js + Express backend, SQLite database,
vanilla HTML/CSS/JS frontend) implementing all 8 functional requirements
from the project proposal:

1. Registration & Skill Profile
2. Skill Browse & Search
3. Exchange Request System
4. Time-Credit Wallet
5. Session Scheduling
6. Session Confirmation (dual confirm triggers automatic credit transfer)
7. Rating & Review System
8. Admin / Dispute Panel

## Tech stack

- **Backend:** Node.js, Express
- **Database:** SQLite (via better-sqlite3) — file-based, zero setup
- **Auth:** JWT (JSON Web Tokens) + bcrypt password hashing
- **Frontend:** Vanilla HTML/CSS/JS single-page app, calling REST APIs

## Run it locally

```bash
npm install
npm start
```

Then open http://localhost:3000

The database (`skillxchange.db`) is created automatically on first run and
seeded with demo accounts:

| Role    | Email                     | Password  |
|---------|---------------------------|-----------|
| Student | sayem@diu.edu.bd          | pass123   |
| Student | farhana@diu.edu.bd        | pass123   |
| Student | rakib@diu.edu.bd          | pass123   |
| Admin   | admin@skillxchange.com    | admin123  |

## Deploying so you don't need to carry a laptop

Deploy once to a free host and you get a permanent URL — open it from any
browser (university lab PC, phone, borrowed laptop) for the demo. See
`DEPLOY.md` for step-by-step instructions (Render.com recommended, takes
about 10 minutes, free tier).

## Project structure

```
server/
  server.js          # Express app entry point
  db.js              # SQLite schema + demo data seeding
  middleware/auth.js # JWT auth middleware
  routes/            # One file per feature area (auth, skills, exchanges,
                      # wallet, sessions, ratings, admin)
public/
  index.html         # Single-page app shell
  css/style.css       # Design system
  js/app.js           # Frontend logic (calls the REST API)
```

## Core workflow (for your presentation)

1. A student **registers** and adds skills they can **teach** and skills
   they want to **learn** (FR1).
2. They **browse/search** peers offering a skill they want (FR2).
3. They send an **exchange request**; the other student accepts or
   declines it (FR3).
4. Once accepted, either side **schedules a session** with a date/time and
   duration (FR5).
5. After the session happens, **both participants confirm** it
   independently (FR6). When both confirm, the backend automatically
   **transfers time-credits** from learner to teacher (FR4) — this is the
   core business logic, all done server-side with a database transaction.
6. Both sides can **rate and review** each other afterwards (FR7).
7. If something goes wrong, either side can **raise a dispute** instead of
   confirming; an **admin** reviews open disputes, resolves them, and can
   restore a session or ban a misbehaving user (FR8).

Everything above is real backend logic backed by a real SQLite database —
not mocked in the browser.
