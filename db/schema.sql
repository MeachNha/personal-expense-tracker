-- =====================================================================
-- Personal Expense Tracker - Database Schema (Neon / PostgreSQL)
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- No RLS and no auth tables. Neon exposes nothing publicly: the only way
-- in is your private DATABASE_URL, used by the server-side API.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared trigger function: keeps updated_at current on every UPDATE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- TABLE 1: sessions
-- A customizable financial period with its own salary.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT          NOT NULL,
  start_date   DATE          NOT NULL,
  end_date     DATE          NOT NULL,
  salary       NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  status       TEXT          NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT sessions_name_not_blank  CHECK (length(btrim(session_name)) > 0),
  CONSTRAINT sessions_dates_valid     CHECK (end_date >= start_date),
  CONSTRAINT sessions_salary_not_neg  CHECK (salary >= 0),
  CONSTRAINT sessions_status_valid    CHECK (status IN ('active', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_status     ON public.sessions (status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_date ON public.sessions (start_date DESC);

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON public.sessions;
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE 2: categories
-- Reusable across all sessions.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  icon       TEXT,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT categories_name_unique    UNIQUE (name),
  CONSTRAINT categories_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- ---------------------------------------------------------------------
-- TABLE 3: expenses
-- Each expense belongs to exactly one session and one category.
-- ON DELETE RESTRICT = the database refuses to delete a session or
-- category that still has expenses (protects against accidents).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID          NOT NULL
                 REFERENCES public.sessions (id)   ON DELETE RESTRICT,
  category_id  UUID          NOT NULL
                 REFERENCES public.categories (id) ON DELETE RESTRICT,
  description  TEXT,
  amount       NUMERIC(12,2) NOT NULL,
  expense_date DATE          NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT expenses_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_expenses_session_id   ON public.expenses (session_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id  ON public.expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_session_date ON public.expenses (session_id, expense_date);

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- VIEWS: financial calculations (computed live, never stored)
-- ---------------------------------------------------------------------

-- Total expenses, remaining balance and transaction count per session.
-- LEFT JOIN keeps sessions that have no expenses yet (total = 0).
CREATE OR REPLACE VIEW public.session_summary AS
SELECT
  s.id                                         AS session_id,
  s.session_name,
  s.start_date,
  s.end_date,
  s.status,
  s.salary,
  COALESCE(SUM(e.amount), 0)::NUMERIC(12,2)    AS total_expenses,
  (s.salary - COALESCE(SUM(e.amount), 0))::NUMERIC(12,2) AS remaining_balance,
  COUNT(e.id)::INTEGER                         AS transaction_count
FROM public.sessions s
LEFT JOIN public.expenses e ON e.session_id = s.id
GROUP BY s.id;

-- Totals per category, calculated separately for each session.
CREATE OR REPLACE VIEW public.session_category_totals AS
SELECT
  e.session_id,
  c.id                                AS category_id,
  c.name                              AS category_name,
  c.icon,
  c.color,
  SUM(e.amount)::NUMERIC(12,2)        AS total_amount,
  COUNT(e.id)::INTEGER                AS transaction_count
FROM public.expenses e
JOIN public.categories c ON c.id = e.category_id
GROUP BY e.session_id, c.id;

-- Daily totals per session.
CREATE OR REPLACE VIEW public.daily_expense_totals AS
SELECT
  e.session_id,
  e.expense_date,
  SUM(e.amount)::NUMERIC(12,2)        AS total_amount,
  COUNT(e.id)::INTEGER                AS transaction_count
FROM public.expenses e
GROUP BY e.session_id, e.expense_date;

-- Row Level Security is intentionally NOT enabled. Nothing is granted to
-- any public role; keep DATABASE_URL private (server-side only).
