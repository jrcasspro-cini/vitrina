// Onboarding email sekvencia — beží raz denne cez Vercel Cron.
//
// Logika:
//   Prejde všetky obchody v Firestore, pre každý spočíta dni od createdAt.
//   Podľa toho pošle vhodný email a označí ho v poli sentOnboardingEmails,
//   aby sa nesposielal dvakrát.
//
// Emaily (5-dňový trial):
//   Deň 1 (welcome)     — deň založenia + 1
//   Deň 3 (check-in)    — deň založenia + 3
//   Deň 5 (last chance) — deň založenia + 5 = koniec trialu
//   Deň 6 (hidden)      — obchod je skrytý, výzva na aktiváciu plánu
//
// Setup:
//   1. Rovnaké RESEND_API_KEY + FROM_EMAIL ako pre send-order-email
//   2. V /vitrina/vercel.json (root repo) pridaj:
//        {
//          "crons": [
//            { "path": "/api/cron/trial-emails", "schedule": "0 8 * * *" }
//          ]
//        }
//   3. Vercel free plán podporuje 1 cron/deň. Toto stačí.
//   4. Pridaj do env: CRON_SECRET (random string) — chráni endpoint pred zneužitím.

export const config = { runtime: "edge" };

const FIREBASE_PROJECT_ID = "vitrina-zavio";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

interface OnboardingEmail {
  day: 1 | 3 | 5 | 6;
  key: "welcome" | "checkin" | "lastday" | "hidden";
  subject: (storeName: string) => string;
  html: (storeName: string, handle: string) => string;
}

const EMAILS: OnboardingEmail[] = [
  {
    day: 1,
    key: "welcome",
    subject: (name) => `Vitajte vo Vitríne, ${name} 💚`,
    html: (name, handle) => baseTemplate(
      `Vitajte vo Vitríne!`,
      `Ahoj ${name}, ${name} je vaša prvá Vitrína a my sa tešíme, že ste tu.`,
      [
        "1. Nastavte si logo, farbu a slogan v Nastaveniach obchodu.",
        "2. Pridajte prvé 1-2 produkty (pár fotiek, cena, popis stačí).",
        "3. Skopírujte odkaz na obchod a vložte ho do Instagram bio.",
      ],
      `https://vitrina.zavio.sk/${handle}`,
      "Otvoriť môj obchod"
    ),
  },
  {
    day: 3,
    key: "checkin",
    subject: () => "Ako sa vám darí? Potrebujete pomôcť?",
    html: (name) => baseTemplate(
      `Ako to ide, ${name}?`,
      "Ste v polovici skúšobnej doby. Ak niečo neviete rozbehnúť, len napíšte — pomôžeme.",
      [
        "🎨 Nastavili ste si farbu a slogan?",
        "📸 Pridali ste aspoň 1 produkt s peknou fotkou?",
        "🔗 Zdieľali ste odkaz obchodu na Instagrame / Facebooku?",
      ],
      "https://vitrina.zavio.sk/app",
      "Otvoriť admin"
    ),
  },
  {
    day: 5,
    key: "lastday",
    subject: () => "⏰ Dnes končí Vaša skúšobná doba",
    html: (name) => baseTemplate(
      "Dnes je posledný deň skúšky",
      `${name}, aby Vaša Vitrína zostala aktívna, aktivujte si plán ešte dnes. Zajtra ráno by sa obchod automaticky skryl.`,
      [
        "✅ Štandard — 8 €/mes., 2 aktívne produkty",
        "✅ Rozšírený — 10 €/mes., 6 aktívnych produktov",
        "💳 Platba QR kódom prevodom — aktivácia hneď po zaplatení",
      ],
      "https://vitrina.zavio.sk/app",
      "Vybrať plán"
    ),
  },
  {
    day: 6,
    key: "hidden",
    subject: () => "Vaša Vitrína je skrytá — 1 klik na obnovu",
    html: (name) => baseTemplate(
      "Skúšobná doba vypršala",
      `${name}, Vaša Vitrína je momentálne skrytá pred verejnosťou. Zákazníci ju nevidia, kým neaktivujete plán. Nastavenia, produkty aj objednávky zostávajú uložené — kedykoľvek sa vrátite.`,
      [
        "Zvoľte si plán (8 alebo 10 €)",
        "Zaplaťte prevodom cez QR kód",
        "Obchod je znovu online do 30 sekúnd",
      ],
      "https://vitrina.zavio.sk/app",
      "Aktivovať Vitrínu"
    ),
  },
];

function baseTemplate(headline: string, intro: string, bullets: string[], cta: string, ctaLabel: string): string {
  const list = bullets.map((b) => `<li style="margin:6px 0;font-size:14px;color:#334155;">${b}</li>`).join("");
  return `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;padding:32px 28px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px 0;font-size:22px;color:#0f172a;">${headline}</h1>
      <p style="margin:0 0 16px 0;font-size:14px;color:#475569;">${intro}</p>
      <ul style="margin:0 0 20px 20px;padding:0;">${list}</ul>
      <a href="${cta}" style="display:inline-block;padding:12px 22px;background:#647058;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">${ctaLabel}</a>
      <p style="margin:24px 0 0 0;font-size:11px;color:#94a3b8;">Vitrína — jednoduchý predaj na internete<br/><a href="https://vitrina.zavio.sk" style="color:#94a3b8;">vitrina.zavio.sk</a></p>
    </div>
  </div>
</body></html>`;
}

async function fsList(collection: string): Promise<any[]> {
  const res = await fetch(`${FS_BASE}/${collection}?pageSize=300`);
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.documents || [];
}

async function fsPatch(path: string, fields: Record<string, any>, updateMask: string[]): Promise<boolean> {
  const url = `${FS_BASE}/${path}?${updateMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&")}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts === "string") return new Date(ts);
  if (ts.timestampValue) return new Date(ts.timestampValue);
  return null;
}

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

async function sendResend(apiKey: string, from: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch { return false; }
}

export default async function handler(req: Request): Promise<Response> {
  // Vercel Cron pošle GET s Authorization: Bearer $CRON_SECRET
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "Vitrína <onboarding@resend.dev>";
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "RESEND_API_KEY not set" }), { status: 200 });
  }

  const stores = await fsList("stores");
  const summary: any = { processed: 0, sent: 0, skipped: 0, errors: [] };

  for (const doc of stores) {
    summary.processed++;
    try {
      const fields = doc.fields || {};
      const handle = (fields.handle?.stringValue) || (doc.name?.split("/").pop() || "");
      const name = fields.name?.stringValue || handle;
      const contactEmail = fields.contactEmail?.stringValue || "";
      const createdAt = tsToDate(fields.createdAt);
      const plan = fields.plan?.stringValue || "";
      const paymentReported = fields.paymentReported?.booleanValue || false;
      const sent = fields.sentOnboardingEmails?.mapValue?.fields || {};

      if (!contactEmail || !createdAt) { summary.skipped++; continue; }
      // Ak už zaplatil, nechaj ho na pokoji
      if (plan && paymentReported) { summary.skipped++; continue; }

      const days = daysSince(createdAt);
      const emailToday = EMAILS.find((e) => e.day === days);
      if (!emailToday) { summary.skipped++; continue; }
      if (sent[emailToday.key]) { summary.skipped++; continue; }

      const ok = await sendResend(apiKey, from, contactEmail, emailToday.subject(name), emailToday.html(name, handle));
      if (ok) {
        // Označ email ako odoslaný
        const newSent = { ...sent, [emailToday.key]: { booleanValue: true } };
        await fsPatch(`stores/${handle}`, {
          sentOnboardingEmails: { mapValue: { fields: newSent } },
        }, ["sentOnboardingEmails"]);
        summary.sent++;
      } else {
        summary.errors.push(`${handle}: send failed`);
      }
    } catch (e: any) {
      summary.errors.push(String(e?.message || e));
    }
  }

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
