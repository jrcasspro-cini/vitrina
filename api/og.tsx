// Dynamický OG image pre zdieľanie obchodov Vitríny.
//
// Voláme z middleware.ts pri každej návšteve /{handle} — bot (Facebook, WhatsApp,
// LinkedIn, Slack, iMessage) fetchne túto URL a dostane 1200×630 PNG s brandingom
// obchodu (názov, slogan, farba témy).
//
// Query params:
//   ?name=       — názov obchodu (napr. "Onkokozmetika")
//   ?tagline=    — slogan / hook obchodu
//   ?theme=      — kľúč témy (sage, rose, ocean, sunset, lavender, cocoa)
//   ?category=   — kategória (fallback ak nie je tagline)
//
// Deploy: Vercel automaticky prepne na edge runtime a nainštaluje @vercel/og.
// Náklady: každý render ~30 ms edge time, obraz sa cachuje CDN-om na hodiny.

// @ts-ignore — @vercel/og sa inštaluje pri build-e (dep v package.json)
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

// Farebné témy — musia zhruba zodpovedať STORE_THEMES v App.tsx
const THEMES: Record<string, { bg: string; card: string; text: string; accent: string; accentSoft: string }> = {
  sage:     { bg: "#EDF0E8", card: "#FFFFFF", text: "#2C3628", accent: "#647058", accentSoft: "#C7D0BC" },
  rose:     { bg: "#FBE9EA", card: "#FFFFFF", text: "#4A1E23", accent: "#9F4548", accentSoft: "#E8B6B9" },
  ocean:    { bg: "#E1EEF6", card: "#FFFFFF", text: "#1E3A5F", accent: "#3B6BA8", accentSoft: "#B8D1E8" },
  sunset:   { bg: "#FDF1E7", card: "#FFFFFF", text: "#5A2E1E", accent: "#B36A45", accentSoft: "#EDCFB7" },
  lavender: { bg: "#EFEBFB", card: "#FFFFFF", text: "#33265A", accent: "#7D5FB8", accentSoft: "#CFC2E8" },
  cocoa:    { bg: "#EFE4D6", card: "#FFFFFF", text: "#3E2A18", accent: "#805433", accentSoft: "#D4B98F" },
};

export default function handler(req: Request): Response {
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get("name") || "Vitrína").slice(0, 50);
    const tagline = (searchParams.get("tagline") || "").slice(0, 100);
    const themeKey = searchParams.get("theme") || "sage";
    const category = (searchParams.get("category") || "").slice(0, 60);
    const t = THEMES[themeKey] || THEMES.sage;

    const subtitle = tagline || category || "Predaj na Vitríne";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: t.bg,
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: 60,
            position: "relative",
          }}
        >
          {/* Ľavý stĺpec — hlavný obsah */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: 30,
            }}
          >
            {/* Header: brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  width: 56,
                  height: 56,
                  background: t.accent,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 34,
                }}
              >
                ⚡
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.5 }}>Vitrína</div>
                <div style={{ fontSize: 18, color: t.accent, marginTop: 2 }}>vitrina.zavio.sk</div>
              </div>
            </div>

            {/* Meno obchodu — hero */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: name.length > 22 ? 76 : 96,
                  fontWeight: 900,
                  color: t.text,
                  lineHeight: 1.05,
                  letterSpacing: -2,
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontSize: 34,
                  color: t.accent,
                  marginTop: 22,
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </div>
            </div>

            {/* Footer bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 20px",
                background: t.card,
                borderRadius: 999,
                border: `2px solid ${t.accentSoft}`,
                width: "fit-content",
              }}
            >
              <span style={{ fontSize: 22 }}>🛍️</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Vyber, zaplať QR, WhatsApp</span>
            </div>
          </div>

          {/* Pravý stĺpec — dekoratívny badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 340,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 280,
                height: 280,
                background: t.card,
                border: `4px solid ${t.accent}`,
                borderRadius: 40,
                boxShadow: `0 20px 60px ${t.accentSoft}`,
              }}
            >
              <div style={{ fontSize: 120, lineHeight: 1 }}>🏬</div>
              <div style={{ fontSize: 22, color: t.accent, fontWeight: 800, marginTop: 12, textAlign: "center" }}>
                MÔJ VÝKLAD
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e: any) {
    return new Response(`OG generation failed: ${String(e?.message || e)}`, { status: 500 });
  }
}
