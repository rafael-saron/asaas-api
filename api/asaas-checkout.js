export default async function handler(req, res) {
  // --- CORS: libera sua landing (+ localhost para testes) ---
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.length && origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // durante testes pode manter *, em produção prefira só o domínio da landing
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    // Se nada vier do front, usamos defaults do seu produto:
    const {
      customerName,
      customerEmail,
      quantity = 1,
      value = 47.2,         // R$47,20 → 47.2 (ponto)
      name  = "colorgoods"  // nome do produto
    } = body;

    // Sandbox para testes (mude para produção depois)
    const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    if (!ASAAS_API_KEY) return res.status(500).json({ error: "Missing ASAAS_API_KEY" });

    // Payload do checkout (Asaas)
    const payload = {
      items: [{ name, quantity, value }],
      billingTypes: ["PIX", "CREDIT_CARD", "BOLETO"], // ajuste se quiser
      successUrl: "https://vistasaron.com/checkout?status=success",
      cancelUrl:   "https://vistasaron.com/checkout?status=cancel",
      expiredUrl:  "https://vistasaron.com/checkout?status=expired",
      customerData: {
        name:  customerName || undefined,
        email: customerEmail || undefined
      },
      expiresIn: 60 // minutos (opcional)
    };

    const r = await fetch(`${ASAAS_BASE}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: txt });
    }

    const data = await r.json(); // { id: "..." , ... }
    const redirectUrl = `https://asaas.com/checkoutSession/show?id=${data.id}`;
    return res.status(200).json({ checkoutId: data.id, redirectUrl });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
