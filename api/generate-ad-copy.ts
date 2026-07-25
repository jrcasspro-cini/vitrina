// AI generovanie textu pre platenú reklamu (Facebook/Instagram Ads) pre konkrétny
// produkt — nadpis (headline) a hlavný text (primary text), ktoré si predajca
// skopíruje priamo do Facebook Ads Manager pri vytváraní vlastnej reklamy.
//
// Dostupné len na Rozšírenom pláne — gating je aj na frontende (skryté tlačidlo),
// aj tu na serveri cez verifyExtendedPlanStore, aby endpoint nešlo zneužiť priamym
// volaním mimo appky. Nepúšťame ani nespravujeme žiadnu reklamu — len text.

export const config = { runtime: "edge" };

const MODEL = "gemini-flash-latest";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const FIREBASE_PROJECT_ID = "vitrina-zavio";

async function verifyExtendedPlanStore(storeId: unknown): Promise<boolean> {
  if (!storeId || typeof storeId !== "string") return false;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/stores/${encodeURIComponent(storeId)}`
    );
    if (!res.ok) return false;
    const doc: any = await res.json();
    const plan = doc?.fields?.plan?.stringValue;
    const planEndsAt = doc?.fields?.planEndsAt?.stringValue;
    if (plan !== "extended" || !planEndsAt) return false;
    return new Date(planEndsAt).getTime() > Date.now();
  } catch {
    return false;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY nie je nastavený na serveri." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Neplatné telo požiadavky." }), { status: 400 });
  }

  const { name, desc, price, storeName, storeId } = body || {};
  const nameStr = typeof name === "string" ? name.trim() : "";
  const descStr = typeof desc === "string" ? desc.trim() : "";
  const storeNameStr = typeof storeName === "string" ? storeName.trim() : "";
  const priceStr = typeof price === "number" ? `${price.toFixed(2)} €` : "";

  if (!nameStr) {
    return new Response(JSON.stringify({ error: "Chýba názov produktu." }), { status: 400 });
  }

  const allowed = await verifyExtendedPlanStore(storeId);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Táto funkcia je dostupná len obchodom na aktívnom Rozšírenom pláne." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const promptLines = [
    "Si skúsený copywriter pre platené reklamy na Facebooku a Instagrame pre malých slovenských predajcov.",
    "Na základe nasledujúcich informácií o produkte napíš text pre Facebook/Instagram reklamu:",
    '1) "headline" — krátky úderný nadpis reklamy, max 40 znakov.',
    '2) "primaryText" — hlavný text reklamy (to čo sa zobrazí nad obrázkom), 2-4 vety, max 200 znakov, s jasnou výzvou na akciu na konci (napr. "Objednaj cez odkaz v bio!"). Teplý, dôveryhodný tón, bez preháňania, bez klamlivých tvrdení.',
    "Píš výhradne po slovensky.",
    "",
    `Názov produktu: ${nameStr}`,
  ];
  if (descStr) promptLines.push(`Popis produktu: ${descStr}`);
  if (priceStr) promptLines.push(`Cena: ${priceStr}`);
  if (storeNameStr) promptLines.push(`Názov obchodu: ${storeNameStr}`);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptLines.join("\n") }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              headline: { type: "STRING" },
              primaryText: { type: "STRING" },
            },
            required: ["headline", "primaryText"],
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Gemini API ${res.status}`, details: [errText.slice(0, 300)] }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const json: any = await res.json();
    const textPart = json?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === "string");
    if (!textPart?.text) {
      return new Response(
        JSON.stringify({ error: "Gemini nevrátil žiadny text." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    let parsed: { headline?: string; primaryText?: string };
    try {
      parsed = JSON.parse(textPart.text);
    } catch {
      return new Response(
        JSON.stringify({ error: "Nepodarilo sa spracovať odpoveď AI." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ headline: parsed.headline || "", primaryText: parsed.primaryText || "" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Volanie na Gemini zlyhalo.", details: [String(err?.message || err)] }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
