// DEPRECATED — pôvodne pre okamžitú notifikáciu adminovi cez Resend.
// Nepoužíva sa (bolo zložité nastaviť RESEND_API_KEY v Vercel env).
// Notifikácia pri "Nahlásiť platbu" bude neskôr riešená cez GitHub Actions cron
// (check-trials.mjs), ktorý už používa RESEND_API_KEY z GitHub Secrets.
// Endpoint ponechaný z historických dôvodov, ale nikto ho z klienta nevolá.

export const config = { runtime: "edge" };

export default async function handler(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, deprecated: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
