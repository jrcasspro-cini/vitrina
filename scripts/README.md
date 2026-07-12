# Vitrína — scripts

Cron skripty pre Vitrínu.

## check-trials.mjs

Prejde všetky obchody vo Firestore a pošle email predajcom, ktorým:

- končí trial za **3 dni** (varovanie), alebo
- trial im **dnes vypršal** (finálna správa).

Aby ten istý email neišiel viackrát v ten istý deň, do dokumentu obchodu si pamätáme
`trialWarn3SentAt` a `trialExpiredSentAt`.

## Ako to beží

Automaticky každý deň 05:00 UTC cez GitHub Actions (viď
`.github/workflows/trial-ending-check.yml`). Ručne z GitHub UI: Actions
→ *Trial-ending email check* → **Run workflow**.

## Lokálne testovanie

```bash
cd scripts
npm install

# Ulož service account JSON ako .firebase-service-account.json (nekomituj!).
# Alebo nastav env premennú FIREBASE_SERVICE_ACCOUNT s JSON obsahom.
export RESEND_API_KEY="re_xxx"

node check-trials.mjs
```

## Bezpečnosť

- `RESEND_API_KEY` a `FIREBASE_SERVICE_ACCOUNT` sú **GitHub Secrets**,
  do repa sa nedostanú.
- `.firebase-service-account.json` je v `.gitignore`.
