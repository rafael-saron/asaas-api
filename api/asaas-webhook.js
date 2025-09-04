export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    // Ex.: event.event === "PAYMENT_CONFIRMED"; event.payment possui detalhes.
    // TODO: atualizar seu banco/planilha/crm aqui (idempotência por event.id)
    // Responda rápido 200 para não pausar fila de webhooks.
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(200).json({ ok: true }); // não derrube a fila por erro seu
  }
}

