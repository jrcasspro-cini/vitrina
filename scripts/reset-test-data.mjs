#!/usr/bin/env node
// Vyčistenie testovacích obchodov pred launchom naostro.
//
// Zmaže obchody uvedené v STORES_TO_DELETE (aj ich items a orders).
// NECHÁ pletene-babiky (demo pre marketing) — a všetky ostatné obchody.
//
// Pred spustením: skontroluj zoznam nižšie, edit-uj ak treba.
//
// Použitie:
//   cd ~/Downloads/vitrina/scripts
//   export FIREBASE_SERVICE_ACCOUNT="$(cat ~/Downloads/vitrina-zavio-firebase-adminsdk-*.json)"
//   node reset-test-data.mjs

import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const STORES_TO_DELETE = [
  "kvalitna-kozmetika",
  "onkokozmetika",
  "soupdog",
  "pletene-babiky",  // Unsplash obrázky boli mimo, demo store neskôr znova s reálnymi fotkami
];

const STORES_TO_KEEP = [
  // (žiadny — všetky testovacie sa mažú, prvý reálny predajca dostane čistú platformu)
];

// ─── Boot ──────────────────────────────────────────────────────────────────

const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  || (() => {
    try { return readFileSync(".firebase-service-account.json", "utf8"); }
    catch { return null; }
  })();

if (!raw) {
  console.error("Chýba FIREBASE_SERVICE_ACCOUNT env alebo .firebase-service-account.json");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore();

// ─── Delete helper ─────────────────────────────────────────────────────────

async function deleteStoreDeep(handle) {
  const ref = db.collection("stores").doc(handle);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`  ⚠️  ${handle}: obchod neexistuje, preskočené.`);
    return;
  }

  const itemsSnap = await db.collection("items").where("storeId", "==", handle).get();
  for (const d of itemsSnap.docs) {
    await d.ref.delete();
  }

  const ordersSnap = await db.collection("orders").where("storeId", "==", handle).get();
  for (const d of ordersSnap.docs) {
    await d.ref.delete();
  }

  await ref.delete();
  console.log(`  ✔ ${handle}: zmazané (${itemsSnap.size} items, ${ordersSnap.size} orders)`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[${new Date().toISOString()}] Reset testovacích dát...`);
  console.log(`\nMažem obchody:`);
  for (const handle of STORES_TO_DELETE) {
    await deleteStoreDeep(handle);
  }

  console.log(`\nOstávajúce obchody (kontrola):`);
  const remaining = await db.collection("stores").get();
  remaining.docs.forEach((d) => {
    const kept = STORES_TO_KEEP.includes(d.id) ? " (KEEP)" : "";
    console.log(`  • /${d.id}${kept}`);
  });

  console.log(`\nHotovo. Zostáva ti demo obchod na marketing:`);
  console.log(`  https://vitrina.zavio.sk/pletene-babiky`);
  console.log(`\nČerstvý superadmin:`);
  console.log(`  https://vitrina.zavio.sk/admin-platformy`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
