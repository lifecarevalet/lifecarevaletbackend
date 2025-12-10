export async function onRequestPost({ request, env }) {
  const db = env.DB; // D1 binding

  const { name, phone, password } = await request.json();

  if (!name || !phone || !password) {
    return new Response("Missing fields", { status: 400 });
  }

  // Insert
  await db.prepare(`
    INSERT INTO owners (name, phone, password, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(name, phone, password).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}