#!/usr/bin/env node
// Jednorázový skript — vytvorí ukážkový obchod pre demo/marketing účely.
//
// Použitie:
//   cd scripts
//   export FIREBASE_SERVICE_ACCOUNT="$(cat ~/Downloads/vitrina-zavio-firebase-adminsdk-*.json)"
//   node seed-demo.mjs
//
// Vytvorí obchod na `https://vitrina.zavio.sk/pletene-babiky` s 5 produktmi.
// Ak obchod už existuje, prepíše ho (idempotent).

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

// ─── Demo obchod ───────────────────────────────────────────────────────────

const STORE_HANDLE = "pletene-babiky";
const ADMIN_UID = null; // nastavíme null — obchod bude admin-owned

const store = {
  id: STORE_HANDLE,
  handle: STORE_HANDLE,
  name: "Pletené bábiky Anna",
  city: "Bratislava",
  phone: "+421 900 123 456",
  iban: "SK56 8360 5207 0042 0643 7919",
  category: "Ručná výroba",
  logo: "",
  plan: "extended",  // aby nemusela trial expirovať
  ownerId: "demo-owner",
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  // Demo popis (voliteľné, ak appka nezobrazuje neprekáža)
  desc: "Ručne pletené bábiky z prírodných materiálov. Každá je originál.",
};

// ─── Produkty ──────────────────────────────────────────────────────────────

const items = [
  {
    id: `${STORE_HANDLE}_babika-anna`,
    name: "Bábika Anna",
    desc: "Ručne pletená bábika s vyšívanou tvárou a bavlnenými šatočkami. Výška 30 cm. Vhodná pre deti od 3 rokov.",
    price: 25,
    unit: "ks",
    type: "product",
    imgUrl: "https://images.unsplash.com/photo-1516981879613-9f5da904015f?w=800&h=800&fit=crop",
    emoji: "🧶",
    badge: "Bestseller",
  },
  {
    id: `${STORE_HANDLE}_babika-sofia`,
    name: "Bábika Sofia",
    desc: "Krajšia sestra Anny, s hnedými vlasmi a ružovými šatočkami. Ručná práca — 12 hodín na kus.",
    price: 25,
    unit: "ks",
    type: "product",
    imgUrl: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&h=800&fit=crop",
    emoji: "🎀",
    badge: null,
  },
  {
    id: `${STORE_HANDLE}_ciapka-zima`,
    name: "Pletená čiapka Zima",
    desc: "Merino vlna, uni-size (55-58 cm). Farby: béžová, hnedá, čierna, ružová. Do správy pri objednávke uveď farbu.",
    price: 15,
    unit: "ks",
    type: "product",
    imgUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&h=800&fit=crop",
    emoji: "🧣",
    badge: null,
  },
  {
    id: `${STORE_HANDLE}_set-3-babik`,
    name: "Set 3 bábik s doručením",
    desc: "Set trojice bábik (Anna + Sofia + Emma) v darčekovej krabici. Ideálny darček. Cena vrátane doručenia po Slovensku.",
    price: 65,
    unit: "ks",
    type: "product",
    imgUrl: "https://images.unsplash.com/photo-1608486842526-d1f19eef7fef?w=800&h=800&fit=crop",
    emoji: "🎁",
    badge: "Darček",
  },
  {
    id: `${STORE_HANDLE}_kurz-pletenia`,
    name: "Kurz pletenia bábik",
    desc: "3-hodinový víkendový kurz u nás doma v Bratislave. Naučíš sa upliesť si vlastnú bábiku od nuly. Materiál v cene, sobota alebo nedeľa doobeda.",
    price: 40,
    unit: "os",
    type: "service",
    imgUrl: "https://images.unsplash.com/photo-1607000123132-3adc80f8faaf?w=800&h=800&fit=crop",
    emoji: "🎨",
    badge: "Nové",
  },
];

// ─── Beh ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Vytváram demo obchod "${store.name}" (handle: ${STORE_HANDLE})...`);

  await db.collection("stores").doc(STORE_HANDLE).set(store);
  console.log(`  ✔ Obchod uložený.`);

  for (const item of items) {
    const doc = {
      ...item,
      storeId: STORE_HANDLE,
      slot: "",
      leftCapacity: 0,
    };
    await db.collection("items").doc(item.id).set(doc);
    console.log(`  ✔ ${item.name} (${item.price} €)`);
  }

  console.log(`\nHotovo. Demo obchod je dostupný na:`);
  console.log(`  https://vitrina.zavio.sk/${STORE_HANDLE}`);
  console.log(`  https://vitrina-zavio.netlify.app/${STORE_HANDLE}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
