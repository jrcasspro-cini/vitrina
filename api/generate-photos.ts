// AI generovanie ďalších fotiek produktu z jednej nahratej fotky (funkcia dostupná
// len pre predajcov na Rozšírenom pláne — gating je na strane frontendu, tento
// endpoint len robí samotné volanie na Gemini API).
//
// Vstup: 1 fotka (base64 + mimeType). Endpoint zavolá Gemini image model
// (gemini-2.5-flash-image, tzv. "Nano Banana") 3x s rôznymi promptmi na varianty
// (iný uhol / scéna), a vráti až 3 vygenerované obrázky. Pri čiastočnom zlyhaní
// (napr. jeden variant sa nepodarí) vráti aspoň tie, čo vyšli — nezlyhá celé.
//
// Vyžaduje GEMINI_API_KEY nastavený v env premenných na Verceli (Project Settings
// → Environment Variables). Kľúč sa nikdy neposiela na klienta.

export const config = { runtime: "edge" };

const MODEL = "gemini-2.5-flash-image";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const DEFAULT_PROMPTS = [
  "Professional e-commerce product photography of the EXACT same product shown in the input image. Close-up angle, clean minimal light-grey studio background, soft studio lighting, sharp focus. Do not change the product itself, its shape, its label, logo, printed text or colors in any way — only change the camera angle, framing and background.",
  "Professional e-commerce product photography of the EXACT same product shown in the input image, styled as a natural lifestyle scene (e.g. on a wooden table or stone surface with a few tasteful complementary props nearby, soft natural light). Do not change the product itself, its shape, its label, logo, printed text or colors in any way — only change the background, props and composition.",
  "Professional e-commerce product photography of the EXACT same product shown in the input image, from a different angle (three-quarter view or slightly from above), simple clean background, soft even lighting, sharp focus. Do not change the product itself, its shape, its label, logo, printed text or colors in any way — only change the angle and background.",
];

// Ak predajca zadá vlastný popis scény (napr. "žena nanáša krém na tvár"), postavíme
// naň 3 varianty s rôznym rámovaním namiesto univerzálnych promptov vyššie — inak
// vychádzajú príliš podobné (len iné pozadie pri tom istom zátiší).
function buildPrompts(description?: string): string[] {
  if (!description || !description.trim()) return DEFAULT_PROMPTS;
  const scene = description.trim();
  const base = `Professional e-commerce product photography. The product bottle/jar/package must be the EXACT same as in the input image — do not change its shape, label, logo, printed text or colors in any way. Scene to depict: ${scene}.`;
  return [
    `${base} Close, sharp focus on the product within the scene, well-lit, high quality.`,
    `${base} Wider shot showing more of the surrounding context and environment, natural lighting.`,
    `${base} A different camera angle than the other shots, soft natural light, editorial style.`,
  ];
}

interface GenPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function generateOne(apiKey: string, prompt: string, imageBase64: string, mimeType: string) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      // Bez tohto Gemini defaultne vráti len text (žiadny obrázok) — musíme mu explicitne
      // povedať, že očakávame aj obrazový výstup.
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json: any = await res.json();
  const candidate = json?.candidates?.[0];
  const parts: GenPart[] = candidate?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  if (!imgPart?.inlineData) {
    const finishReason = candidate?.finishReason || json?.promptFeedback?.blockReason;
    throw new Error(
      `Gemini nevrátil obrázok${finishReason ? ` (dôvod: ${finishReason})` : ""} — možno bezpečnostný filter alebo nejasný vstup.`
    );
  }
  return { mimeType: imgPart.inlineData.mimeType, data: imgPart.inlineData.data };
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

  const { image, mimeType, description } = body || {};
  if (!image || typeof image !== "string" || !mimeType || typeof mimeType !== "string") {
    return new Response(JSON.stringify({ error: "Chýba obrázok (image) alebo mimeType." }), { status: 400 });
  }
  if (description !== undefined && (typeof description !== "string" || description.length > 300)) {
    return new Response(JSON.stringify({ error: "Popis scény je neplatný alebo príliš dlhý (max 300 znakov)." }), { status: 400 });
  }

  const prompts = buildPrompts(description);
  const results = await Promise.allSettled(
    prompts.map((prompt) => generateOne(apiKey, prompt, image, mimeType))
  );

  const images = results
    .filter((r): r is PromiseFulfilledResult<{ mimeType: string; data: string }> => r.status === "fulfilled")
    .map((r) => r.value);

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason?.message || r.reason));

  if (images.length === 0) {
    return new Response(
      JSON.stringify({ error: "Nepodarilo sa vygenerovať žiadnu fotku.", details: errors }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ images, errors }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
