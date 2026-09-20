// Odosielanie potvrdení objednávok cez Resend API.
//
// Voláme z handleCheckout po úspešnom uložení objednávky do Firestore.
// Odosielame 2 emaily:
//   1. Zákazníkovi — "Ďakujeme za objednávku" + rekapitulácia + platobné údaje
//   2. Predajcovi — "Nová objednávka" + kontakt na zákazníka + WhatsApp odkaz
//
// Setup:
//   1. Vytvor Resend účet na https://resend.com (free tier: 3000 emailov/mesiac, 100/deň)
//   2. Over doménu (napr. vitrina.zavio.sk) — pridaj SPF/DKIM DNS záznamy
//      alebo dočasne používaj "onboarding@resend.dev" pre testovanie
//   3. V dashboarde vytvor API key (napr. "vitrina-production")
//   4. Vercel → Settings → Environment Variables:
//        RESEND_API_KEY = re_XXXXXXXXXXX
//        FROM_EMAIL = "Vitrína <objednavky@vitrina.zavio.sk>"
//   5. Redeploy → funguje.
//
// Bez API kľúča endpoint vráti 200 + info hlášku (aplikácia nespadne, len email nepošle).
// Tak môžeš aplikáciu bezpečne nasadiť aj bez emailov a pridať Resend neskôr.

export const config = { runtime: "edge" };

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface OrderPayload {
  orderId: string;
  storeName: string;
  storeHandle: string;
  storeContactEmail?: string;
  storeIban?: string;
  variabilnySymbol: string;
  items: OrderItem[];
  subtotal: number;
  shippingLabel: string;
  shippingPrice: number;
  discountCode?: string;
  discountAmount?: number;
  total: number;
  customerName: string;
  customerCity: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTime?: string;
}

function fmtEur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function escapeHtml(s: string): string {
  return (s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

function customerEmailHtml(o: OrderPayload): string {
  const itemsHtml = o.items.map((it) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#334155;">${escapeHtml(it.name)} <span style="color:#94a3b8;">×${it.qty}</span></td>
      <td style="padding:8px 0;font-size:14px;color:#0f172a;text-align:right;font-weight:600;">${fmtEur(it.price * it.qty)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;padding:32px 28px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Potvrdenie objednávky</p>
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;">Ďakujeme, ${escapeHtml(o.customerName)} 💚</h1>
      <p style="margin:0 0 20px 0;font-size:14px;color:#475569;">Tvoju objednávku sme prijali. ${escapeHtml(o.storeName)} sa ti ozve so všetkými detailmi doručenia.</p>

      <div style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin:0 0 20px 0;">
        <p style="margin:0;font-size:12px;color:#64748b;">Číslo objednávky (variabilný symbol)</p>
        <p style="margin:4px 0 0 0;font-size:20px;color:#0f172a;font-weight:800;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(o.variabilnySymbol)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${itemsHtml}
        <tr><td colspan="2" style="padding:12px 0 8px 0;border-top:1px solid #e2e8f0;"></td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Medzisúčet</td><td style="padding:4px 0;font-size:13px;color:#64748b;text-align:right;">${fmtEur(o.subtotal)}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Doprava (${escapeHtml(o.shippingLabel || "—")})</td><td style="padding:4px 0;font-size:13px;color:#64748b;text-align:right;">${o.shippingPrice > 0 ? fmtEur(o.shippingPrice) : "Zdarma"}</td></tr>
        ${o.discountCode ? `<tr><td style="padding:4px 0;font-size:13px;color:#0e7a3b;">Zľava (${escapeHtml(o.discountCode)})</td><td style="padding:4px 0;font-size:13px;color:#0e7a3b;text-align:right;">− ${fmtEur(o.discountAmount || 0)}</td></tr>` : ""}
        <tr><td style="padding:10px 0 0 0;border-top:1px solid #e2e8f0;font-size:15px;color:#0f172a;font-weight:800;">Celkom</td><td style="padding:10px 0 0 0;border-top:1px solid #e2e8f0;font-size:15px;color:#0f172a;text-align:right;font-weight:800;">${fmtEur(o.total)}</td></tr>
      </table>

      ${o.storeIban ? `
      <div style="margin-top:24px;padding:16px 20px;background:#fefce8;border:1px solid #fde68a;border-radius:12px;">
        <p style="margin:0 0 8px 0;font-size:13px;color:#78350f;font-weight:700;">💳 Platobné údaje</p>
        <p style="margin:2px 0;font-size:13px;color:#78350f;"><strong>IBAN:</strong> <span style="font-family:monospace;">${escapeHtml(o.storeIban)}</span></p>
        <p style="margin:2px 0;font-size:13px;color:#78350f;"><strong>Variabilný symbol:</strong> <span style="font-family:monospace;">${escapeHtml(o.variabilnySymbol)}</span></p>
        <p style="margin:2px 0;font-size:13px;color:#78350f;"><strong>Suma:</strong> ${fmtEur(o.total)}</p>
      </div>` : ""}

      <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;">Vitrína — jednoduchý predaj na internete<br/><a href="https://vitrina.zavio.sk" style="color:#94a3b8;">vitrina.zavio.sk</a></p>
    </div>
  </div>
</body></html>`;
}

function sellerEmailHtml(o: OrderPayload): string {
  const itemsHtml = o.items.map((it) => `<li>${escapeHtml(it.name)} × ${it.qty} — <strong>${fmtEur(it.price * it.qty)}</strong></li>`).join("");
  const phone = (o.customerPhone || "").replace(/[^\d+]/g, "");
  const waLink = phone ? `https://wa.me/${phone.replace(/^\+/, "")}` : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;padding:32px 28px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px 0;font-size:12px;color:#0e7a3b;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">🎉 Nová objednávka</p>
      <h1 style="margin:0 0 20px 0;font-size:22px;color:#0f172a;">Objednávka <span style="font-family:monospace;">${escapeHtml(o.variabilnySymbol)}</span> · ${fmtEur(o.total)}</h1>

      <p style="margin:0 0 6px 0;font-size:13px;color:#475569;"><strong>Zákazník:</strong> ${escapeHtml(o.customerName)}</p>
      <p style="margin:0 0 6px 0;font-size:13px;color:#475569;"><strong>Mesto / adresa:</strong> ${escapeHtml(o.customerCity)}</p>
      ${o.customerPhone ? `<p style="margin:0 0 6px 0;font-size:13px;color:#475569;"><strong>Telefón:</strong> <a href="tel:${escapeHtml(o.customerPhone)}">${escapeHtml(o.customerPhone)}</a>${waLink ? ` · <a href="${waLink}">WhatsApp</a>` : ""}</p>` : ""}
      ${o.customerEmail ? `<p style="margin:0 0 6px 0;font-size:13px;color:#475569;"><strong>E-mail:</strong> <a href="mailto:${escapeHtml(o.customerEmail)}">${escapeHtml(o.customerEmail)}</a></p>` : ""}
      ${o.customerTime ? `<p style="margin:0 0 6px 0;font-size:13px;color:#475569;"><strong>Čas / termín:</strong> ${escapeHtml(o.customerTime)}</p>` : ""}

      <p style="margin:16px 0 6px 0;font-size:13px;color:#475569;"><strong>Položky:</strong></p>
      <ul style="margin:0 0 12px 20px;padding:0;font-size:13px;color:#334155;">${itemsHtml}</ul>

      <p style="margin:12px 0 4px 0;font-size:13px;color:#475569;"><strong>Doprava:</strong> ${escapeHtml(o.shippingLabel)} — ${o.shippingPrice > 0 ? fmtEur(o.shippingPrice) : "zdarma"}</p>
      ${o.discountCode ? `<p style="margin:0 0 4px 0;font-size:13px;color:#0e7a3b;"><strong>Zľava:</strong> ${escapeHtml(o.discountCode)} (− ${fmtEur(o.discountAmount || 0)})</p>` : ""}
      <p style="margin:8px 0 0 0;font-size:15px;color:#0f172a;font-weight:800;">Celkom: ${fmtEur(o.total)}</p>

      <a href="https://vitrina.zavio.sk/${escapeHtml(o.storeHandle)}" style="display:inline-block;margin-top:20px;padding:10px 18px;background:#647058;color:#fff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:700;">Otvoriť Admin</a>
    </div>
  </div>
</body></html>`;
}

async function sendResend(apiKey: string, from: string, to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${err.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "Vitrína <onboarding@resend.dev>";

  if (!apiKey) {
    // Bez API kľúča vraciame 200 — aplikácia nespadne, len email nepošleme.
    // Používateľ si nastaví RESEND_API_KEY neskôr.
    return new Response(
      JSON.stringify({ ok: false, skipped: true, reason: "RESEND_API_KEY nie je nastavený — email sa nepošle." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const o = body as OrderPayload;
  if (!o || !o.orderId || !o.customerName || !o.storeName) {
    return new Response(JSON.stringify({ error: "Chýbajú polia objednávky." }), { status: 400 });
  }

  const results: any = {};

  // 1. Email zákazníkovi (ak zadal email)
  if (o.customerEmail) {
    results.customer = await sendResend(
      apiKey,
      from,
      o.customerEmail,
      `Potvrdenie objednávky ${o.variabilnySymbol} — ${o.storeName}`,
      customerEmailHtml(o)
    );
  }

  // 2. Email predajcovi (ak má nastavený contact email)
  if (o.storeContactEmail) {
    results.seller = await sendResend(
      apiKey,
      from,
      o.storeContactEmail,
      `🎉 Nová objednávka ${o.variabilnySymbol} · ${fmtEur(o.total)} — ${o.customerName}`,
      sellerEmailHtml(o)
    );
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
