export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const { token, point_id } = await request.json();

  if (!token || !point_id) {
    return new Response(JSON.stringify({ success: false, message: "Missing token or point_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Token verify
  const tokenData = await db.prepare(`SELECT * FROM driver_tokens WHERE token = ?`).bind(token).first();

  if (!tokenData) {
    return new Response(JSON.stringify({ success: false, message: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Record IN
  await db.prepare(`
    INSERT INTO driver_in_logs (driver_id, point_id, in_time)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).bind(tokenData.driver_id, point_id).run();

  return new Response(JSON.stringify({ success: true, message: "IN recorded" }), {
    headers: { "Content-Type": "application/json" }
  });
}