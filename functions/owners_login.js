export async function onRequestPost({ request, env }) {
  const db = env.DB;

  const { phone, password } = await request.json();

  const owner = await db.prepare(`
    SELECT * FROM owners WHERE phone = ? AND password = ?
  `).bind(phone, password).first();

  if (!owner) {
    return new Response(JSON.stringify({ success: false, message: "Invalid login" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    owner_id: owner.id,
    name: owner.name
  }), {
    headers: { "Content-Type": "application/json" },
  });
}