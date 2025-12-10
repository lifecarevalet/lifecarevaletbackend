// Cloudflare built-in UUID
function uuidv4() {
  return crypto.randomUUID();
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const { phone } = await request.json();

  if (!phone) {
    return new Response(JSON.stringify({ success: false, message: "Phone required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Driver check
  const driver = await db.prepare(`SELECT * FROM drivers WHERE phone = ?`).bind(phone).first();

  if (!driver) {
    return new Response(JSON.stringify({ success: false, message: "Driver not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Token generate
  const token = uuidv4();

  // Store token with expiry (optional: 24h)
  await db.prepare(`
    INSERT INTO driver_tokens (driver_id, token, created_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).bind(driver.id, token).run();

  return new Response(JSON.stringify({ success: true, token, driver_id: driver.id }), {
    headers: { "Content-Type": "application/json" }
  });
}