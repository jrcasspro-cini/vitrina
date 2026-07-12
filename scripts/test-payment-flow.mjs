#!/usr/bin/env node
// Testovací skript — nastaví Firestore do stavu ktorý ukazuje všetky UI stavy naraz.
//
// Po spustení otvor v Chrome:
//   https://vitrina.zavio.sk/admin-platformy
// A uvidíš:
//   • MRR 18 € (Štandard 1 + Rozšírený 1)
//   • Žltý banner "1 obchod nahlásil platbu"
//   • Pri soupdog: 💰 Nahlásená platba + VS + tlačidlá "Aktivovať/Zamietnuť"
//   • Pri kvalitna-kozmetika: badge Štandard (8 €) + Predĺžiť 30d tlačidlo
//   • Pri onkokozmetika: badge Rozšírený (10 €) + Predĺžiť 30d tlačidlo
//   • Pri Pletené bábiky Anna: Trial (365 dní) + Štd/Rozš tlačidlá
//
// Použitie:
//   cd ~/Downloads/vitrina/scripts
//   export FIREBASE_SERVICE_ACCOUNT="$(cat ~/Downloads/vitrina-zavio-firebase-adminsdk-*.json)"
//   node test-payment-flow.mjs

import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  || (() => {
    try { return readFileSync(".firebase-service-account.json", "utf8"); }
    catch { return null; }
  })();

if (!raw) {
  console.error("Chýba FIREBASE_SERVICE_ACCOUNT env alebo .firebase-service-account.json");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(raw)),
});

const db = admin.firestore();

// ─── Nastavenia testu ──────────────────────────────────────────────────────

const NOW = Date.now();
const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;
const in30Days = new Date(NOW + DAYS_30_MS).toISOString();
const nowIso = new Date(NOW).toISOString();

const scenarios = [
  {
    handle: "kvalitna-kozmetika",
    label: "Kvalitna kozmetika → Štandard 30 dní aktívny",
    patch: {
      plan: "standard",
      planEndsAt: in30Days,
      paymentReported: false,
      paymentReportedAt: "",
      paymentReportedPlan: "",
    },
  },
  {
    handle: "onkokozmetika",
    label: "Onkokozmetika → Rozšírený 30 dní aktívny",
    patch: {
      plan: "extended",
      planEndsAt: in30Days,
      paymentReported: false,
      paymentReportedAt: "",
      paymentReportedPlan: "",
    },
  },
  {
    handle: "soupdog",
    label: "Soupdog → Predajca vybral Štandard a nahlásil platbu (čaká na schválenie)",
    patch: {
      plan: "standard",
      planEndsAt: "",       // ešte nie je aktívny
      paymentReported: true,
      paymentReportedAt: nowIso,
      paymentReportedPlan: "standard",
    },
  },
  {
    handle: "pletene-babiky",
    label: "Pletené bábiky Anna → Trial (nastavené v seed-demo)",
    patch: {
      plan: "",             // reset — pôvodne bolo "extended" bez planEndsAt
      planEndsAt: "",
      paymentReported: false,
      paymentReportedAt: "",
      paymentReportedPlan: "",
    },
  },
];

async function main() {
  console.log(`[${new Date().toISOString()}] Nastavujem testovací scenár...`);
  for (const s of scenarios) {
    const ref = db.collection("stores").doc(s.handle);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  ⚠️  ${s.handle}: obchod neexistuje, preskočené.`);
      continue;
    }
    await ref.set(s.patch, { merge: true });
    console.log(`  ✔ ${s.label}`);
  }
  console.log(`\nHotovo. Otvor si teraz:`);
  console.log(`  https://vitrina.zavio.sk/admin-platformy`);
  console.log(`\nOčakávaný stav:`);
  console.log(`  • Celkovo obchodov: 4`);
  console.log(`  • Štandard: 1 (kvalitna-kozmetika)`);
  console.log(`  • Rozšírený: 1 (onkokozmetika)`);
  console.log(`  • Trial: 2 (soupdog, pletene-babiky)`);
  console.log(`  • MRR: 18 €`);
  console.log(`  • Žltý banner "1 obchod nahlásil platbu" (soupdog)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
