# Expense Tracker (Neon edition)

React (Vite, Tailwind, Recharts) → Express API (`backend/`) → Neon PostgreSQL.

The React frontend lives in `src/`. The Express backend and database access live in
`backend/`; `api/index.js` exposes the Express app as a Vercel serverless
function, while `vercel.json` routes all `/api/*` requests through it. The Vercel Hobby plan and Neon Free plan can be used to deploy this
personal project without a hosting subscription, subject to their current usage
limits and terms.

## Database
Three tables: `sessions` (custom date range + salary), `categories` (reusable), `expenses` (one session + one category each).
- `sessions (1) ─< expenses >─ (1) categories`; foreign keys are `ON DELETE RESTRICT`, so a session/category with expenses cannot be deleted by accident.
- Rules in the database: `end_date >= start_date`, status `active|closed`, salary `>= 0`, amount `> 0`, unique category names.
- Totals are never stored. `total_expenses = SUM(expenses.amount)` and `remaining_balance = salary - total_expenses` are computed by the views `session_summary`, `session_category_totals` and `daily_expense_totals`.

### Run the SQL in Neon
1. Create a project at https://console.neon.tech.
2. Open **SQL Editor**, paste `db/schema.sql`, click **Run**. Then run `db/seed.sql` (safe to re-run; no duplicates).
3. Test: `SELECT * FROM session_summary;` and `SELECT count(*) FROM categories;` (expect 9).
   Rules check (each should error): `INSERT INTO sessions (session_name,start_date,end_date) VALUES ('x','2026-11-10','2026-11-01');` and `INSERT INTO expenses (session_id,category_id,amount,expense_date) SELECT s.id,c.id,0,now() FROM sessions s, categories c LIMIT 1;`

## Security (no RLS, no auth)
Neon does not expose your tables over HTTP unless you deliberately enable its Data API, so there is nothing public to protect with RLS. The **only** way in is the connection string.
- `DATABASE_URL` contains the database password: server-side env var only. Never use a `VITE_` prefix, never commit `.env`.
- If it leaks: Neon console → Roles → reset password, then update Vercel.
- Do not enable Neon's Data API / Neon Auth for this project.
- Protect the API itself too (below), since anyone who reaches `/api` can use it.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env`, set `DATABASE_URL`.
3. For local development, start the API and frontend in separate terminals:
   - API: `npm run dev:api` (requires Node.js 20.6+ to load `.env`)
   - Frontend: `npm run dev`
   The Vite dev server proxies `/api` requests to Express on port 3001.
   Alternatively, `npx vercel dev` runs the Vercel function locally.

## Deploy to Vercel
1. Push the project to GitHub, then import the repository in Vercel (framework: Vite).
2. Add env vars `DATABASE_URL` and optionally `APP_ACCESS_KEY` (Neon also has a Vercel integration that adds `DATABASE_URL` for you).
3. Deploy.

## Private access (no login page)
- **Hosting:** Vercel → Settings → Deployment Protection → enable *Vercel Authentication*. Covers the site and `/api`.
- **API key (recommended):** set `APP_ACCESS_KEY` to a long random string. Requests without the matching `x-access-key` header get 401. Enter it once in Settings (stored in that browser only).

## Test checklist
Create a session → add expenses → check Dashboard totals and charts → try deleting a session/category that has expenses → edit/close a session → filter/sort expenses → Reports range + CSV → change theme/currency.
