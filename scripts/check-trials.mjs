#!/usr/bin/env node
// Denný cron: prejde obchody vo Firestore a pošle email predajcom, ktorým:
//   • končí trial za 3 dni (varovanie), alebo
//   • trial práve dnes vypršal (final)
//
// Spúšťa sa cez GitHub Actions raz denne (viď .github/workflows/trial-ending-check.yml).
//
// Environment premenné (nastavené ako GitHub Secrets):
//   FIREBASE_SERVICE_ACCOUNT — celý JSON service account kľúča
//   RESEND_API_KEY           — kľúč z resend.com

import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Vitrína <noreply@zavio.sk>";
const APP_URL = "https://vitrina.zavio.sk";
// Používame default databázu vo Firebase projekte vitrina-zavio, čiže neposielame databaseId.

if (!RESEND_API_KEY) {
  console.error("Chýba RESEND_API_KEY.");
  process.exit(1);
}

// Firebase Admin — z env alebo z lokálneho súboru pre lokálne testovanie.
const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  || (() => {
    try { return readFileSync(".firebase-service-account.json", "utf8"); }
    catch { return null; }
  })();

if (!raw) {
  console.error("Chýba FIREBASE_SERVICE_ACCOUNT.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(raw)),
});

const db = admin.firestore();
// (default databáza — bez explicit databaseId)

const auth = admin.auth();

// ─── Utility ────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(isoDateStr) {
  if (!isoDateStr) return null;
  const t = new Date(isoDateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / DAY_MS);
}

// Stály 8-miestny variabilný symbol (musí byť rovnaký ako v App.tsx a AdminPlatformy.tsx).
function getPaymentVs(ownerId) {
  if (!ownerId) return "";
  let h = 0;
  for (let i = 0; i < ownerId.length; i++) {
    h = ((h << 5) - h) + ownerId.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h) % 90000000 + 10000000;
  return String(abs);
}

// Ak by cron pobehal dva-tri razy v ten istý deň, chceme aby email šiel len raz.
// Preto do stores dokumentu ukladáme kedy naposledy sme daný typ notifikácie poslali.
function alreadySentToday(store, key) {
  const last = store[key];
  if (!last) return false;
  const lastMs = new Date(last).getTime();
  if (Number.isNaN(lastMs)) return false;
  return Date.now() - lastMs < DAY_MS;
}

async function markSent(storeId, key) {
  await db.collection("stores").doc(storeId).update({
    [key]: new Date().toISOString(),
  });
}

// ─── Email šablóny ─────────────────────────────────────────────────────────

function emailTrialWarn3Days(storeName, daysLeft) {
  const subject = `Vitrína – tvoj trial končí za ${daysLeft} ${daysLeft === 1 ? "deň" : "dni"}`;
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
    <div style="background:#4F46E5;color:#fff;padding:24px;border-radius:16px 16px 0 0;">
      <h1 style="margin:0;font-size:24px;font-weight:900;">Vitrína</h1>
      <p style="margin:6px 0 0;opacity:.85;">tvoj výklad na internete</p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
      <p style="font-size:16px;line-height:1.55;">Ahoj <b>${storeName}</b>,</p>
      <p style="font-size:16px;line-height:1.55;">tvoj bezplatný <b>10-dňový trial</b> ti končí <b>za ${daysLeft} ${daysLeft === 1 ? "deň" : "dni"}</b>.</p>
      <p style="font-size:16px;line-height:1.55;">Aby tvoj obchod zostal viditeľný pre zákazníkov, vyber si niektorý z plánov:</p>
      <ul style="font-size:15px;line-height:1.8;padding-left:20px;">
        <li><b>Standard</b> — 8 €/mes, 2 produkty</li>
        <li><b>Rozšírený</b> — 10 €/mes, 6 produktov</li>
      </ul>
      <p style="text-align:center;margin:28px 0;">
        <a href="${APP_URL}/app" style="display:inline-block;background:#4F46E5;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">Vybrať plán</a>
      </p>
      <p style="font-size:13px;color:#64748b;line-height:1.6;">Po skončení trialu sa obchod automaticky skryje pre zákazníkov. Nič sa nezmaže — kedykoľvek to zapneš späť.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="font-size:12px;color:#94a3b8;text-align:center;">Vitrína je predajná platforma pre malých tvorcov. <a href="mailto:info@zavio.sk" style="color:#4F46E5;">info@zavio.sk</a></p>
    </div>
  </div>`;
  return { subject, html };
}

function emailPlanEnding(storeName, planLabel, amount, daysLeft, vs, iban) {
  const cistyIban = (iban || "").replace(/\s+/g, "").toUpperCase();
  const desc = encodeURIComponent(`Vitrina ${planLabel}`);
  const paymeUrl = cistyIban
    ? `https://payme.sk?v=1&iban=${cistyIban}&amount=${amount.toFixed(2)}&currency=EUR&vs=${vs}&desc=${desc}`
    : "";
  const qrUrl = paymeUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymeUrl)}`
    : "";
  const subject = daysLeft > 0
    ? `Vitrína – tvoj plán končí za ${daysLeft} ${daysLeft === 1 ? "deň" : "dni"}`
    : `Vitrína – tvoj plán dnes vyprša, čas obnoviť`;
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
    <div style="background:#4F46E5;color:#fff;padding:24px;border-radius:16px 16px 0 0;">
      <h1 style="margin:0;font-size:24px;font-weight:900;">Vitrína</h1>
      <p style="margin:6px 0 0;opacity:.85;">predĺženie predplatného</p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
      <p style="font-size:16px;line-height:1.55;">Ahoj <b>${storeName}</b>,</p>
      <p style="font-size:16px;line-height:1.55;">
        ${daysLeft > 0
          ? `tvoj plán <b>${planLabel}</b> ti končí <b>za ${daysLeft} ${daysLeft === 1 ? "deň" : "dni"}</b>.`
          : `tvoj plán <b>${planLabel}</b> dnes končí.`}
        Aby tvoj obchod zostal viditeľný pre zákazníkov, prosím zaplať:
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:15px;">
        <tr><td style="padding:8px 0;color:#64748b;">Suma:</td><td style="font-family:monospace;font-weight:700;">${amount.toFixed(2)} €</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">IBAN:</td><td style="font-family:monospace;font-weight:700;">${iban || "(admin ešte nedoplnil)"}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Variabilný symbol:</td><td style="font-family:monospace;font-weight:700;">${vs}</td></tr>
      </table>
      ${qrUrl ? `<p style="text-align:center;margin:20px 0;"><img src="${qrUrl}" alt="QR kód" style="border:1px solid #e2e8f0;border-radius:8px;padding:6px;background:#fff;" /></p>` : ""}
      <p style="font-size:14px;color:#334155;line-height:1.6;">Po prevode klikni v obchode na tlačidlo <b>„Nahlásiť platbu"</b> — plán aktivujeme do 24 hodín.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${APP_URL}/app" style="display:inline-block;background:#4F46E5;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">Otvoriť obchod</a>
      </p>
      <p style="font-size:13px;color:#64748b;line-height:1.6;">Variabilný symbol <b>${vs}</b> je tvoj stály identifikátor — použi ho pri každej mesačnej platbe.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="font-size:12px;color:#94a3b8;text-align:center;"><a href="mailto:info@zavio.sk" style="color:#4F46E5;">info@zavio.sk</a></p>
    </div>
  </div>`;
  return { subject, html };
}

function emailTrialExpired(storeName) {
  const subject = "Vitrína – tvoj trial skončil, obchod je skrytý";
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
    <div style="background:#DC2626;color:#fff;padding:24px;border-radius:16px 16px 0 0;">
      <h1 style="margin:0;font-size:24px;font-weight:900;">Vitrína</h1>
      <p style="margin:6px 0 0;opacity:.9;">trial ti dnes skončil</p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
      <p style="font-size:16px;line-height:1.55;">Ahoj <b>${storeName}</b>,</p>
      <p style="font-size:16px;line-height:1.55;">tvoj bezplatný trial dnes skončil. Aby zákazníci znovu videli tvoju vitrínu, vyber si plán:</p>
      <ul style="font-size:15px;line-height:1.8;padding-left:20px;">
        <li><b>Standard</b> — 8 €/mes, 2 produkty</li>
        <li><b>Rozšírený</b> — 10 €/mes, 6 produktov</li>
      </ul>
      <p style="text-align:center;margin:28px 0;">
        <a href="${APP_URL}/app" style="display:inline-block;background:#4F46E5;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">Aktivovať obchod</a>
      </p>
      <p style="font-size:13px;color:#64748b;line-height:1.6;">Nič sa nezmazalo. Tvoje produkty a nastavenia zostávajú — obchod je iba dočasne skrytý.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="font-size:12px;color:#94a3b8;text-align:center;">Vitrína je predajná platforma pre malých tvorcov. <a href="mailto:info@zavio.sk" style="color:#4F46E5;">info@zavio.sk</a></p>
    </div>
  </div>`;
  return { subject, html };
}

// ─── Odosielanie cez Resend ─────────────────────────────────────────────────

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Hlavný beh ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`[${new Date().toISOString()}] Trial + Plan-ending cron beží...`);

  // Načítaj údaje o Vitríne (IBAN pre platby predplatného).
  let vitrinaIban = "";
  try {
    const cfg = await db.collection("config").doc("company").get();
    if (cfg.exists) vitrinaIban = cfg.data().iban || "";
  } catch (e) {
    console.warn("Nepodarilo sa načítať config/company:", e.message);
  }

  const snap = await db.collection("stores").get();
  console.log(`Načítaných obchodov: ${snap.size}`);

  let trialWarned = 0;
  let trialExpired = 0;
  let planWarned = 0;
  let planExpired = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const s = { id: docSnap.id, ...docSnap.data() };

    // Bez ownerId nevieme kam poslať email.
    if (!s.ownerId) { skipped++; continue; }

    // Získaj email predajcu z Firebase Auth.
    let email;
    try {
      const u = await auth.getUser(s.ownerId);
      email = u.email;
    } catch (e) {
      console.warn(`Store ${s.id}: majiteľ ${s.ownerId} sa v Firebase Auth nenašiel.`);
      skipped++;
      continue;
    }
    if (!email) { skipped++; continue; }

    const storeName = s.name || s.handle || "predajca";
    const hasPaidPlan = s.plan === "standard" || s.plan === "extended";
    const planDaysLeft = daysUntil(s.planEndsAt);
    const planActive = hasPaidPlan && planDaysLeft !== null && planDaysLeft > 0;
    const trialDaysLeft = daysUntil(s.trialEndsAt);

    // ─── Vetva A: má aktívny platený plán → sleduj koniec plánu ─────────
    if (planActive) {
      const planLabel = s.plan === "standard" ? "Štandard" : "Rozšírený";
      const amount = s.plan === "standard" ? 8 : 10;
      const vs = getPaymentVs(s.ownerId);

      // 3 dni pred koncom plánu
      if (planDaysLeft === 3 && !alreadySentToday(s, "planWarn3SentAt")) {
        const { subject, html } = emailPlanEnding(storeName, planLabel, amount, 3, vs, vitrinaIban);
        try {
          await sendEmail(email, subject, html);
          await markSent(s.id, "planWarn3SentAt");
          console.log(`✔ Plan-3day warn → ${email} (${storeName})`);
          planWarned++;
        } catch (e) {
          console.error(`✘ Plan-3day warn error na ${email}:`, e.message);
        }
        continue;
      }
      // Deň keď plán končí (0 dní zostáva).
      if (planDaysLeft === 0 && !alreadySentToday(s, "planExpiredSentAt")) {
        const { subject, html } = emailPlanEnding(storeName, planLabel, amount, 0, vs, vitrinaIban);
        try {
          await sendEmail(email, subject, html);
          await markSent(s.id, "planExpiredSentAt");
          console.log(`✔ Plan-end → ${email} (${storeName})`);
          planExpired++;
        } catch (e) {
          console.error(`✘ Plan-end error na ${email}:`, e.message);
        }
        continue;
      }
      skipped++;
      continue;
    }

    // ─── Vetva B: v skúšobnej dobe → notifikuj o konci trialu ──────────────
    if (!s.trialEndsAt) { skipped++; continue; }
    if (trialDaysLeft === null) { skipped++; continue; }

    // 3 dni pred koncom trialu.
    if (trialDaysLeft === 3 && !alreadySentToday(s, "trialWarn3SentAt")) {
      const { subject, html } = emailTrialWarn3Days(storeName, 3);
      try {
        await sendEmail(email, subject, html);
        await markSent(s.id, "trialWarn3SentAt");
        console.log(`✔ Trial-3day warn → ${email} (${storeName})`);
        trialWarned++;
      } catch (e) {
        console.error(`✘ Trial-3day warn error na ${email}:`, e.message);
      }
      continue;
    }

    // Trial vypršal.
    if (trialDaysLeft <= 0 && !alreadySentToday(s, "trialExpiredSentAt")) {
      const { subject, html } = emailTrialExpired(storeName);
      try {
        await sendEmail(email, subject, html);
        await markSent(s.id, "trialExpiredSentAt");
        console.log(`✔ Trial-end → ${email} (${storeName})`);
        trialExpired++;
      } catch (e) {
        console.error(`✘ Trial-end error na ${email}:`, e.message);
      }
      continue;
    }

    skipped++;
  }

  console.log(`Hotovo: trial(warn=${trialWarned}, expired=${trialExpired}), plan(warn=${planWarned}, ending=${planExpired}), skipped=${skipped}.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
