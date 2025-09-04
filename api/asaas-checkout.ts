// Vercel Serverless Function (Node 18/20)
export default async function handler(req: any, res: any) {
  // --- CORS (permite sua landing na Hostinger chamar esta API) ---
  const allowedOrigins = [
    "https://vistasaron.com", // troque para o seu domínio da Hostinger
    "http://localhost:5173"       // útil nos testes locais do Vite
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  // ---------------------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const {
      customerName,
      customerEmail,
      quantity = 1
    } = body;

    // Troque para 'https://api.asaas.com/v3' em produção.
    const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    if (!ASAAS_API_KEY) {
      return res.status(500).json({ error: "Missing ASAAS_API_KEY" });
    }

    // Payload mínimo para "Create new checkout"
    // Campos suportados: items[], billingTypes[], successUrl, cancelUrl, customerData...
    // Veja referência oficial. 
    const payload = {
      items: [
        { name: "Colorgoods – Kit Criativo", quantity, value: 99.0 }
      ],
      billingTypes: ["PIX", "CREDIT_CARD", "BOLETO"],  // ajuste métodos desejados
      successUrl: "https://SEU-DOMINIO.com.br/checkout?status=success",
      cancelUrl: "https://SEU-DOMINIO.com.br/checkout?status=cancel",
      customerData: {
        name: customerName,
        email: customerEmail
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
      const errText = await r.text();
      return res.status(r.status).json({ error: errText });
    }

    const data = await r.json(); // { id: "..." , ... }
    // Monta a URL pública do checkout:
    const redirectUrl = `https://asaas.com/checkoutSession/show?id=${data.id}`;
    // (Link documentado oficialmente)
    return res.status(200).json({ checkoutId: data.id, redirectUrl });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

