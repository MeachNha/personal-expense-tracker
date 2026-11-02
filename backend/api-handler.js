import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";

// DATABASE_URL (the Neon connection string) lives ONLY here, on the server.
const sql = neon(process.env.DATABASE_URL);
const run = (text, params = []) => sql.query(text, params);

const FIELDS = {
  sessions: [
    "session_name",
    "start_date",
    "end_date",
    "salary",
    "notes",
    "status",
  ],
  expenses: [
    "session_id",
    "category_id",
    "description",
    "amount",
    "expense_date",
    "notes",
  ],
  categories: ["name", "icon", "color"],
};
// Casts keep dates as plain 'YYYY-MM-DD' strings and money as JS numbers.
const COLS = {
  sessions:
    "id, session_name, start_date::text AS start_date, end_date::text AS end_date, salary::float8 AS salary, notes, status, created_at, updated_at",
  expenses:
    "id, session_id, category_id, description, amount::float8 AS amount, expense_date::text AS expense_date, notes, created_at, updated_at",
  categories: "id, name, icon, color, created_at",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isDate = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !isNaN(Date.parse(v));
const str = (v) => typeof v === "string" && v.trim() !== "";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (m) => new HttpError(400, m);
const pick = (b, keys) =>
  Object.fromEntries(
    keys.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]),
  );
const same = (a, b) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Builds a parameterized WHERE clause (values are never concatenated into SQL).
function where() {
  const w = [],
    p = [];
  return {
    p,
    add(clause, v) {
      p.push(v);
      w.push(clause.replace("?", () => "$" + p.length));
    },
    get sql() {
      return w.length ? "WHERE " + w.join(" AND ") : "";
    },
  };
}
function dateFilters(q, w, col) {
  for (const [k, op] of [
    ["from", ">="],
    ["to", "<="],
  ]) {
    if (q.get(k)) {
      if (!isDate(q.get(k))) throw bad(`Invalid ${k} date`);
      w.add(`${col} ${op} ?`, q.get(k));
    }
  }
}

function check(t, b, post) {
  const need = (k, ok, m) => {
    if ((post || k in b) && !ok(b[k])) throw bad(m);
  };
  if (t === "sessions") {
    need("session_name", str, "Session name is required");
    need("start_date", isDate, "Valid start date is required");
    need("end_date", isDate, "Valid end date is required");
    if (b.start_date && b.end_date && b.end_date < b.start_date)
      throw bad("End date cannot be before start date");
    if ("salary" in b && !(Number(b.salary) >= 0))
      throw bad("Salary must be 0 or more");
    if ("status" in b && !["active", "closed"].includes(b.status))
      throw bad("Status must be active or closed");
  }
  if (t === "expenses") {
    need("session_id", (v) => UUID.test(v), "Session is required");
    need("category_id", (v) => UUID.test(v), "Category is required");
    need("expense_date", isDate, "Valid expense date is required");
    need("amount", (v) => Number(v) > 0, "Amount must be greater than zero");
  }
  if (t === "categories") need("name", str, "Category name is required");
}

// Totals come from the session_summary view (calculated live, never stored).
const SESSION_SQL = `SELECT s.id, s.session_name, s.start_date::text AS start_date, s.end_date::text AS end_date,
  s.salary::float8 AS salary, s.notes, s.status, s.created_at, s.updated_at,
  v.total_expenses::float8 AS total_expenses, v.remaining_balance::float8 AS remaining_balance, v.transaction_count
  FROM sessions s JOIN session_summary v ON v.session_id = s.id`;

async function sessions(id) {
  if (id) {
    const [r] = await run(SESSION_SQL + " WHERE s.id = $1", [id]);
    if (!r) throw new HttpError(404, "Not found");
    return r;
  }
  return run(SESSION_SQL + " ORDER BY s.start_date DESC, s.created_at DESC");
}

async function expenses(q) {
  const w = where();
  for (const k of ["session_id", "category_id"]) {
    if (q.get(k)) {
      if (!UUID.test(q.get(k))) throw bad(`Invalid ${k}`);
      w.add(`e.${k} = ?`, q.get(k));
    }
  }
  dateFilters(q, w, "e.expense_date");
  const sort = q.get("sort") === "amount" ? "e.amount" : "e.expense_date";
  const dir = q.get("dir") === "asc" ? "ASC" : "DESC";
  const limit = q.get("limit")
    ? Math.min(parseInt(q.get("limit"), 10) || 50, 1000)
    : 1000;
  return run(
    `SELECT e.id, e.session_id, e.category_id, e.description, e.amount::float8 AS amount,
       e.expense_date::text AS expense_date, e.notes, e.created_at, e.updated_at,
       json_build_object('name', c.name, 'icon', c.icon, 'color', c.color) AS categories,
       json_build_object('session_name', s.session_name) AS sessions
     FROM expenses e JOIN categories c ON c.id = e.category_id JOIN sessions s ON s.id = e.session_id
     ${w.sql} ORDER BY ${sort} ${dir}, e.created_at DESC LIMIT ${limit}`,
    w.p,
  );
}

async function reports(kind, id, q) {
  if (kind === "session") {
    if (!UUID.test(id || "")) throw bad("Invalid id");
    const [summary] = await run(
      `SELECT session_id, session_name, start_date::text AS start_date, end_date::text AS end_date, status,
         salary::float8 AS salary, total_expenses::float8 AS total_expenses,
         remaining_balance::float8 AS remaining_balance, transaction_count
       FROM session_summary WHERE session_id = $1`,
      [id],
    );
    if (!summary) throw new HttpError(404, "Not found");
    return {
      summary,
      categories: await run(
        "SELECT session_id, category_id, category_name, icon, color, total_amount::float8 AS total_amount, transaction_count FROM session_category_totals WHERE session_id = $1 ORDER BY total_amount DESC",
        [id],
      ),
      daily: await run(
        "SELECT session_id, expense_date::text AS expense_date, total_amount::float8 AS total_amount, transaction_count FROM daily_expense_totals WHERE session_id = $1 ORDER BY expense_date",
        [id],
      ),
    };
  }
  if (kind === "category") {
    if (!UUID.test(id || "")) throw bad("Invalid id");
    return run(
      "SELECT session_id, category_id, category_name, icon, color, total_amount::float8 AS total_amount, transaction_count FROM session_category_totals WHERE category_id = $1",
      [id],
    );
  }
  if (kind === "daily") {
    const w = where();
    if (q.get("session_id")) {
      if (!UUID.test(q.get("session_id"))) throw bad("Invalid session_id");
      w.add("session_id = ?", q.get("session_id"));
    }
    dateFilters(q, w, "expense_date");
    return run(
      `SELECT expense_date::text AS expense_date, SUM(total_amount)::float8 AS total_amount, SUM(transaction_count)::int AS transaction_count FROM daily_expense_totals ${w.sql} GROUP BY expense_date ORDER BY expense_date`,
      w.p,
    );
  }
  throw new HttpError(404, "Not found");
}

async function route(method, parts, q, body) {
  const [res, id] = parts;
  if (res === "reports") return reports(id, parts[2], q);
  if (!FIELDS[res]) throw new HttpError(404, "Not found");
  if (id && !UUID.test(id)) throw bad("Invalid id");

  if (method === "GET") {
    if (res === "sessions") return sessions(id);
    if (res === "expenses" && !id) return expenses(q);
    if (!id)
      return run(
        `SELECT ${COLS[res]} FROM ${res} ORDER BY ${res === "categories" ? "name" : "created_at DESC"}`,
      );
    const [row] = await run(`SELECT ${COLS[res]} FROM ${res} WHERE id = $1`, [
      id,
    ]);
    if (!row) throw new HttpError(404, "Not found");
    return row;
  }
  if (method === "POST") {
    check(res, body, true);
    const b = pick(body, FIELDS[res]),
      cols = Object.keys(b);
    const [row] = await run(
      `INSERT INTO ${res} (${cols.join(", ")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) RETURNING ${COLS[res]}`,
      Object.values(b),
    );
    return row;
  }
  if (!id) throw bad("Id is required");
  if (method === "PUT") {
    check(res, body, false);
    const b = pick(body, FIELDS[res]),
      cols = Object.keys(b);
    if (!cols.length) throw bad("Nothing to update");
    const [row] = await run(
      `UPDATE ${res} SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")} WHERE id = $${cols.length + 1} RETURNING ${COLS[res]}`,
      [...Object.values(b), id],
    );
    if (!row) throw new HttpError(404, "Not found");
    return row;
  }
  if (method === "DELETE") {
    // Explicit, user-confirmed "safe deletion": with ?force=true the session and its expenses go together, atomically.
    if (res === "sessions" && q.get("force") === "true") {
      await sql.transaction([
        sql`DELETE FROM expenses WHERE session_id = ${id}`,
        sql`DELETE FROM sessions WHERE id = ${id}`,
      ]);
      return { ok: true };
    }
    const rows = await run(`DELETE FROM ${res} WHERE id = $1 RETURNING id`, [
      id,
    ]); // blocked by ON DELETE RESTRICT if in use
    if (!rows.length) throw new HttpError(404, "Not found");
    return { ok: true };
  }
  throw new HttpError(405, "Method not allowed");
}

export default async function handleApiRequest(req, res) {
  try {
    const key = process.env.APP_ACCESS_KEY;
    if (key && !same(String(req.headers["x-access-key"] || ""), key))
      throw new HttpError(401, "Unauthorized");
    const url = new URL(req.url, "http://localhost");
    const rewrittenPath = url.searchParams.get("path");
    const parts = rewrittenPath
      ? rewrittenPath.split("/").filter(Boolean)
      : url.pathname.split("/").filter(Boolean).slice(1);
    if (rewrittenPath) url.searchParams.delete("path");
    const data = await route(
      req.method,
      parts,
      url.searchParams,
      req.body || {},
    );
    res.status(req.method === "POST" ? 201 : 200).json(data);
  } catch (e) {
    const map = {
      23503: [409, "This record is still used by related expenses"],
      23505: [409, "That name already exists"],
      23514: [400, "Value rejected by a database rule"],
      "22P02": [400, "Invalid value"],
    };
    const [status, message] = e.status
      ? [e.status, e.message]
      : map[e.code] || [500, "Server error"];
    if (status === 500) console.error(e);
    res.status(status).json({ error: message });
  }
}
