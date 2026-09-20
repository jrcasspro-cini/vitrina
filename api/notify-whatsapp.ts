// WhatsApp push notifikácia pre predajcu pri novej objednávke.
//
// Používa Twilio WhatsApp API. Predajca po registrácii musí:
//   1. Poslať "join <sandbox-code>" z jeho WhatsApp na Twilio sandbox číslo (dev)
//   2. ALEBO mať schválené WhatsApp Business číslo (produkcia — vyžaduje business verifikáciu)
//
// Setup (Vercel env vars):
//   TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_AUTH_TOKEN    = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_WHATSAPP_FROM = whatsapp:+14155238886   (sandbox) alebo whatsapp:+421...
//
// Náklady: ~0,005 € / správa (Twilio sandbox zdarma na testovanie, produkcia platí za segment).
// Bez env kľúčov endpoint vráti 200 + skipped: true (aplikácia nespadne).

export const config = { runtime: "edge" };

function fmtEur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

interface Payload {
  storePhone: string;         // Telefón predajcu (E.164, napr. +421905123456)
  storeName: string;
  variabilnySymbol: string;
  total: number;
  customerName: string;
  customerCity: string;
  customerPhone?: string;
  itemCount: number;
  storeHandle: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    return new Response(
      JSON.stringify({ ok: false, skipped: true, reason: "Twilio env vars not set." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

  const p = body as Payload;
  if (!p.storePhone || !p.variabilnySymbol) {
    return new Response(JSON.stringify({ error: "Missing fields." }), { status: 400 });
  }

  // Normalize to E.164 → whatsapp:+42190...
  const clean = p.storePhone.replace(/[^\d+]/g, "");
  const to = `whatsapp:${clean.startsWith("+") ? clean : `+${clean}`}`;

  const msg = [
    `🎉 Nová objednávka!`,
    ``,
    `#${p.variabilnySymbol} · ${fmtEur(p.total)}`,
    `${p.itemCount} položiek`,
    ``,
    `👤 ${p.customerName}`,
    `📍 ${p.customerCity}`,
    p.customerPhone ? `📞 ${p.customerPhone}` : "",
    ``,
    `Otvor admin: https://vitrina.zavio.sk/${p.storeHandle}`,
  ].filter(Boolean).join("\n");

  const authHeader = "Basic " + btoa(`${sid}:${token}`);
  const formBody = new URLSearchParams();
  formBody.append("From", from);
  formBody.append("To", to);
  formBody.append("Body", msg);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return new Response(
        JSON.stringify({ ok: false, error: `Twilio ${res.status}`, details: err.slice(0, 300) }),
        { status: 502 }
      );
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 502 });
  }
}
