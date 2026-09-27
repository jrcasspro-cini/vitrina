// Nová predajná landing page pre Vitrínu — postavená na probléme a riešení.
// Nahradzuje pôvodnú "Vitrína nie je e-shop" stránku na koreňovej URL "/".
// Pôvodná stránka je stále dostupná na /vitrina cez footer link.
//
// Kľúčová myšlienka: "Nemíňaj peniaze, kým si to nevyskúšaš."
// Cieľ: jeden hlavný cieľ — dostat návštevníka do /app (registrácia).

import { useState } from "react";

interface Props {
  onNavigate: (path: string) => void;
}

export default function LandingV2({ onNavigate }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── STYLE PALETA ──
  const C = {
    bg: "#FFFFFF",
    bgSoft: "#FAFAF7",
    ink: "#0F172A",
    text: "#334155",
    muted: "#64748B",
    accent: "#D97706",       // teplý amber — vyskočí, ale nie krikľavý
    accentDark: "#B45309",
    accentSoft: "#FEF3C7",
    line: "#E2E8F0",
    dangerBg: "#FEF2F2",
    dangerText: "#991B1B",
    successBg: "#ECFDF5",
    successText: "#065F46",
  };

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: "'Instrument Sans', system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800;900&family=Instrument+Sans:wght@400;500;600;700&display=swap');
        .lv2-disp { font-family: 'Sora', system-ui, sans-serif; letter-spacing: -0.02em; }
        .lv2-btn { transition: all 0.2s ease; }
        .lv2-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(217,119,6,0.35); }
        .lv2-btn:active { transform: translateY(0); }
        @media (max-width: 768px) {
          .lv2-hero-title { font-size: 3rem !important; line-height: 1.05 !important; }
          .lv2-section-title { font-size: 1.75rem !important; }
          .lv2-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════ NAV ═══ */}
      <header style={{ position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}`, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="lv2-disp" style={{ fontSize: "1.35rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
            <span style={{ color: C.accent }}>⚡</span> Vitrína
          </div>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <a href="#ako" onClick={(e) => { e.preventDefault(); document.getElementById("ako")?.scrollIntoView({ behavior: "smooth" }); }} style={{ color: C.muted, fontSize: 14, fontWeight: 600, textDecoration: "none", display: window.innerWidth < 640 ? "none" : "inline" }}>Ako to funguje</a>
            <a href="#cena" onClick={(e) => { e.preventDefault(); document.getElementById("cena")?.scrollIntoView({ behavior: "smooth" }); }} style={{ color: C.muted, fontSize: 14, fontWeight: 600, textDecoration: "none", display: window.innerWidth < 640 ? "none" : "inline" }}>Cena</a>
            <button onClick={() => onNavigate("/app")} className="lv2-btn" style={{ background: C.ink, color: "#fff", padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
              Prihlásiť sa
            </button>
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════ HERO ═══ */}
      <section style={{ padding: "80px 24px 100px", background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgSoft} 100%)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 14px", background: C.accentSoft, color: C.accentDark, borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: "0.02em" }}>
            🚀 Prvý krok do online predaja
          </div>
          <h1 className="lv2-disp lv2-hero-title" style={{ fontSize: "6rem", fontWeight: 900, lineHeight: 1.02, color: C.ink, marginBottom: 32, letterSpacing: "-0.03em" }}>
            Nemíňaj peniaze,<br/>kým si to <span style={{ color: C.accent }}>nevyskúšaš</span>.
          </h1>
          <p style={{ fontSize: "1.15rem", lineHeight: 1.6, color: C.text, maxWidth: 640, margin: "0 auto 20px", fontWeight: 500 }}>
            Nemá zmysel investovať stovky eur do webu, <b>kým nezistíš, či je o tvoje výrobky záujem</b>.
          </p>
          <p className="lv2-disp" style={{ fontSize: "1.5rem", fontWeight: 800, color: C.ink, marginBottom: 20 }}>
            Začni bez rizika.
          </p>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: C.text, maxWidth: 640, margin: "0 auto 36px" }}>
            Vitrína ti umožní začať za <b>8 € mesačne</b>. Zaregistruj sa, nahraj produkty, zdieľaj odkaz. Za pár dní vieš, či to funguje.
          </p>
          <button onClick={() => onNavigate("/app")} className="lv2-btn" style={{ background: C.accent, color: "#fff", padding: "18px 36px", borderRadius: 16, fontSize: "1.1rem", fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 6px 18px rgba(217,119,6,0.28)" }}>
            Skúsim to za 8 € →
          </button>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>
            5 dní zdarma · Bez kreditnej karty · Zrušíš kedykoľvek
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ AKO TO FUNGUJE ═══ */}
      <section id="ako" style={{ padding: "80px 24px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 className="lv2-disp lv2-section-title" style={{ fontSize: "2.5rem", fontWeight: 900, color: C.ink, marginBottom: 12 }}>
              Za 5 minút predávaš. Bez zložitostí.
            </h2>
            <p style={{ fontSize: "1.1rem", color: C.muted, maxWidth: 600, margin: "0 auto" }}>
              Nemusíš vedieť nič o weboch. Postup je jednoduchý.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              { num: "1", icon: "📷", title: "Nahraj svoje výrobky", text: "Napíš názov obchodu, pridaj logo, nahraj fotky produktov a napíš cenu. Zvládne to aj kto nikdy nerobil web." },
              { num: "2", icon: "🔗", title: "Zdieľaj odkaz", text: "Vitrína ti vytvorí adresu — napr. vitrina.zavio.sk/tvojobchod. Vlož ju do Instagram bio, WhatsApp status alebo pošli mamke." },
              { num: "3", icon: "💳", title: "Prijímaj objednávky", text: "Zákazník si vyberie, zaplatí QR kódom z bankovej appky. Objednávka ti príde na WhatsApp. Žiadny chat, žiadne dohady." },
            ].map((step) => (
              <div key={step.num} style={{ background: C.bgSoft, borderRadius: 20, padding: 28, border: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 900 }}>
                    {step.num}
                  </div>
                  <div style={{ fontSize: "2.25rem" }}>{step.icon}</div>
                </div>
                <h3 className="lv2-disp" style={{ fontSize: "1.35rem", fontWeight: 800, color: C.ink, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: "0.98rem", lineHeight: 1.6, color: C.text }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ PRE KOHO ═══ */}
      <section style={{ padding: "80px 24px", background: C.bgSoft }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 className="lv2-disp lv2-section-title" style={{ fontSize: "2.5rem", fontWeight: 900, color: C.ink, marginBottom: 12 }}>
              Ak niečo vyrábaš alebo ponúkaš — Vitrína je pre teba.
            </h2>
            <p style={{ fontSize: "1.05rem", color: C.muted }}>
              Nemusíš byť firma. Stačí, že máš čo predávať.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 32 }}>
            {[
              { emoji: "🎂", title: "Cukrárky a pekárky", text: "torty na objednávku, domáce koláče, chlieb z kvásku" },
              { emoji: "💍", title: "Šperkárky", text: "ručne robené prstene, náhrdelníky, náušnice" },
              { emoji: "🕯️", title: "Sviečkarky a mydlárky", text: "všetko čo sa dá spraviť doma s láskou" },
              { emoji: "🌸", title: "Kvetinárky", text: "kytičky, vence, sezónne aranžmány" },
              { emoji: "💄", title: "Kozmetika a starostlivosť", text: "prírodné krémy, mydlá, oleje, balzamy" },
              { emoji: "✂️", title: "Kaderníčky a kozmetičky", text: "klient si sám vyberie termín" },
              { emoji: "🎨", title: "Kreatívci a remeselníci", text: "obrazy, ilustrácie, drevené hračky, textil" },
              { emoji: "🌾", title: "Domáce farmy", text: "sirupy, med, syry, mladé maslo, vajíčka" },
              { emoji: "👗", title: "Malé butiky a móda", text: "2-6 sezónnych kúskov, ktoré rýchlo predáš" },
            ].map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "#fff", borderRadius: 14, border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: "1.75rem", flexShrink: 0 }}>{p.emoji}</div>
                <div>
                  <div className="lv2-disp" style={{ fontSize: "0.95rem", fontWeight: 800, color: C.ink }}>{p.title}</div>
                  <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 2 }}>{p.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: C.accentSoft, borderRadius: 16, padding: "20px 28px", textAlign: "center", border: `1px solid ${C.accent}20` }}>
            <p style={{ fontSize: "1.05rem", color: C.accentDark, fontWeight: 700, margin: 0 }}>
              Ak dnes berieš objednávky cez Facebook správy alebo si ich píšeš do zošita — <b>Vitrína ti dá poriadok.</b>
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ CENA ═══ */}
      <section id="cena" style={{ padding: "80px 24px", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 className="lv2-disp lv2-section-title" style={{ fontSize: "2.5rem", fontWeight: 900, color: C.ink, marginBottom: 12 }}>
              Férová cena. Bez záväzku.
            </h2>
            <p style={{ fontSize: "1.05rem", color: C.muted }}>
              5 dní zdarma · Zrušíš kedykoľvek · Žiadna kreditná karta pri registrácii
            </p>
          </div>
          <div className="lv2-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {/* Štandard */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 32, border: `2px solid ${C.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>ŠTANDARD</div>
              <div style={{ marginBottom: 20 }}>
                <span className="lv2-disp" style={{ fontSize: "3rem", fontWeight: 900, color: C.ink }}>8 €</span>
                <span style={{ fontSize: "1rem", color: C.muted, marginLeft: 4 }}>/ mesiac</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Vlastná Vitrína s farbami a logom", "2 aktívne produkty (kedykoľvek vymeníš)", "Neobmedzene objednávok", "QR platba z bankovej appky", "Objednávky priamo na WhatsApp"].map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, fontSize: "0.95rem", color: C.text }}>
                    <span style={{ color: C.accent, fontWeight: 900 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Rozšírený */}
            <div style={{ background: C.ink, color: "#fff", borderRadius: 20, padding: 32, border: `2px solid ${C.ink}`, position: "relative" }}>
              <div style={{ position: "absolute", top: -12, right: 20, background: C.accent, color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em" }}>
                NAJOBĽÚBENEJŠÍ
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: "0.1em", marginBottom: 8 }}>ROZŠÍRENÝ</div>
              <div style={{ marginBottom: 20 }}>
                <span className="lv2-disp" style={{ fontSize: "3rem", fontWeight: 900 }}>10 €</span>
                <span style={{ fontSize: "1rem", opacity: 0.7, marginLeft: 4 }}>/ mesiac</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Všetko zo Štandardu, plus:", "6 aktívnych produktov", "Automatické notifikácie (pripravujeme)", "Prioritný support"].map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, fontSize: "0.95rem", opacity: i === 0 ? 0.7 : 1 }}>
                    <span style={{ color: C.accent, fontWeight: 900 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Ubezpečujúci pás */}
          <div style={{ background: C.successBg, borderRadius: 16, padding: "20px 28px", border: `1px solid ${C.successText}30` }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "1.5rem" }}>✅</div>
                <div className="lv2-disp" style={{ fontSize: "0.95rem", fontWeight: 800, color: C.successText, marginTop: 4 }}>0 % provízia</div>
                <div style={{ fontSize: "0.82rem", color: C.successText, opacity: 0.8 }}>zákazník ti platí priamo na účet</div>
              </div>
              <div>
                <div style={{ fontSize: "1.5rem" }}>✅</div>
                <div className="lv2-disp" style={{ fontSize: "0.95rem", fontWeight: 800, color: C.successText, marginTop: 4 }}>Zrušíš kedykoľvek</div>
                <div style={{ fontSize: "0.82rem", color: C.successText, opacity: 0.8 }}>bez pokuty, bez otázok</div>
              </div>
              <div>
                <div style={{ fontSize: "1.5rem" }}>✅</div>
                <div className="lv2-disp" style={{ fontSize: "0.95rem", fontWeight: 800, color: C.successText, marginTop: 4 }}>Cena obedu</div>
                <div style={{ fontSize: "0.82rem", color: C.successText, opacity: 0.8 }}>za mesiac predaja</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ NAMIETKA ═══ */}
      <section style={{ padding: "80px 24px", background: C.bgSoft }}>
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <h2 className="lv2-disp lv2-section-title" style={{ fontSize: "2.5rem", fontWeight: 900, color: C.ink, marginBottom: 24 }}>
            A čo ak sa mi to nebude predávať?
          </h2>
          <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", border: `1px solid ${C.line}`, textAlign: "left", fontSize: "1.05rem", lineHeight: 1.7, color: C.text }}>
            <p style={{ marginBottom: 16 }}>To je presne dôvod, prečo sme spravili Vitrínu.</p>
            <p style={{ marginBottom: 16 }}>
              Za <b>8 € mesačne</b> si otestuješ, či o tvoje výrobky niekto stojí. Ak áno — super, máš prvých zákazníkov a stránku, ktorú môžeš rozvíjať.
            </p>
            <p style={{ marginBottom: 16 }}>
              Ak nie — po 2 mesiacoch vieš, že to netreba. <b>Stratíš 16 €.</b> Zistíš pravdu, ktorú by ti nikto nepovedal.
            </p>
            <p style={{ marginBottom: 0, color: C.accentDark, fontWeight: 700, fontSize: "1.1rem" }}>
              To je menej ako káva na týždeň.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ FINAL CTA ═══ */}
      <section style={{ padding: "100px 24px", background: `linear-gradient(135deg, ${C.ink} 0%, #1E293B 100%)`, color: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 className="lv2-disp" style={{ fontSize: "3rem", fontWeight: 900, marginBottom: 20, lineHeight: 1.1 }}>
            Nemíňaj peniaze.<br/>Vyskúšaj to.
          </h2>
          <p style={{ fontSize: "1.15rem", opacity: 0.85, marginBottom: 36, lineHeight: 1.6 }}>
            Vitrína je pripravená za 5 minút. Prvých 5 dní zdarma. Zrušíš kedykoľvek.
          </p>
          <button onClick={() => onNavigate("/app")} className="lv2-btn" style={{ background: C.accent, color: "#fff", padding: "20px 44px", borderRadius: 16, fontSize: "1.15rem", fontWeight: 800, border: "none", cursor: "pointer", marginBottom: 16 }}>
            Skúsim to za 8 € →
          </button>
          <div>
            <button onClick={() => onNavigate("/demo")} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.95rem", textDecoration: "underline", opacity: 0.85 }}>
              Chcem najprv vidieť, ako Vitrína vyzerá →
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ FOOTER ═══ */}
      <footer style={{ padding: "40px 24px", background: C.bg, borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: "0.85rem", color: C.muted }}>
            © 2026 Zavio — Vitrína je značka pre malých predajcov na Slovensku
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: "0.85rem" }}>
            <a href="/vitrina" onClick={(e) => { e.preventDefault(); onNavigate("/vitrina"); }} style={{ color: C.accentDark, fontWeight: 700, textDecoration: "none" }}>Viac o Vitríne</a>
            <a href="/podmienky" onClick={(e) => { e.preventDefault(); onNavigate("/podmienky"); }} style={{ color: C.muted, textDecoration: "none" }}>Podmienky</a>
            <a href="/ochrana-udajov" onClick={(e) => { e.preventDefault(); onNavigate("/ochrana-udajov"); }} style={{ color: C.muted, textDecoration: "none" }}>Ochrana údajov</a>
            <a href="/reklamacie" onClick={(e) => { e.preventDefault(); onNavigate("/reklamacie"); }} style={{ color: C.muted, textDecoration: "none" }}>Reklamácie</a>
            <a href="mailto:info@zavio.sk" style={{ color: C.muted, textDecoration: "none" }}>info@zavio.sk</a>
          </div>
        </div>
      </footer>
      {mobileMenuOpen && <div style={{ display: "none" }} />}
    </div>
  );
}
