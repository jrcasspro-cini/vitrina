#!/usr/bin/env node
// NEBEZPEČNÝ skript — zmaže VŠETKY obchody + items + orders z Firestore.
// Použije sa pred launchom aby platforma bola čistá pre prvého reálneho predajcu.
//
// Použitie:
//   cd ~/Downloads/vitrina/scripts
//   export FIREBASE_SERVICE_ACCOUNT="$(cat ~/Downloads/vitrina-zavio-firebase-adminsdk-*.json)"
//   node wipe-all-stores.mjs

import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  || (() => {
    try { return readFileSync(".firebase-service-account.json", "utf8"); }
    catch { return null; }
  })();

if (!raw) {
  console.error("Chýba FIREBASE_SERVICE_ACCOUNT.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore();

async function main() {
  console.log(`[${new Date().toISOString()}] Wipe all stores + items + orders...`);

  // ─── Stores ─────────────────────────────────────────────────────────────
  const storesSnap = await db.collection("stores").get();
  console.log(`\nObchody: ${storesSnap.size}`);
  for (const doc of storesSnap.docs) {
    await doc.ref.delete();
    console.log(`  ✔ /${doc.id}`);
  }

  // ─── Items ──────────────────────────────────────────────────────────────
  const itemsSnap = await db.collection("items").get();
  console.log(`\nProdukty: ${itemsSnap.size}`);
  for (const doc of itemsSnap.docs) {
    await doc.ref.delete();
  }
  console.log(`  ✔ zmazaných ${itemsSnap.size} produktov`);

  // ─── Orders ─────────────────────────────────────────────────────────────
  const ordersSnap = await db.collection("orders").get();
  console.log(`\nObjednávky: ${ordersSnap.size}`);
  for (const doc of ordersSnap.docs) {
    await doc.ref.delete();
  }
  console.log(`  ✔ zmazaných ${ordersSnap.size} objednávok`);

  console.log(`\n✅ Hotovo. Platforma je čistá.`);
  console.log(`   Otvor si https://vitrina.zavio.sk a založ si svoj (jediný) testovací obchod.`);
  console.log(`   Aj vaše registrácie v Firebase Auth zostávajú — ak chceš úplný reset,`);
  console.log(`   zmaž ich manuálne v Firebase Console → Authentication → Users.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
