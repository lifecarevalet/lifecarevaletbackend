export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // --------- Example Route 1 ----------
    if (url.pathname === "/api/test") {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Worker API OK" 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // --------- Example Route 2 (POST example) ----------
    if (url.pathname === "/api/data" && request.method === "POST") {
      const body = await request.json();
      return new Response(JSON.stringify({
        received: body,
        status: "saved"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // --------- Default Response ----------
    return new Response("Cloudflare Worker Running!", { status: 200 });
  }
};