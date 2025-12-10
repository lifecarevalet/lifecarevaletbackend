export async function onRequestGet({ env }) {
  const db = env.DB;

  const drivers = await db.prepare(`
    SELECT d.id AS driver_id, d.name, p.point_name, p.point_address,
           i.in_time, o.out_time
    FROM drivers d
    JOIN points p ON d.point_id = p.id
    LEFT JOIN driver_in_logs i ON d.id = i.driver_id
    LEFT JOIN driver_out_logs o ON d.id = o.driver_id
    WHERE i.in_time IS NOT NULL
      AND (o.out_time IS NULL OR i.in_time > o.out_time)
  `).all();

  return new Response(JSON.stringify({ success: true, active_drivers: drivers }), {
    headers: { "Content-Type": "application/json" }
  });
}