# Deploying SkillXchange (so you never need to carry a laptop)

Goal: get one public URL (like `https://skillxchange.onrender.com`) that you
open in any browser — university lab PC, borrowed laptop, even your phone —
and the whole app just works. You only need a computer **once**, to set this
up (a friend's laptop, a cyber café, or the university computer lab is fine).

You have two good free options. **Replit is easiest if you don't own a
laptop at all**, because you can even do the whole setup from a phone
browser. **Render is the more "real" option** (proper GitHub-based deploy)
if you get access to a computer for 15 minutes.

---

## Option A: Replit (works entirely from a phone browser)

1. Go to https://replit.com and sign up (free).
2. Create a new Repl → choose "Import from GitHub" if you've pushed this
   project to GitHub, **or** choose a blank Node.js Repl and upload this
   project as a zip (Replit has an "Upload" option in the file panel — you
   can upload the `skillxchange.zip` from your phone's file storage).
3. Once the files are in, open the Replit **Shell** tab and run:
   ```
   npm install
   npm start
   ```
4. Replit gives you a webview URL immediately (shown at the top of the
   screen) — something like `https://skillxchange.yourname.repl.co`.
5. Click "Deploy" in Replit (top right) to get a permanent always-on URL
   instead of one that sleeps when you close the tab. Replit's free
   "Autoscale" deployment tier is enough for a class demo.
6. That URL is what you open on the classroom's PC/projector on demo day.

## Option B: Render.com (GitHub-based, more standard for a CS project)

1. Push this project to a GitHub repository (public or private is fine).
2. Go to https://render.com → sign up free → "New +" → "Web Service".
3. Connect your GitHub account and select the `skillxchange` repo.
4. Fill in:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
5. Click "Create Web Service". Render installs dependencies and starts the
   app — first deploy takes 2–5 minutes.
6. You'll get a URL like `https://skillxchange.onrender.com` — that's your
   permanent demo link.

**Note on the free tier:** Render's free web services spin down after
15 minutes of no traffic, and the first request after that takes ~30–60
seconds to wake up. Open the link 2–3 minutes before your presentation
starts so it's already "warm" when your teacher is watching. Also, the
SQLite file resets to the seeded demo data if the service restarts —
that's actually convenient for a demo (always starts clean), but don't
rely on it for permanent real data.

---

## Demo day checklist

- [ ] Open your deployed URL 5 minutes early so it's awake and loaded.
- [ ] Log in with a demo account (or register live to show FR1 working).
- [ ] Have a second browser tab/incognito window logged in as a *different*
      student, so you can demonstrate both sides of an exchange request,
      scheduling, and dual confirmation live.
- [ ] Keep the admin login (`admin@skillxchange.com` / `admin123`) ready in
      a third tab to show the dispute/ban panel.
- [ ] If your teacher wants to see the database itself, you can show
      `server/db.js` (the schema) and mention SQLite is the storage layer —
      or open the Render/Replit shell and run
      `sqlite3 skillxchange.db ".tables"` live.
