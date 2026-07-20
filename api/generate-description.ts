// AI generovanie popisu produktu (krátky + podrobný popis) z názvu/kľúčových slov
// a voliteľne fotky produktu. Dostupné len na Rozšírenom pláne (gating je na
// strane frontendu, tento endpoint len robí samotné volanie na Gemini API).
//
// Používa textový model (nie image model) — je to výrazne lacnejšie ako
// generovanie fotiek. Vyžaduje ten istý GEMINI_API_KEY, čo je už nastavený
// v env premenných na Verceli pre generate-photos.

export const config = { runtime: "edge" };

// "gemini-flash-latest" je alias, ktorý Google priebežne presmeruváva na aktuálny
// GA Flash model — bezpečnejšie ako pevná verzia, ktorá časom prestane byť dostupná
// (presne to sa stalo s "gemini-2.5-flash").
const MODEL = "gemini-flash-latest";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

  const { name, keywords, image, mimeType, category } = body || {};
  const nameStr = typeof name === "string" ? name.trim() : "";
  const keywordsStr = typeof keywords === "string" ? keywords.trim() : "";
  const categoryStr = typeof category === "string" ? category.trim() : "";

  if (!nameStr && !keywordsStr && !image) {
    return new Response(
      JSON.stringify({ error: "Zadaj aspoň názov produktu alebo pár kľúčových slov." }),
      { status: 400 }
    );
  }

  const promptLines = [
    "Si skúsený copywriter pre malých slovenských predajcov (e-shopy, remeselníci, kozmetika, jedlo a podobne).",
    "Na základe nasledujúcich informácií o produkte napíš:",
    '1) "desc" — krátky pútavý popis/podtitulok, max 60 znakov (napr. "Vôňa: škorica a vanilka" alebo "Ručne vyrobené, 100% prírodné").',
    '2) "longDesc" — podrobnejší popis pre detail produktu, 2-4 vety, teplý a dôveryhodný tón, bez preháňania a bez klamlivých tvrdení o zdravotných účinkoch.',
    "Píš výhradne po slovensky. Neopakuj názov produktu doslovne v popise.",
    "",
    `Názov produktu: ${nameStr || "(nezadaný, over si ho z fotky ak je priložená)"}`,
  ];
  if (categoryStr) promptLines.push(`Kategória obchodu: ${categoryStr}`);
  if (keywordsStr) promptLines.push(`Kľúčové slová / poznámky od predajcu: ${keywordsStr}`);
  if (image) promptLines.push("K dispozícii je aj fotka produktu — použi ju na spresnenie popisu.");

  const parts: any[] = [{ text: promptLines.join("\n") }];
  if (image && typeof image === "string" && mimeType && typeof mimeType === "string") {
    parts.push({ inlineData: { mimeType, data: image } });
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              desc: { type: "STRING" },
              longDesc: { type: "STRING" },
            },
            required: ["desc", "longDesc"],
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

    let parsed: { desc?: string; longDesc?: string };
    try {
      parsed = JSON.parse(textPart.text);
    } catch {
      return new Response(
        JSON.stringify({ error: "Nepodarilo sa spracovať odpoveď AI." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ desc: parsed.desc || "", longDesc: parsed.longDesc || "" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Volanie na Gemini zlyhalo.", details: [String(err?.message || err)] }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
