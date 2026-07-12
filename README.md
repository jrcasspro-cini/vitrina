# Vitrína

SaaS platforma pre malých predajcov a živnostníkov (šperky, kozmetika, sviečky, ručná výroba, doučovanie…) — "link-in-bio" obchod, kde si zákazník vyberie produkty, zaplatí QR kódom (bankový prevod) a objednávka príde predvyplnená na WhatsApp predajcu.

- **Produkčná appka:** [vitrina-zavio.netlify.app](https://vitrina-zavio.netlify.app)
- **Admin platformy:** `/admin-platformy` (iba pre správcu platformy)
- **Prevádzkovateľ:** Zavio (Jozef Rolik)

## Stack

- **Frontend:** React 19 + Vite 6 + TailwindCSS 4 + TypeScript
- **Auth + DB:** Firebase Authentication + Cloud Firestore
- **Hosting:** Netlify (auto-deploy z GitHub `main` branchu)
- **Payments:** QR kód s Payme/SEPA formátom (bankový prevod, žiadna platobná brána)

## Trial + predplatné

Nový predajca má 10-dňový trial s limitom 6 produktov. Po skončení:

- **Standard** — 8 €/mes, limit 2 produkty
- **Rozšírený** — 12 €/mes, limit 6 produktov
- **Bez plánu** — obchod sa skryje pre zákazníkov

Platba za predplatné je zatiaľ manuálna (bank prevod + ručne cez Admin platformu nastaviť plán). Integrácia s platobnou bránou je v pláne (viď priority nižšie).

## Local dev

```bash
npm install
cp .env.example .env.local   # doplň Firebase config
npm run dev
```

## Deploy

Push na `main` branch → Netlify automaticky zostaví a nasadí (~1-2 min).

```bash
git add -A
git commit -m "…"
git push origin main
```

## Súbory

- `src/App.tsx` — hlavná appka (auth, wizard, obchod pre zákazníkov, dashboard predajcu). Aktuálne 3000+ riadkov, plán je rozdeliť.
- `src/components/LandingPage.tsx` — verejný landing pre zavio.sk / vitrina-zavio.netlify.app
- `src/components/AdminPlatformy.tsx` — dashboard prevádzkovateľa (`/admin-platformy`)
- `src/firebase.ts` — Firebase init
- `firestore.rules` — bezpečnostné pravidlá (musí sa deployovať manuálne cez Firebase Console)

## Firebase projekt

- **Project ID:** `gen-lang-client-0971393570` (historicky "ONKO E-shop" — zdieľaný s inými AI Studio projektami, na TODO vytvoriť dedikovaný projekt)
- **Firestore DB:** `ai-studio-vitrna-c2588a60-4f0b-45c8-a986-0ee627206f01` (nie `(default)`)

## Priority

1. Reálna platobná brána pre predplatné (Stripe alebo bank prevod cez QR)
2. Vlastná doména `vitrina.zavio.sk`
3. Vytvoriť dedikovaný Firebase projekt (odseparovať od ONKO E-shop)
4. Cloud Function pre email upozornenia (koniec trialu, nové objednávky)
5. Rozdeliť `App.tsx` (aktuálne 3000+ riadkov v jednom komponente)
