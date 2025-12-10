export async function onRequest(context) {
  const { request, env } = context;
  try {
    const { sql, params } = await request.json();
    const results = await env.DB.prepare(sql).bind(...params).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}