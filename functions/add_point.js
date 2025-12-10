export async function onRequestPost({ request, env }) {
  const db = env.DB;

  const { owner_id, point_name, point_address } = await request.json();

  if (!owner_id || !point_name || !point_address) {
    return new Response(JSON.stringify({ success: false, message: "Missing fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  await db.prepare(`
    INSERT INTO points (owner_id, point_name, point_address)
    VALUES (?, ?, ?)
  `).bind(owner_id, point_name, point_address).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}