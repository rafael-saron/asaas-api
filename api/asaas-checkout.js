export default async function handler(req, res) {
  // CORS (para POST a partir do seu site; GET por navegação não precisa)
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.length && origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*"); // pode restringir depois
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  if (!ASAAS_API_KEY) return res.status(500).json({ error: "Missing ASAAS_API_KEY" });

  // Função que cria o checkout e retorna a URL de redirecionamento
  async function makeCheckout({ name = "colorgoods", value = 47.2, quantity = 1, customerName, customerEmail }) {
    const payload = {
      items: [{ name, quantity, value }],
      billingTypes: ["PIX", "CREDIT_CARD", "BOLETO"],
      successUrl: "https://vistasaron.com/checkout?status=success",
      cancelUrl:   "https://vistasaron.com/checkout?status=cancel",
      expiredUrl:  "https://vistasaron.com/checkout?status=expired",
      customerData: {
        name:  customerName || undefined,
        email: customerEmail || undefined
      },
      expiresIn: 60
    };

    const r = await fetch(`${ASAAS_BASE}/checkouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": ASAAS_API_KEY },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt);
    }

    const data = await r.json(); // { id: ... }
    return `https://asaas.com/checkoutSession/show?id=${data.id}`;
  }

  // ROTA GET → cria o checkout e REDIRECIONA (302)
  if (req.method === "GET") {
    try {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const params = Object.fromEntries(url.searchParams.entries());
      const name         = params.name || "colorgoods";
      const value        = params.value ? Number(params.value) : 47.2;
      const quantity     = params.quantity ? Number(params.quantity) : 1;
      const customerName = params.customerName;
      const customerEmail= params.customerEmail;

      const redirectUrl = await makeCheckout({ name, value, quantity, customerName, customerEmail });
      res.statusCode = 302;
      res.setHeader("Location", redirectUrl);
      return res.end();
    } catch (e) {
      return res.status(500).send(String(e?.message || e));
    }
  }

  // ROTA POST → cria o checkout e retorna JSON { redirectUrl }
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { name = "colorgoods", value = 47.2, quantity = 1, customerName, customerEmail } = body;
      const redirectUrl = await makeCheckout({ name, value, quantity, customerName, customerEmail });
      return res.status(200).json({ redirectUrl });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
