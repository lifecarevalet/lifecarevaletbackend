/**
 * LifeCareValet Worker API (ES Module) for D1
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Prod: replace * with frontend domain
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
  if (!token || token !== env.OWNER_KEY) throw new Error("Unauthorized");
}

async function dbQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(...params);
  try {
    const result = await stmt.all();
    return result;
  } catch {
    const result = await db.prepare(sql).bind(...params).run();
    return result;
  }
}

/* ---------------- API Handlers ---------------- */

async function handleOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

async function handleLogin(request, env) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return errorResponse("username & password required", 400);

    const db = env.lifecarevalet_db;
    const q = await dbQuery(db, "SELECT id, username, role FROM users WHERE username = ? AND password = ? LIMIT 1", [username, password]);
    const row = q?.results?.[0] || null;
    if (!row) return errorResponse("Invalid credentials", 401);

    return jsonResponse({ ok: true, user: { id: row.id, username: row.username, role: row.role } });
  } catch (err) {
    return errorResponse(err.message || "Login failed", 500);
  }
}

async function handleAddManager(request, env) {
  try {
    await requireAdmin(request, env);
    const { name, username, password } = await request.json();
    if (!name || !username || !password) return errorResponse("name, username, password required", 400);

    const db = env.lifecarevalet_db;
    const r = await dbQuery(db, "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)", [name, username, password, "manager"]);
    return jsonResponse({ ok: true, inserted: r });
  } catch (err) {
    if (err.message === "Unauthorized") return errorResponse("Unauthorized", 401);
    return errorResponse(err.message || "Add manager failed", 500);
  }
}

async function handleAddDriver(request, env) {
  try {
    await requireAdmin(request, env);
    const { name, phone } = await request.json();
    if (!name || !phone) return errorResponse("name & phone required", 400);

    const db = env.lifecarevalet_db;
    const r = await dbQuery(db, "INSERT INTO drivers (name, phone) VALUES (?, ?)", [name, phone]);
    return jsonResponse({ ok: true, inserted: r });
  } catch (err) {
    if (err.message === "Unauthorized") return errorResponse("Unauthorized", 401);
    return errorResponse(err.message || "Add driver failed", 500);
  }
}

async function handleAddPoints(request, env) {
  try {
    await requireAdmin(request, env);
    const { driver_id, points, reason } = await request.json();
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
    const row = q?.results?.[0] || { balance: 0 };
    return jsonResponse({ ok: true, driver_id: driverId, balance: row.balance });
  } catch (err) {
    return errorResponse(err.message || "Balance fetch failed", 500);
  }
}

async function handleListDrivers(request, env) {
  try {
    const db = env.lifecarevalet_db;
    const q = await dbQuery(db, "SELECT id, name, phone FROM drivers ORDER BY id DESC");
    return jsonResponse({ ok: true, drivers: q?.results || [] });
  } catch (err) {
    return errorResponse(err.message || "List drivers failed", 500);
  }
}

/* ---------------- Router ---------------- */

async function router(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  if (request.method === "OPTIONS") return handleOptions();

  if (request.method === "POST" && pathname === "/api/login") return handleLogin(request, env);
  if (request.method === "POST" && pathname === "/api/admin/manager") return handleAddManager(request, env);
  if (request.method === "POST" && pathname === "/api/admin/driver") return handleAddDriver(request, env);
  if (request.method === "POST" && pathname === "/api/admin/points") return handleAddPoints(request, env);
  if (request.method === "GET" && /^\/api\/driver\/\d+\/balance$/.test(pathname)) {
    const id = pathname.split("/")[3];
    return handleDriverBalance(request, env, id);
  }
  if (request.method === "GET" && pathname === "/api/drivers") return handleListDrivers(request, env);

  return errorResponse("Not found", 404);
}

// ✅ Default export required for ES Module Worker
export default {
  async fetch(request, env) {
    return router(request, env);
  },
};