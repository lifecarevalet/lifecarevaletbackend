export async function onRequestPost({ request, env }) {
  const db = env.DB;

  const { owner_id, point_id, name, phone } = await request.json();

  if (!owner_id || !point_id || !name || !phone) {
    return new Response(JSON.stringify({ success: false, message: "Missing fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  await db.prepare(`
    INSERT INTO managers (owner_id, point_id, name, phone)
    VALUES (?, ?, ?, ?)
  `).bind(owner_id, point_id, name, phone).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}