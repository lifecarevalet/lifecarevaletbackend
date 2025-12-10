import { Router } from 'itty-router';
import { drizzle } from 'drizzle-orm/d1';

const router = Router();

router.post("/owner/register", async (request, env) => {
    const db = drizzle(env.DB);
    const { name, mobile, password } = await request.json();

    await db.execute(`INSERT INTO owners (name, mobile, password) VALUES (?, ?, ?)`, [
        name, mobile, password
    ]);

    return Response.json({ success: true, message: "Owner registered" });
});

router.post("/owner/login", async (request, env) => {
    const db = drizzle(env.DB);
    const { mobile, password } = await request.json();

    const result = await db.execute(
        `SELECT * FROM owners WHERE mobile = ? AND password = ? LIMIT 1`,
        [mobile, password]
    );

    if (result.results.length === 0)
        return Response.json({ success: false, message: "Invalid login" });

    return Response.json({ success: true, owner: result.results[0] });
});

router.post("/manager/add", async (request, env) => {
    const db = drizzle(env.DB);
    const { owner_id, name, mobile } = await request.json();

    await db.execute(`INSERT INTO managers (owner_id, name, mobile) VALUES (?, ?, ?)`, [
        owner_id, name, mobile
    ]);

    return Response.json({ success: true, message: "Manager added" });
});

router.post("/driver/add", async (request, env) => {
    const db = drizzle(env.DB);
    const { manager_id, name, mobile } = await request.json();

    await db.execute(`INSERT INTO drivers (manager_id, name, mobile) VALUES (?, ?, ?)`, [
        manager_id, name, mobile
    ]);

    return Response.json({ success: true, message: "Driver added" });
});

export default {
    fetch: router.handle
};