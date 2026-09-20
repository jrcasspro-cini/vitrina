// Vercel Edge Middleware — dynamic OG meta pre shop URL.
//
// Beží na kraji siete pri KAŽDOM requeste. Ak je URL v tvare /{handle}
// (obchod), fetchne dáta obchodu z Firestore REST API, zoberie
// pôvodné /index.html a **vloží** správne meta tagy (title, description,
// og:*, twitter:*) tak, aby social boti (Facebook, WhatsApp, LinkedIn,
// Slack, iMessage) videli krásny preview.
//
// Optimalizácia: ak nie je shop URL alebo Firestore vráti 404, middleware
// vráti undefined a Vercel spadne späť na štandardný SPA fallback.
//
// Poznámka na cache: Facebook si obrázky OG cachuje agresívne. Ak zmeníš
// slogan/tému, použi https://developers.facebook.com/tools/debug/ na force
// refresh. WhatsApp cache je 30 dní.

export const config = {
  // Iba HTML routy — vyhne sa /api/, statickým súborom a Vite assetom.
  matcher: [
    "/((?!api|assets|favicon|robots|sitemap|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|txt|xml|map)).*)",
  ],
};

const FIREBASE_PROJECT_ID = "vitrina-zavio";
const RESERVED = new Set([
  "",
  "app",
  "vytvorit",
  "admin-platformy",
  "podmienky",
  "ochrana-udajov",
  "reklamacie",
  "kontakt",
  "odstupenie",
  "demo",
]);

function escapeHtml(s: string): string {
  return (s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\n/g, " ");
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);

  // Vyhni sa rekurzii — self-fetch má tento header
  if (request.headers.get("x-vitrina-og-self") === "1") return;

  const path = url.pathname;
  // Získaj handle: /onkokozmetika -> "onkokozmetika"
  const handle = path.replace(/^\/+/, "").split("/")[0].toLowerCase();

  if (RESERVED.has(handle)) return; // landing / app / admin / legal — nechaj SPA

  try {
    // 1. Fetch shop data z Firestore REST (verejne čitateľné)
    const shopRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/stores/${encodeURIComponent(handle)}`,
      { headers: { "cache-control": "public, max-age=300" } }
    );
    if (!shopRes.ok) return; // neexistuje -> SPA sa postará

    const shop: any = await shopRes.json();
    const f = shop.fields || {};
    const name = (f.name?.stringValue || handle).trim();
    const tagline = (f.tagline?.stringValue || "").trim();
    const category = (f.category?.stringValue || "").trim();
    const theme = (f.theme?.stringValue || "sage").trim();

    // 2. Fetch pôvodné /index.html
    const indexRes = await fetch(new URL("/index.html", url), {
      headers: { "x-vitrina-og-self": "1" },
    });
    if (!indexRes.ok) return;
    let html = await indexRes.text();

    // 3. Zostav dynamické meta hodnoty
    const ogParams = new URLSearchParams({
      name,
      tagline,
      theme,
      category,
    });
    const ogImage = `${url.origin}/api/og?${ogParams.toString()}`;
    const title = `${name} — Vitrína`;
    const description = tagline
      ? `${tagline} · ${name} na Vitríne`
      : `${name}${category ? ` · ${category}` : ""} · Objednaj cez QR platbu a WhatsApp`;
    const pageUrl = `${url.origin}${path}`;

    // 4. Nahradza meta tagy (idempotentne — regex match akékoľvek content=)
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(
      /(<meta\s+name=["']description["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
      `$1${escapeAttr(description)}$2`
    );

    // OG tagy
    html = html.replace(
      /(<meta\s+property=["']og:title["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
      `$1${escapeAttr(title)}$2`
    );
    html = html.replace(
      /(<meta\s+property=["']og:description["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
      `$1${escapeAttr(description)}$2`
    );
    html = html.replace(
      /(<meta\s+property=["']og:url["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
      `$1${escapeAttr(pageUrl)}$2`
    );

    // og:image a twitter:image — pridaj ak neexistujú, inak nahraď
    const ogImageTag = `<meta property="og:image" content="${escapeAttr(ogImage)}" />`;
    const twImageTag = `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`;
    if (/og:image/i.test(html)) {
      html = html.replace(
        /(<meta\s+property=["']og:image["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
        `$1${escapeAttr(ogImage)}$2`
      );
    } else {
      html = html.replace("</head>", `  ${ogImageTag}\n  </head>`);
    }
    if (/twitter:image/i.test(html)) {
      html = html.replace(
        /(<meta\s+name=["']twitter:image["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
        `$1${escapeAttr(ogImage)}$2`
      );
    } else {
      html = html.replace("</head>", `  ${twImageTag}\n  </head>`);
    }

    // Twitter title/desc
    html = html.replace(
      /(<meta\s+name=["']twitter:title["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
      `$1${escapeAttr(title)}$2`
    );
    html = html.replace(
      /(<meta\s+name=["']twitter:description["']\s+content=["'])[^"']*(["']\s*\/?>)/i,
      `$1${escapeAttr(description)}$2`
    );

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return; // pass-through pri akejkoľvek chybe
  }
}
