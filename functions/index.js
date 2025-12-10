/**
 * Cloudflare Worker API for LifeCareValet (D1)
 *
 * Uses D1 binding: env.lifecarevalet_db
 *
 * Security:
 * - Admin routes require header: Authorization: Bearer <OWNER_KEY>
 *   (set OWNER_KEY using `wrangler secret put OWNER_KEY`)
 *
 * TODO (recommended):
 * - Store hashed passwords (bcrypt) instead of plain text
 * - Issue JWT/session tokens instead of relying purely on OWNER_KEY
 * - Rate-limit and validate inputs strictly
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // change '*' to your GitHub Pages domain in prod
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(msg, status = 400) {
  return jsonResponse({ error: msg }, status);
}

function getAuthToken(request) {
  const h = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!h) return null;
  const parts = h.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

async function requireAdmin(request, env) {
  const token = getAuthToken(request);
  // OWNER_KEY should be set as a secret in worker env
  if (!token || token !== env.OWNER_KEY) throw new Error("Unauthorized");
}

/** Simple helper to run D1 queries
 * Usage:
 *   const r = await dbQuery(env.lifecarevalet_db, "SELECT * FROM users WHERE id = ?", [1]);
 *   r.results => array of rows
 */
async function dbQuery(db, sql, params = []) {
  // D1 SDK: prepare(...).bind(...).all() or .run() depending on the query
  // We use .all() for selects and .run() for non-selects, but .all() works for many queries returning results.
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(...params);
  // try .all() and fallback to .run()
  try {
    const result = await stmt.all();
    // result may have .results or .results property
    return result;
  } catch (e) {
    // fallback: run (for CREATE/INSERT/UPDATE/DELETE)
    const result = await db.prepare(sql).bind(...params).run();
    return result;
  }
}

/* ------------------------
   API handlers
   ------------------------ */

async function handleOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

async function handleLogin(request, env) {
  // POST /api/login { username, password }
  // NOTE: This is a simple example verifying against users table (role = 'owner').
  // In prod use hashed passwords + proper tokens.
  try {
    const body = await request.json();
    const { username, password } = body || {};
    if (!username || !password) return errorResponse("username & password required", 400);

    const db = env.lifecarevalet_db;
    const q = await dbQuery(db, "SELECT id, username, role FROM users WHERE username = ? AND password = ? LIMIT 1", [username, password]);

    const row = (q && q.results && q.results[0]) || (q && q?.results?.length ? q.results[0] : null) || null;
    if (!row) return errorResponse("Invalid credentials", 401);

    // Return minimal user info. Frontend should handle a client-side session.
    return jsonResponse({ ok: true, user: { id: row.id, username: row.username, role: row.role } });
  } catch (err) {
    return errorResponse(err.message || "Login failed", 500);
  }
}

async function handleAddManager(request, env) {
  // Admin only
  try {
    await requireAdmin(request, env);
    const body = await request.json();
    const { name, username, password } = body || {};
    if (!name || !username || !password) return errorResponse("name, username, password required", 400);

    const db = env.lifecarevalet_db;
    // Create user with role 'manager'
    const r = await dbQuery(db, "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)", [name, username, password, "manager"]);
    return jsonResponse({ ok: true, inserted: r });
  } catch (err) {
    if (err.message === "Unauthorized") return errorResponse("Unauthorized", 401);
    return errorResponse(err.message || "Add manager failed", 500);
  }
}

async function handleAddDriver(request, env) {
  // Admin only
  try {
    await requireAdmin(request, env);
    const body = await request.json();
    const { name, phone } = body || {};
    if (!name || !phone) return errorResponse("name & phone required", 400);

    const db = env.lifecarevalet_db;
    // Insert driver row
    const r = await dbQuery(db, "INSERT INTO drivers (name, phone) VALUES (?, ?)", [name, phone]);
    return jsonResponse({ ok: true, inserted: r });
  } catch (err) {
    if (err.message === "Unauthorized") return errorResponse("Unauthorized", 401);
    return errorResponse(err.message || "Add driver failed", 500);
  }
}

async function handleAddPoints(request, env) {
  // Admin only
  try {
    await requireAdmin(request, env);
    const body = await request.json();
    const { driver_id, points, reason } = body || {};
    if (!driver_id || typeof points !== "number") return errorResponse("driver_id and numeric points required", 400);

    const db = env.lifecarevalet_db;
    const now = new Date().toISOString();
    const r = await dbQuery(db, "INSERT INTO points_log (driver_id, points, reason, created_at) VALUES (?, ?, ?, ?)", [driver_id, points, reason || "", now]);

    return jsonResponse({ ok: true, inserted: r });
  } catch (err) {
    if (err.message === "Unauthorized") return errorResponse("Unauthorized", 401);
    return errorResponse(err.message || "Add points failed", 500);
  }
}

async function handleDriverBalance(request, env, driverId) {
  try {
    const db = env.lifecarevalet_db;
    const q = await dbQuery(db, "SELECT COALESCE(SUM(points),0) AS balance FROM points_log WHERE driver_id = ?", [driverId]);
    const row = (q && q.results && q.results[0]) || { balance: 0 };
    return jsonResponse({ ok: true, driver_id: driverId, balance: row.balance });
  } catch (err) {
    return errorResponse(err.message || "Balance fetch failed", 500);
  }
}

async function handleListDrivers(request, env) {
  try {
    const db = env.lifecarevalet_db;
    const q = await dbQuery(db, "SELECT id, name, phone FROM drivers ORDER BY id DESC");
    const rows = (q && q.results) || [];
    return jsonResponse({ ok: true, drivers: rows });
  } catch (err) {
    return errorResponse(err.message || "List drivers failed", 500);
  }
}

/* ------------------------
   Router / entrypoint
   ------------------------ */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, ""); // trim trailing slash

  // OPTIONS for CORS preflight
  if (request.method === "OPTIONS") return handleOptions();

  // Routes:
  // POST /api/login
  // POST /api/admin/manager  (add manager)        -> requires OWNER_KEY
  // POST /api/admin/driver   (add driver)         -> requires OWNER_KEY
  // POST /api/admin/points   (add points)         -> requires OWNER_KEY
  // GET  /api/driver/:id/balance
  // GET  /api/drivers

  try {
    if (request.method === "POST" && pathname === "/api/login") {
      return await handleLogin(request, env);
    }

    if (request.method === "POST" && pathname === "/api/admin/manager") {
      return await handleAddManager(request, env);
    }

    if (request.method === "POST" && pathname === "/api/admin/driver") {
      return await handleAddDriver(request, env);
    }

    if (request.method === "POST" && pathname === "/api/admin/points") {
      return await handleAddPoints(request, env);
    }

    if (request.method === "GET" && /^\/api\/driver\/\d+\/balance$/.test(pathname)) {
      const id = pathname.split("/")[3];
      return await handleDriverBalance(request, env, id);
    }

    if (request.method === "GET" && pathname === "/api/drivers") {
      return await handleListDrivers(request, env);
    }

    // unknown route
    return errorResponse("Not found", 404);
  } catch (err) {
    // global error
    return errorResponse(err.message || "Internal server error", 500);
  }
}