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
const APP_URL = "https://vitrina-zavio.netlify.app";
const DATABASE_ID = "ai-studio-vitrna-c2588a60-4f0b-45c8-a986-0ee627206f01";

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
db.settings({ databaseId: DATABASE_ID });

const auth = admin.auth();

// ─── Utility ────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(isoDateStr) {
  if (!isoDateStr) return null;
  const t = new Date(isoDateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / DAY_MS);
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
        <li><b>Rozšírený</b> — 12 €/mes, 6 produktov</li>
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
        <li><b>Rozšírený</b> — 12 €/mes, 6 produktov</li>
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
  console.log(`[${new Date().toISOString()}] Trial-ending cron beží...`);

  const snap = await db.collection("stores").get();
  console.log(`Načítaných obchodov: ${snap.size}`);

  let warned = 0;
  let expired = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const s = { id: docSnap.id, ...docSnap.data() };

    // Obchody bez trialEndsAt neriešime.
    if (!s.trialEndsAt) { skipped++; continue; }

    // Zaplatené plány neriešime.
    if (s.plan === "standard" || s.plan === "extended") { skipped++; continue; }

    // Bez ownerId nevieme kam poslať email.
    if (!s.ownerId) { skipped++; continue; }

    const daysLeft = daysUntil(s.trialEndsAt);
    if (daysLeft === null) { skipped++; continue; }

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

    // 3 dni pred koncom.
    if (daysLeft === 3 && !alreadySentToday(s, "trialWarn3SentAt")) {
      const { subject, html } = emailTrialWarn3Days(storeName, 3);
      try {
        await sendEmail(email, subject, html);
        await markSent(s.id, "trialWarn3SentAt");
        console.log(`✔ 3-day warning → ${email} (${storeName})`);
        warned++;
      } catch (e) {
        console.error(`✘ Chyba pri odoslaní 3-day warning na ${email}:`, e.message);
      }
      continue;
    }

    // Trial vypršal (0 alebo záporne).
    if (daysLeft <= 0 && !alreadySentToday(s, "trialExpiredSentAt")) {
      const { subject, html } = emailTrialExpired(storeName);
      try {
        await sendEmail(email, subject, html);
        await markSent(s.id, "trialExpiredSentAt");
        console.log(`✔ Expired → ${email} (${storeName})`);
        expired++;
      } catch (e) {
        console.error(`✘ Chyba pri odoslaní expired na ${email}:`, e.message);
      }
      continue;
    }

    skipped++;
  }

  console.log(`Hotovo: ${warned} varovaní, ${expired} po expirácii, ${skipped} preskočených.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
