import { useState, useEffect, MouseEvent } from "react";

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  // Animated WhatsApp mockup state
  const [typedText, setTypedText] = useState("");
  const [sendPulse, setSendPulse] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sendScale, setSendScale] = useState(1);

  // Mobile hamburger menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fullText = "Ahoj! Chcela by som si objednať 🛍️\n\n2× Strieborné náušnice — 24,90 €\n1× Retiazka s príveskom — 32,00 €\n\nMeno: Zuzana Kráľová\nAdresa: Bratislava\n\nSpolu: 56,90 €";
    let isMounted = true;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const runAnimation = async () => {
      while (isMounted) {
        if (!isMounted) break;
        setSendPulse(false);
        setShowHint(false);
        setTypedText("");
        setSendScale(1);

        // Type the text character by character
        for (let i = 0; i < fullText.length; i++) {
          if (!isMounted) return;
          setTypedText((prev) => prev + fullText[i]);
          await sleep(14); // typing speed
        }

        if (!isMounted) break;
        await sleep(500);
        
        if (!isMounted) break;
        setShowHint(true);
        setSendPulse(true);
        await sleep(1800);

        if (!isMounted) break;
        setSendPulse(false);
        setShowHint(false);
        setSendScale(0.85);
        await sleep(150);

        if (!isMounted) break;
        setSendScale(1);
        await sleep(1200);
      }
    };

    runAnimation();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNav = (e: MouseEvent, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <div className="landing-page-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&family=DM+Mono:wght@400;500&family=Pacifico&display=swap');

        /* Brand nápis "Vitrína" v hero — retro handlettered štýl */
        .landing-page-root .brand-inline {
          font-family: 'Pacifico', cursive;
          background: linear-gradient(180deg, #FFC542 0%, #FB923C 55%, #F97316 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 3px #1E3A5F;
          paint-order: stroke fill;
          letter-spacing: .01em;
          display: inline-block;
          padding-right: 10px;
        }
        @media (max-width: 560px) {
          .landing-page-root .brand-inline { -webkit-text-stroke: 2px #1E3A5F; }
        }

        .landing-page-root {
          --bg: #FAFAFF;
          --surface: #ffffff;
          --surface2: #F1F0FA;
          --border: rgba(20,20,40,.10);
          --text: #15151f;
          --muted: rgba(20,20,40,.70);
          --muted2: rgba(20,20,40,.55);

          /* Rozšírená paleta — bold ale friendly */
          --accent1: #7C3AED;       /* fialová */
          --accent2: #10B981;       /* mätová */
          --accent3: #F97316;       /* koralová */
          --accent4: #EC4899;       /* ružová */
          --accent5: #FBBF24;       /* zlatá */

          /* Subtle washy pastelové pozadia sekcií */
          --wash-purple: rgba(124, 58, 237, .05);
          --wash-coral: rgba(249, 115, 22, .05);
          --wash-mint: rgba(16, 185, 129, .05);
          --wash-pink: rgba(236, 72, 153, .05);
          --wash-gold: rgba(251, 191, 36, .06);

          --phone-frame: #15151f;
          --wa: #25D366;

          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          line-height: 1.6;
          overflow-x: hidden;
          width: 100%;
          min-height: 100vh;
        }

        /* Gradient text helper — použitý na kľúčové slová */
        .landing-page-root .grad-text {
          background: linear-gradient(90deg, var(--accent1) 0%, var(--accent4) 45%, var(--accent3) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }

        /* Aurora animácia — jemné pohyby gradient blobov */
        @keyframes aurora-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.06); }
        }
        .landing-page-root .aurora-blob { animation: aurora-float 14s ease-in-out infinite; will-change: transform; }
        .landing-page-root .aurora-blob.delay-2 { animation-delay: -4s; }
        .landing-page-root .aurora-blob.delay-3 { animation-delay: -8s; }
        @media (prefers-reduced-motion: reduce) {
          .landing-page-root .aurora-blob { animation: none; }
        }

        .landing-page-root *, 
        .landing-page-root *::before, 
        .landing-page-root *::after { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }

        .landing-page-root a { 
          color: inherit; 
          text-decoration: none; 
        }

        .landing-page-root .wrap { 
          max-width: 1180px; 
          margin: 0 auto; 
          padding: 0 32px; 
        }

        .landing-page-root .eyebrow { 
          font-family: 'DM Mono', monospace; 
          font-size: .7rem; 
          letter-spacing: .18em; 
          text-transform: uppercase; 
          color: var(--accent2); 
        }

        .landing-page-root h1, 
        .landing-page-root h2, 
        .landing-page-root h3, 
        .landing-page-root .display { 
          font-family: 'Righteous', sans-serif; 
          font-weight: 400; 
          letter-spacing: -.01em; 
        }

        .landing-page-root .grad-text { 
          background: linear-gradient(90deg, var(--accent2), var(--accent1)); 
          -webkit-background-clip: text; 
          background-clip: text; 
          color: transparent; 
        }

        .landing-page-root section { 
          position: relative; 
        }

        .landing-page-root .glow { 
          position: absolute; 
          border-radius: 50%; 
          filter: blur(120px); 
          pointer-events: none; 
          z-index: 0; 
        }

        .landing-page-root nav { 
          position: sticky; 
          top: 0; 
          z-index: 50; 
          background: rgba(246,246,250,.8); 
          backdrop-filter: blur(10px); 
          border-bottom: 1px solid var(--border); 
        }

        .landing-page-root .nav-inner { 
          max-width: 1180px; 
          margin: 0 auto; 
          padding: 18px 32px; 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
        }

        .landing-page-root .logo { 
          font-family: 'Righteous', sans-serif; 
          font-size: 1.1rem; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
        }

        .landing-page-root .logo .dot { 
          width: 8px; 
          height: 8px; 
          border-radius: 50%; 
          background: var(--accent2); 
          box-shadow: 0 0 12px var(--accent2); 
        }

        .landing-page-root .logo .sub { 
          font-family: 'DM Mono', monospace; 
          font-size: .65rem; 
          color: var(--muted2); 
          letter-spacing: .1em; 
          margin-left: 6px; 
        }

        .landing-page-root .nav-links { 
          display: flex; 
          gap: 32px; 
          font-size: .85rem; 
          color: var(--muted); 
        }

        .landing-page-root .nav-links a:hover { 
          color: var(--text); 
        }

        .landing-page-root .nav-cta { 
          border: 1px solid var(--border); 
          padding: 9px 20px; 
          border-radius: 8px; 
          font-size: .8rem; 
          letter-spacing: .03em; 
          transition: .2s; 
          cursor: pointer;
        }

        .landing-page-root .nav-cta:hover { 
          border-color: var(--accent2); 
          color: var(--accent2); 
        }

        /* Nav hamburger — skryté na desktope */
        .landing-page-root .nav-burger { display: none; background: none; border: 1px solid var(--border); color: var(--text); font-size: 1.3rem; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; align-items: center; justify-content: center; }
        .landing-page-root .nav-mobile { display: none; }

        @media (max-width: 900px) {
          .landing-page-root .nav-links { display: none; }
          .landing-page-root .nav-cta { display: none; }
          .landing-page-root .nav-burger { display: inline-flex; }
          .landing-page-root .nav-mobile { display: flex; flex-direction: column; padding: 8px 20px 20px; border-top: 1px solid var(--border); background: var(--bg); }
          .landing-page-root .nav-mobile a { padding: 14px 4px; border-bottom: 1px solid var(--border); font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text); text-decoration: none; font-size: 1rem; }
          .landing-page-root .nav-mobile a:last-child { border-bottom: none; }
          .landing-page-root .nav-mobile a.nav-mobile-cta { margin-top: 10px; background: linear-gradient(90deg, var(--accent2), var(--accent1)); color: #04040a; padding: 14px 20px; border-radius: 10px; text-align: center; font-weight: 700; }
        }

        /* Mobile — fine-tuning typografie a spacing */
        @media (max-width: 560px) {
          .landing-page-root .hero { padding: 40px 0 40px; }
          .landing-page-root .hero h1 { font-size: 2rem; line-height: 1.12; }
          .landing-page-root .hero p.lead { font-size: 1rem; }
          .landing-page-root .badge { font-size: .72rem; padding: 6px 12px; margin-bottom: 18px; }
          .landing-page-root .sec-head h2 { font-size: 1.6rem; }
          .landing-page-root .sec-head p { font-size: .9rem; }
          .landing-page-root .btn-primary { padding: 14px 24px; font-size: .9rem; }
          .landing-page-root .btn-ghost-outline { padding: 14px 20px; font-size: .88rem; }
          .landing-page-root .cta-row { flex-direction: column; align-items: stretch; }
          .landing-page-root .cta-row a { text-align: center; }
          .landing-page-root .trust-row { flex-wrap: wrap; gap: 8px 12px; font-size: .72rem; }
          .landing-page-root .rating-row { gap: 12px; }
          .landing-page-root .faq-item { padding: 14px 16px; }
          .landing-page-root .faq-item summary { font-size: .9rem; }
          .landing-page-root .faq-item p { font-size: .82rem; }
        }

        /* HERO */
        .landing-page-root .hero { padding: 90px 0 60px; }
        .landing-page-root .hero-inner { display: grid; grid-template-columns: 1.1fr .9fr; gap: 60px; align-items: center; }
        .landing-page-root .badge { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border); background: var(--surface); padding: 7px 16px; border-radius: 30px; font-size: .78rem; color: var(--muted); margin-bottom: 26px; }
        .landing-page-root .hero h1 { font-size: 3.4rem; line-height: 1.05; margin-bottom: 22px; letter-spacing: -.02em; }
        .landing-page-root .hero p.lead { font-family: 'DM Sans', sans-serif; font-weight: 300; font-size: 1.1rem; color: var(--muted); max-width: 520px; margin-bottom: 34px; }
        .landing-page-root .cta-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 30px; }
        
        .landing-page-root .btn-primary { 
          background: linear-gradient(90deg, var(--accent2), var(--accent1)); 
          color: #04040a; 
          font-weight: 500; 
          padding: 15px 30px; 
          border-radius: 10px; 
          font-size: .95rem; 
          display: inline-block; 
          transition: transform .2s, box-shadow .2s; 
          box-shadow: 0 8px 30px rgba(0,158,134,.15); 
          cursor: pointer;
        }
        .landing-page-root .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(0,158,134,.28); }
        
        .landing-page-root .btn-ghost-outline { 
          border: 1px solid var(--border); 
          color: var(--text); 
          font-size: .9rem; 
          padding: 14px 26px; 
          border-radius: 10px; 
          transition: .2s; 
          cursor: pointer;
        }
        .landing-page-root .btn-ghost-outline:hover { border-color: var(--accent2); }
        
        .landing-page-root .rating-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .landing-page-root .rating-avatars { display: flex; }
        .landing-page-root .rating-avatars span { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--bg); margin-left: -8px; display: flex; align-items: center; justify-content: center; font-size: .65rem; font-weight: 700; color: #04040a; }
        .landing-page-root .rating-avatars span:first-child { margin-left: 0; }
        .landing-page-root .stars { color: #ffb347; font-size: .85rem; letter-spacing: 1px; }
        .landing-page-root .rating-text { font-size: .8rem; color: var(--muted); }
        .landing-page-root .trust-row { display: flex; gap: 26px; flex-wrap: wrap; font-size: .78rem; color: var(--muted2); }
        .landing-page-root .trust-row span::before { content: '●'; color: var(--accent2); margin-right: 8px; font-size: .6rem; }

        .landing-page-root .phone { width: 290px; background: var(--phone-frame); border: 1px solid rgba(255,255,255,.08); border-radius: 34px; padding: 14px; box-shadow: 0 30px 70px rgba(20,20,40,.18); margin: 0 auto; position: relative; z-index: 2; }
        .landing-page-root .phone-screen { background: #1e1e2a; border-radius: 22px; padding: 20px 18px 24px; min-height: 460px; color: #f0f0f8; }
        .landing-page-root .phone-screen .ps-label { color: rgba(240,240,248,.4); }
        .landing-page-root .phone-screen .ps-item { border-bottom: 1px solid rgba(255,255,255,.08); }
        .landing-page-root .ps-label { font-family: 'DM Mono', monospace; font-size: .6rem; color: var(--muted2); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 6px; }
        .landing-page-root .ps-store { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .landing-page-root .ps-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--accent1), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .landing-page-root .ps-name { font-family: 'Righteous', sans-serif; font-size: 1rem; }
        .landing-page-root .ps-item { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--border); font-size: .78rem; }
        .landing-page-root .ps-item span:last-child { color: var(--accent2); font-family: 'DM Mono', monospace; }
        .landing-page-root .ps-qr { width: 90px; height: 90px; margin: 16px auto 10px; background: repeating-linear-gradient(0deg, var(--text) 0 5px, transparent 5px 10px), repeating-linear-gradient(90deg, var(--text) 0 5px, transparent 5px 10px); background-blend-mode: multiply; background-color: #fff; border-radius: 10px; opacity: .9; }
        .landing-page-root .ps-total { text-align: center; font-family: 'Righteous', sans-serif; font-size: 1.3rem; }
        .landing-page-root .ps-btn { margin-top: 14px; background: linear-gradient(90deg, var(--accent2), var(--accent1)); color: #04040a; text-align: center; padding: 12px; border-radius: 10px; font-size: .78rem; font-weight: 500; }
        
        .landing-page-root .float-tag { 
          position: absolute; 
          background: var(--surface); 
          border: 1px solid var(--border); 
          border-radius: 12px; 
          padding: 10px 16px; 
          font-size: .75rem; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          z-index: 3; 
          box-shadow: 0 12px 30px rgba(20,20,40,.12); 
        }
        .landing-page-root .float-tag .dot2 { width: 7px; height: 7px; border-radius: 50%; background: var(--accent2); }
        .landing-page-root .tag-a { top: 30px; left: -30px; }
        .landing-page-root .tag-b { bottom: 60px; right: -30px; }
        .landing-page-root .mock-wrap { position: relative; }

        /* Animovaný WhatsApp mockup */
        .landing-page-root .wam-screen { background: #ECE5DD; border-radius: 22px; overflow: hidden; min-height: 460px; display: flex; flex-direction: column; }
        .landing-page-root .wam-header { background: #1F2C24; color: #fff; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
        .landing-page-root .wam-back { font-size: 1rem; opacity: .8; }
        .landing-page-root .wam-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--accent1), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: .9rem; }
        .landing-page-root .wam-hdtext { flex: 1; }
        .landing-page-root .wam-name { font-size: .82rem; font-weight: 500; }
        .landing-page-root .wam-sub { font-size: .65rem; opacity: .6; }
        .landing-page-root .wam-icons { font-size: .8rem; opacity: .7; letter-spacing: 6px; }
        .landing-page-root .wam-body { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; align-items: center; }
        .landing-page-root .wam-daychip { background: #fff; opacity: .8; font-size: .62rem; padding: 3px 12px; border-radius: 8px; margin-bottom: 10px; color: #556; }
        .landing-page-root .wam-encrypted { background: #FFF6D6; color: #5a4a1e; font-size: .6rem; text-align: center; padding: 6px 10px; border-radius: 8px; margin-bottom: 16px; max-width: 220px; }
        .landing-page-root .wam-bubble { align-self: flex-start; background: #fff; border-radius: 4px 12px 12px 12px; padding: 12px 14px; font-size: .74rem; line-height: 1.7; color: #1a1a1a; box-shadow: 0 1px 2px rgba(0,0,0,.08); white-space: pre-wrap; min-height: 90px; max-width: 92%; text-align: left; }
        .landing-page-root .wam-cursor { animation: wamBlink 1s step-end infinite; color: var(--accent2); font-weight: bold; }
        
        @keyframes wamBlink { 50% { opacity: 0; } }
        
        .landing-page-root .wam-inputbar { background: #fff; margin: 0 8px 8px; border-radius: 24px; display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 14px; text-align: left; }
        .landing-page-root .wam-plus { font-size: 1rem; opacity: .7; }
        .landing-page-root .wam-inputtext { flex: 1; min-width: 0; }
        .landing-page-root .wam-prefill-label { font-family: 'DM Mono', monospace; font-size: .5rem; letter-spacing: .06em; color: var(--accent2); font-weight: 700; }
        .landing-page-root .wam-prefill-preview { font-size: .66rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .landing-page-root .wam-send { 
          width: 30px; 
          height: 30px; 
          border-radius: 50%; 
          background: var(--wa); 
          color: #fff; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: .75rem; 
          flex-shrink: 0; 
          transition: transform .2s; 
          cursor: pointer;
        }
        
        .landing-page-root .wam-send.pulse { animation: wamPulse 0.9s ease-in-out infinite; }
        
        @keyframes wamPulse { 
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,.5); } 
          50% { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(37,211,102,0); } 
        }
        
        .landing-page-root .wam-hint { 
          position: absolute; 
          bottom: 66px; 
          right: -6px; 
          background: var(--text); 
          color: #fff; 
          font-size: .68rem; 
          padding: 6px 12px; 
          border-radius: 8px; 
          opacity: 0; 
          transition: opacity .3s; 
          white-space: nowrap; 
          z-index: 10;
        }
        .landing-page-root .wam-hint.show { opacity: 1; }

        @media (max-width: 980px) {
          .landing-page-root .hero-inner { grid-template-columns: 1fr; }
          .landing-page-root .hero h1 { font-size: 2.4rem; }
          .landing-page-root .mock-wrap { margin-top: 20px; }
          .landing-page-root .tag-a, .landing-page-root .tag-b { display: none; }
        }

        /* CITY TICKER */
        .landing-page-root .ticker { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 26px 0; overflow: hidden; }
        .landing-page-root .ticker-inner { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; font-family: 'DM Mono', monospace; font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted2); }
        .landing-page-root .ticker-cities { display: flex; gap: 26px; flex-wrap: wrap; justify-content: center; color: var(--muted); font-family: 'DM Sans', sans-serif; font-size: .85rem; letter-spacing: 0; text-transform: none; }

        .landing-page-root .sec-head { max-width: 640px; margin-bottom: 50px; }
        .landing-page-root .sec-head.center { text-align: center; margin-left: auto; margin-right: auto; }
        .landing-page-root .sec-head h2 { font-size: 2.1rem; margin-top: 14px; }
        .landing-page-root .sec-head p { color: var(--muted); margin-top: 16px; font-size: 1rem; }

        /* SHOWCASE — wash purple */
        .landing-page-root .showcase { padding: 90px 0; background: var(--wash-purple); }
        .landing-page-root .showcase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .landing-page-root .sc-card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 22px; text-align: left; }
        .landing-page-root .sc-label { display: flex; justify-content: space-between; align-items: center; font-size: .75rem; color: var(--muted); margin-bottom: 16px; }
        .landing-page-root .sc-label .tag { color: var(--accent2); font-family: 'DM Mono', monospace; font-size: .68rem; }
        .landing-page-root .sc-store-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .landing-page-root .sc-avatar { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--accent1), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .landing-page-root .sc-item-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .landing-page-root .sc-item { background: var(--surface2); border-radius: 12px; padding: 12px; }
        .landing-page-root .sc-item .badge2 { display: inline-block; font-size: .62rem; background: rgba(0,158,134,.14); color: var(--accent2); padding: 2px 8px; border-radius: 6px; margin-bottom: 8px; }
        .landing-page-root .sc-item .name { font-size: .78rem; margin-bottom: 6px; }
        .landing-page-root .sc-item .price { font-family: 'Righteous', sans-serif; font-size: .95rem; }
        .landing-page-root .sc-wa-bubble { background: rgba(0,158,134,.08); border: 1px solid rgba(0,158,134,.22); border-radius: 12px; padding: 14px; font-size: .78rem; line-height: 1.7; }
        .landing-page-root .sc-wa-bubble b { color: var(--accent2); }
        .landing-page-root .sc-wa-note { text-align: right; font-size: .68rem; color: var(--muted2); margin-top: 10px; }
        @media (max-width: 900px) { .landing-page-root .showcase-grid { grid-template-columns: 1fr; } }

        /* STEPS — wash coral */
        .landing-page-root .steps { padding: 90px 0; background: var(--wash-coral); }
        .landing-page-root .steps-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); margin-top: 10px; }
        .landing-page-root .step3 { background: var(--bg); padding: 38px 30px; position: relative; text-align: left; }
        .landing-page-root .step3-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 1.1rem; }
        .landing-page-root .step3:nth-child(1) .step3-icon { background: linear-gradient(135deg, rgba(124,58,237,.14), rgba(124,58,237,.06)); border-color: rgba(124,58,237,.25); }
        .landing-page-root .step3:nth-child(2) .step3-icon { background: linear-gradient(135deg, rgba(249,115,22,.14), rgba(249,115,22,.06)); border-color: rgba(249,115,22,.25); }
        .landing-page-root .step3:nth-child(3) .step3-icon { background: linear-gradient(135deg, rgba(236,72,153,.14), rgba(236,72,153,.06)); border-color: rgba(236,72,153,.25); }
        .landing-page-root .step3-label { font-family: 'DM Mono', monospace; font-size: .68rem; color: var(--accent2); margin-bottom: 6px; }
        .landing-page-root .step3 h3 { font-size: 1.2rem; margin-bottom: 12px; }
        .landing-page-root .step3 p { color: var(--muted); font-size: .88rem; }
        @media (max-width: 860px) { .landing-page-root .steps-grid-3 { grid-template-columns: 1fr; } }

        /* FEATURES GRID */
        .landing-page-root .featgrid { padding: 90px 0; border-top: 1px solid var(--border); }
        .landing-page-root .fg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); margin-top: 50px; }
        .landing-page-root .fg-card { background: var(--bg); padding: 36px 30px; text-align: left; transition: background .25s ease, transform .25s ease; }
        .landing-page-root .fg-card:hover { background: var(--surface); transform: translateY(-3px); }
        .landing-page-root .fg-card:nth-child(3n+1) h3 { color: var(--accent1); }
        .landing-page-root .fg-card:nth-child(3n+2) h3 { color: var(--accent3); }
        .landing-page-root .fg-card:nth-child(3n+3) h3 { color: var(--accent4); }
        .landing-page-root .fg-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 1rem; }
        .landing-page-root .fg-card h3 { font-size: 1.05rem; margin-bottom: 10px; }
        .landing-page-root .fg-card p { color: var(--muted); font-size: .85rem; }
        @media (max-width: 900px) { .landing-page-root .fg-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .landing-page-root .fg-grid { grid-template-columns: 1fr; } }

        /* INDUSTRIES — wash mint */
        .landing-page-root .industries { padding: 90px 0; background: var(--wash-mint); }
        .landing-page-root .ind-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 50px; }
        .landing-page-root .ind-card { border-radius: 16px; overflow: hidden; border: 1px solid var(--border); background: var(--surface); text-align: left; }
        .landing-page-root .ind-card .art { height: 150px; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; position: relative; }
        .landing-page-root .ind-card .art::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.06), transparent 70%); }
        .landing-page-root .ind-card .body { padding: 20px; }
        .landing-page-root .ind-card h3 { font-size: 1rem; margin-bottom: 8px; }
        .landing-page-root .ind-card p { color: var(--muted); font-size: .82rem; }
        @media (max-width: 900px) { .landing-page-root .ind-grid-4 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .landing-page-root .ind-grid-4 { grid-template-columns: 1fr; } }

        /* FAQ — wash gold */
        .landing-page-root .faq { padding: 90px 0; background: var(--wash-gold); }
        .landing-page-root .faq-list { max-width: 780px; margin: 44px auto 0; display: flex; flex-direction: column; gap: 12px; }
        .landing-page-root .faq-item { background: rgba(255,255,255,.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--border); border-radius: 16px; padding: 18px 22px; transition: all .25s ease; }
        .landing-page-root .faq-item:hover { border-color: rgba(124,58,237,.25); background: rgba(255,255,255,.9); }
        .landing-page-root .faq-item[open] { background: rgba(255,255,255,.95); border-color: var(--accent1); box-shadow: 0 6px 30px rgba(124,58,237,.10); }
        .landing-page-root .faq-item summary { font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: .98rem; color: var(--text); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .landing-page-root .faq-item summary::-webkit-details-marker { display: none; }
        .landing-page-root .faq-item summary::after { content: "+"; font-size: 1.3rem; color: var(--accent2); font-weight: 400; flex-shrink: 0; transition: transform .2s; }
        .landing-page-root .faq-item[open] summary::after { content: "−"; transform: rotate(0); }
        .landing-page-root .faq-item p { color: var(--muted); font-size: .88rem; line-height: 1.65; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
        .landing-page-root .faq-item p b { color: var(--text); font-weight: 700; }

        /* PRE KOHO — wash pink */
        .landing-page-root .testimonials { padding: 90px 0; background: var(--wash-pink); }
        .landing-page-root .test-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 50px; }
        .landing-page-root .test-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 28px; display: flex; flex-direction: column; text-align: left; position: relative; overflow: hidden; transition: transform .25s ease, box-shadow .25s ease; }
        .landing-page-root .test-card:hover { transform: translateY(-4px); box-shadow: 0 14px 44px rgba(20,20,40,.10); }
        /* farebné top-bordery pre 3 karty */
        .landing-page-root .test-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--accent1); }
        .landing-page-root .test-card:nth-child(2)::before { background: var(--accent3); }
        .landing-page-root .test-card:nth-child(3)::before { background: var(--accent4); }
        .landing-page-root .test-card:nth-child(1) .test-stars { background: rgba(124,58,237,.10); }
        .landing-page-root .test-card:nth-child(2) .test-stars { background: rgba(249,115,22,.10); }
        .landing-page-root .test-card:nth-child(3) .test-stars { background: rgba(236,72,153,.10); }
        .landing-page-root .test-card .test-stars { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .landing-page-root .test-stars { color: #ffb347; font-size: .85rem; margin-bottom: 16px; letter-spacing: 2px; }
        .landing-page-root .test-quote { font-size: .92rem; color: var(--text); line-height: 1.7; margin-bottom: 20px; flex: 1; }
        .landing-page-root .test-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid var(--border); }
        .landing-page-root .test-person { display: flex; align-items: center; gap: 10px; }
        .landing-page-root .test-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .85rem; color: #04040a; }
        .landing-page-root .test-name { font-size: .85rem; font-weight: 500; }
        .landing-page-root .test-role { font-size: .72rem; color: var(--muted); }
        .landing-page-root .test-stat { text-align: right; }
        .landing-page-root .test-stat .num { font-family: 'Righteous', sans-serif; color: var(--accent2); font-size: 1rem; }
        .landing-page-root .test-stat .lbl { font-size: .62rem; color: var(--muted2); text-transform: uppercase; letter-spacing: .05em; }
        @media (max-width: 900px) { .landing-page-root .test-grid { grid-template-columns: 1fr; } }

        /* PRICING */
        .landing-page-root .pricing { padding: 90px 0; border-top: 1px solid var(--border); }
        .landing-page-root .save-note { text-align: center; font-size: .78rem; color: var(--accent2); margin-bottom: 6px; }
        .landing-page-root .price-table { border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
        .landing-page-root .price-cols { display: grid; grid-template-columns: 1.6fr repeat(2, 1fr); max-width: 720px; margin: 0 auto; }
        .landing-page-root .price-cols.header .pc { padding: 34px 20px; text-align: center; border-right: 1px solid var(--border); }
        .landing-page-root .price-cols.header .pc:last-child { border-right: none; }
        .landing-page-root .price-cols.header .pc.highlight { background: linear-gradient(135deg, rgba(124,58,237,.06), rgba(236,72,153,.06)); position: relative; }
        .landing-page-root .price-cols.header .pc.highlight::after { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--accent1), var(--accent4)); }
        .landing-page-root .plan-badge { display: inline-block; font-size: .62rem; background: linear-gradient(90deg, var(--accent1), var(--accent4)); color: #fff; padding: 3px 10px; border-radius: 20px; margin-bottom: 12px; font-weight: 700; letter-spacing: .05em; }
        .landing-page-root .plan-name { font-size: .9rem; color: var(--muted); margin-bottom: 8px; }
        .landing-page-root .plan-price { font-family: 'Righteous', sans-serif; font-size: 1.8rem; }
        .landing-page-root .plan-per { font-size: .7rem; color: var(--muted); }
        
        .landing-page-root .plan-cta { 
          margin-top: 16px; 
          display: inline-block; 
          font-size: .78rem; 
          padding: 9px 18px; 
          border-radius: 8px; 
          border: 1px solid var(--border); 
          cursor: pointer;
        }
        .landing-page-root .plan-cta.solid { background: var(--accent2); color: #04040a; border: none; font-weight: 600; }
        
        .landing-page-root .price-row { display: grid; grid-template-columns: 1.6fr repeat(2, 1fr); max-width: 720px; margin: 0 auto; border-top: 1px solid var(--border); }
        .landing-page-root .price-row .pc { padding: 16px 20px; text-align: center; font-size: .82rem; border-right: 1px solid var(--border); color: var(--muted); }
        .landing-page-root .price-row .pc:first-child { text-align: left; color: var(--text); }
        .landing-page-root .price-row .pc:last-child { border-right: none; }
        .landing-page-root .price-row.section-row { background: var(--surface); }
        .landing-page-root .price-row.section-row .pc { text-align: left; font-weight: 600; color: var(--text); font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; grid-column: 1 / -1; padding: 12px 20px; }
        .landing-page-root .check { color: var(--accent2); }
        .landing-page-root .dash { color: var(--muted2); }
        @media (max-width: 900px) { .landing-page-root .price-cols, .landing-page-root .price-row { font-size: .78rem; } }
        /* Mobile — label ide nad hodnoty, 2 plány vedľa seba (žiadny horizontálny scroll) */
        @media (max-width: 700px) {
          .landing-page-root .price-cols { grid-template-columns: 1fr 1fr !important; }
          /* Prvá bunka hlavičky "Porovnanie plánov" má v JSX inline display:flex — musíme prebiť */
          .landing-page-root .price-cols.header .pc:first-child { display: none !important; }
          .landing-page-root .price-cols.header .pc { padding: 24px 12px; }
          .landing-page-root .plan-price { font-size: 1.5rem; }
          .landing-page-root .price-row .pc:first-child {
            grid-column: 1 / -1;
            text-align: left;
            padding: 12px 16px 4px;
            font-weight: 600;
            color: var(--text);
            background: var(--surface2);
            border-right: none;
            font-size: .78rem;
          }
          .landing-page-root .price-row .pc { padding: 10px 12px; font-size: .82rem; }
          .landing-page-root .price-row.section-row .pc { padding: 12px 16px; }
        }

        /* FINAL CTA */
        .landing-page-root .final-cta { padding: 100px 0; }
        .landing-page-root .final-box { background: linear-gradient(135deg, #1a1035 0%, #2d1b5e 45%, #4c1d95 100%); border: 1px solid rgba(255,255,255,.10); border-radius: 28px; padding: 70px 50px; text-align: center; position: relative; overflow: hidden; }
        .landing-page-root .final-box::before { content: ""; position: absolute; top: -100px; left: -100px; width: 320px; height: 320px; background: var(--accent3); opacity: .25; border-radius: 50%; filter: blur(80px); }
        .landing-page-root .final-box::after { content: ""; position: absolute; bottom: -100px; right: -100px; width: 320px; height: 320px; background: var(--accent4); opacity: .25; border-radius: 50%; filter: blur(80px); }
        .landing-page-root .final-box > * { position: relative; z-index: 1; }
        .landing-page-root .final-box .eyebrow { color: var(--accent5); }
        .landing-page-root .final-box h2 { font-size: 2.4rem; margin-bottom: 18px; color: #ffffff; }
        .landing-page-root .final-box .accent-italic { font-style: italic; background: linear-gradient(90deg, var(--accent5), var(--accent3)); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
        .landing-page-root .final-box p { color: rgba(255,255,255,.75); max-width: 560px; margin: 0 auto 34px; }
        .landing-page-root .final-cta-row { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px; }
        .landing-page-root .final-box .btn-primary { background: linear-gradient(90deg, #4fd1c5, #3b6fd6); color: #04101f; }
        
        .landing-page-root .btn-secondary { 
          border: 1px solid var(--border); 
          color: var(--text); 
          padding: 15px 28px; 
          border-radius: 10px; 
          font-size: .9rem; 
          cursor: pointer;
        }
        .landing-page-root .final-box .btn-secondary { border: 1px solid rgba(244,246,251,.25); color: #f4f6fb; }
        .landing-page-root .final-box .final-trust span { color: rgba(244,246,251,.5); }
        .landing-page-root .final-trust { display: flex; justify-content: center; gap: 26px; flex-wrap: wrap; font-size: .78rem; color: var(--muted2); }

        /* FOOTER */
        .landing-page-root footer { padding: 60px 0 40px; }
        .landing-page-root .footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .landing-page-root .footer-desc { color: var(--muted); font-size: .85rem; margin-top: 14px; max-width: 280px; text-align: left; }
        .landing-page-root .footer-social { display: flex; gap: 14px; margin-top: 20px; }
        .landing-page-root .footer-social span { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: .8rem; color: var(--muted); }
        .landing-page-root .footer-col h4 { font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted2); margin-bottom: 16px; text-align: left; }
        .landing-page-root .footer-col a { display: block; font-size: .85rem; color: var(--muted); margin-bottom: 12px; text-align: left; }
        .landing-page-root .footer-col a:hover { color: var(--text); }
        .landing-page-root .footer-bottom { border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: .75rem; color: var(--muted2); }
        /* Mobile footer — 2 stĺpce, potom 1 stĺpec pod 480px */
        @media (max-width: 900px) {
          .landing-page-root .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
          .landing-page-root .footer-grid > div:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 480px) {
          .landing-page-root .footer-grid { grid-template-columns: 1fr; gap: 28px; }
          .landing-page-root .footer-grid > div:first-child { grid-column: auto; }
          .landing-page-root .footer-desc { max-width: none; }
        }
      `}</style>

      <nav>
        <div className="nav-inner">
          <div className="logo"><span className="dot"></span>Vitrína<span className="sub">by zavio</span></div>
          <div className="nav-links">
            <a href="#funkcie">Funkcie</a>
            <a href="#ako-to-funguje">Ako to funguje</a>
            <a href="#cena">Cenník</a>
            <a href="#pre-koho">Pre koho</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="/app" onClick={(e) => handleNav(e, "/app")} className="nav-cta">Ovládací panel →</a>
          <button
            className="nav-burger"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="nav-mobile">
            <a href="#funkcie" onClick={() => setMobileMenuOpen(false)}>Funkcie</a>
            <a href="#ako-to-funguje" onClick={() => setMobileMenuOpen(false)}>Ako to funguje</a>
            <a href="#cena" onClick={() => setMobileMenuOpen(false)}>Cenník</a>
            <a href="#pre-koho" onClick={() => setMobileMenuOpen(false)}>Pre koho</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <a href="/app" onClick={(e) => { setMobileMenuOpen(false); handleNav(e, "/app"); }} className="nav-mobile-cta">Ovládací panel →</a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="glow aurora-blob" style={{ width: "560px", height: "560px", background: "var(--accent1)", opacity: 0.18, top: "-180px", left: "-160px" }}></div>
        <div className="glow aurora-blob delay-2" style={{ width: "460px", height: "460px", background: "var(--accent3)", opacity: 0.16, top: "40px", right: "-140px" }}></div>
        <div className="glow aurora-blob delay-3" style={{ width: "380px", height: "380px", background: "var(--accent4)", opacity: 0.14, top: "220px", left: "45%" }}></div>
        <div className="wrap hero-inner">
          <div>
            <div className="badge">● Vyrobené na Slovensku, pripravené pre celý svet</div>
            <h1><span className="brand-inline">Vitrína</span> nie je e-shop.<br />Je to tvoj <span className="grad-text">výklad.</span></h1>
            <p className="lead">Vystav do nej len to, čo práve teraz predávaš najlepšie — šperky, kozmetiku, workshopy či čokoľvek iné. Zákazník si vyberie, zaplatí QR kódom priamo z bankovej appky a objednávka príde rovno na tvoj WhatsApp.</p>
            <div className="cta-row">
              <a href="/app" onClick={(e) => handleNav(e, "/app")} className="btn-primary">Prejsť na ovládací panel →</a>
              <a href="#showcase" className="btn-ghost-outline">🏬 Zobraziť demo obchod</a>
            </div>
            <div className="rating-row">
              <div className="rating-avatars">
                <span style={{ background: "var(--accent1)" }}>💎</span>
                <span style={{ background: "var(--accent2)" }}>🎨</span>
                <span style={{ background: "#B4557A" }}>🧁</span>
              </div>
              <div className="text-left">
                <div className="stars"><span style={{ color: "var(--text)", fontFamily: "'DM Sans'", fontWeight: 600 }}>Nová platforma — buď medzi prvými</span></div>
                <div className="rating-text">0 % provízia · Zrušiť kedykoľvek · Slovenský supp­ort</div>
              </div>
            </div>
            <div className="trust-row">
              <span>10 dní zdarma</span>
              <span>Nastavenie za 5 minút</span>
              <span>Bez kreditnej karty</span>
            </div>
          </div>
          <div className="mock-wrap">
            <div className="float-tag tag-a"><span className="dot2"></span>Zákazník pri pokladni</div>
            <div className="float-tag tag-b">⚡ Platba za 10 sekúnd</div>
            <div className="phone">
              <div className="wam-screen">
                <div className="wam-header">
                  <span className="wam-back">←</span>
                  <div className="wam-avatar">💍</div>
                  <div className="wam-hdtext">
                    <div className="wam-name">Ateliér Nika</div>
                    <div className="wam-sub">podnikanie</div>
                  </div>
                  <span className="wam-icons">📹 📞</span>
                </div>
                <div className="wam-body">
                  <div className="wam-daychip">Dnes</div>
                  <div className="wam-encrypted">🔒 Správy sú zabezpečené end-to-end šifrovaním.</div>
                  <div className="wam-bubble">
                    <span>{typedText}</span>
                    <span className="wam-cursor">|</span>
                  </div>
                </div>
                <div className="wam-inputbar">
                  <span className="wam-plus">😊</span>
                  <div className="wam-inputtext">
                    <div className="wam-prefill-label">PREDVYPLNENÉ Z VITRÍNY</div>
                    <div className="wam-prefill-preview">Ahoj! Chcela by som si objednať 🛍️</div>
                  </div>
                  <span 
                    className={`wam-send ${sendPulse ? "pulse" : ""}`} 
                    style={{ transform: `scale(${sendScale})` }}
                  >
                    ➤
                  </span>
                </div>
                <div className={`wam-hint ${showHint ? "show" : ""}`}>Ťukni pre odoslanie ↴</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CITY TICKER */}
      <section className="ticker">
        <div className="wrap ticker-inner">
          <span>Podpora malých podnikov naprieč celým Slovenskom</span>
        </div>
        <div className="wrap ticker-cities" style={{ marginTop: "12px" }}>
          <span>Bratislava</span><span>·</span><span>Košice</span><span>·</span><span>Prešov</span><span>·</span><span>Žilina</span><span>·</span><span>Nitra</span><span>·</span><span>Banská Bystrica</span>
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="showcase" id="showcase">
        <div className="wrap">
          <div className="sec-head text-left">
            <div className="eyebrow">Prečo predávať cez Vitrínu</div>
            <h2>Jeden obchod pre všetko, čo predávate — <span className="grad-text" style={{ fontStyle: "italic" }}>produkty, workshopy, rezervácie.</span></h2>
            <p>Šperky alebo kozmetika, kulinárske kurzy alebo prehliadky štúdií — jeden odkaz nahrádza nekonečné dohadovanie v správach. Zákazníci si vyberú, vy dostanete objednávku alebo rezerváciu v jednej prehľadnej správe.</p>
          </div>
          <div className="showcase-grid">
            <div className="sc-card">
              <div className="sc-label"><span>🛍️ Vaša stránka obchodu</span><span className="tag">eshop.zavio.sk/ateliernika</span></div>
              <div className="sc-store-header">
                <div className="sc-avatar">💍</div>
                <div>
                  <div style={{ fontFamily: "'Righteous', sans-serif", fontSize: "1rem" }}>Ateliér Nika</div>
                  <div style={{ fontSize: ".75rem", color: "var(--muted)" }}>Šperky · Bratislava</div>
                </div>
              </div>
              <div className="sc-item-grid">
                <div className="sc-item"><span className="badge2">BESTSELLER</span><div className="name">Strieborné náušnice</div><div className="price">24,90 €</div></div>
                <div className="sc-item"><span className="badge2" style={{ background: "rgba(0,158,134,.14)", color: "var(--accent2)" }}>3 VOĽNÉ</span><div className="name">Workshop: Prsteň</div><div className="price">59,00 €</div></div>
                <div className="sc-item"><div className="name">Retiazka s príveskom</div><div className="price">32,00 €</div></div>
                <div className="sc-item"><div className="name">Náramok na želanie</div><div className="price">18,00 €</div></div>
              </div>
            </div>
            <div className="sc-card">
              <div className="sc-label"><span>💬 WhatsApp sa otvorí s predvyplnenou objednávkou</span><span className="tag">Pripravené na odoslanie</span></div>
              <div className="sc-wa-bubble">
                <b>NOVÁ OBJEDNÁVKA · #A-1042</b><br /><br />
                <b>Zuzana Kráľová</b><br />
                Bratislava · +421 900 xxx xxx<br /><br />
                2× Strieborné náušnice — 24,90 €<br />
                1× Retiazka s príveskom — 32,00 €<br /><br />
                ✅ Platba odoslaná QR kódom<br />
                <b>Spolu: 56,90 €</b>
              </div>
              <div className="sc-wa-note">Predvyplnené na WhatsApp — odoslanie jedným klepnutím</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="steps" id="ako-to-funguje">
        <div className="wrap">
          <div className="sec-head text-left">
            <div className="eyebrow">Ako to funguje</div>
            <h2>Od odkazu v profile k potvrdenej objednávke — v troch krokoch.</h2>
            <p>Žiadne aplikácie na inštaláciu. Žiadne ovládacie panely na učenie sa. Len obchod, odkaz a prehľadný proces objednávania.</p>
          </div>
          <div className="steps-grid-3">
            <div className="step3">
              <div className="step3-icon">🏬</div>
              <div className="step3-label">KROK 01</div>
              <h3>Vytvorte si svoj obchod</h3>
              <p>Pridajte produkty alebo služby v priebehu pár minút pomocou sprievodcu s návodom a platbou pripravenou na QR kód.</p>
            </div>
            <div className="step3">
              <div className="step3-icon">🔗</div>
              <div className="step3-label">KROK 02</div>
              <h3>Zdieľajte svoj odkaz</h3>
              <p>Vložte odkaz na Vitrínu do svojho profilu, príbehov alebo chatu — všade to vyzerá profesionálne.</p>
            </div>
            <div className="step3">
              <div className="step3-icon">💬</div>
              <div className="step3-label">KROK 03</div>
              <h3>Získajte objednávky cez WhatsApp</h3>
              <p>Zákazníci dokončia objednávku a vy okamžite dostanete potvrdené objednávky na WhatsApp spolu s podrobnosťami.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="featgrid" id="funkcie">
        <div className="wrap">
          <div className="sec-head text-left">
            <div className="eyebrow">Funkcie</div>
            <h2>Všetko, čo malý obchod potrebuje — <span style={{ fontStyle: "italic", color: "var(--muted)" }}>nič, čo by nemal.</span></h2>
            <p>Postavené na základe reálnych výsledkov: menej správ, rýchlejšie vybavenie, spokojnejší zákazníci. Žiadne ovládacie panely, ktoré by sa bolo treba učiť.</p>
          </div>
          <div className="fg-grid">
            <div className="fg-card"><div className="fg-icon">🛍️</div><h3>Predávajte produkty alebo služby</h3><p>Fotografie, varianty, ceny — jedna vitrína pre obe strany, bez zložitého e-shop systému.</p></div>
            <div className="fg-card"><div className="fg-icon">📅</div><h3>Rezervácie, workshopy a prehliadky</h3><p>Termín, kapacita a trvanie služby — zákazníci si vyberú termín, vy dostanete potvrdenú rezerváciu.</p></div>
            <div className="fg-card"><div className="fg-icon">💬</div><h3>Predvyplnené objednávky cez WhatsApp</h3><p>Po dokončení objednávky sa otvorí WhatsApp s kompletne vyplnenou správou — meno, položky, adresa.</p></div>
            <div className="fg-card"><div className="fg-icon">🔗</div><h3>Jeden čistý odkaz</h3><p>Nahraďte chaotické zvýraznenia a viacero odkazov jednou stránkou, ktorá sa postará o všetko.</p></div>
            <div className="fg-card"><div className="fg-icon">⚡</div><h3>Platba QR kódom</h3><p>Okamžitá platba priamo na váš účet do cca 10 sekúnd — žiadna platobná brána, žiadna provízia.</p></div>
            <div className="fg-card"><div className="fg-icon">📱</div><h3>Zamerané na mobilné zariadenia</h3><p>Rýchle načítanie, bezpečné a navrhnuté presne pre spôsob, akým vaši zákazníci už nakupujú.</p></div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="industries">
        <div className="wrap">
          <div className="sec-head text-left">
            <div className="eyebrow">Pre koho je to určené</div>
            <h2>Vytvorené pre ľudí, ktorí už predávajú cez svoje telefóny.</h2>
          </div>
          <div className="ind-grid-4">
            <div className="ind-card">
              <div className="art" style={{ background: "linear-gradient(135deg, rgba(108,99,255,.25), rgba(0,158,134,.1))" }}>💍</div>
              <div className="body"><h3>Šperky a doplnky</h3><p>Ručná práca, obmedzené kolekcie — predávaj priamo z Instagramu.</p></div>
            </div>
            <div className="ind-card">
              <div className="art" style={{ background: "linear-gradient(135deg, rgba(0,158,134,.2), rgba(108,99,255,.12))" }}>🎨</div>
              <div className="body"><h3>Tréneri a lektori</h3><p>Nechajte účastníkov, aby si sami vybrali termín. Vy dostanete potvrdenú rezerváciu.</p></div>
            </div>
            <div className="ind-card">
              <div className="art" style={{ background: "linear-gradient(135deg, rgba(180,85,122,.22), rgba(108,99,255,.1))" }}>🧵</div>
              <div className="body"><h3>Ručná výroba</h3><p>Prijímajte hromadné aj drobné objednávky bez chaosu vo WhatsAppe.</p></div>
            </div>
            <div className="ind-card">
              <div className="art" style={{ background: "linear-gradient(135deg, rgba(255,179,71,.18), rgba(0,158,134,.1))" }}>👜</div>
              <div className="body"><h3>Móda a butiky</h3><p>Moderný zdieľateľný obchod, ktorý odráža vašu značku — bez zložitého e-commerce systému.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* PRE KOHO JE VITRÍNA */}
      <section className="testimonials" id="pre-koho">
        <div className="wrap">
          <div className="sec-head text-left">
            <div className="eyebrow">Pre koho je Vitrína</div>
            <h2>Malý predajca? Vitrína je pre teba.</h2>
            <p>Nepotrebuješ e-shop za tisíce eur ani skladový systém. Ak predávaš cez Instagram, Facebook alebo priamo cez WhatsApp — Vitrína ti dá poriadok a QR platbu, aby si nestrácala čas prepisovaním objednávok.</p>
          </div>
          <div className="test-grid">
            <div className="test-card">
              <div className="test-stars" style={{ fontSize: "1.8rem" }}>💎</div>
              <p className="test-quote"><b>Ručná výroba a šperky.</b> Sviečky, keramika, náhrdelníky, tašky, mydlá. Vystavíš 2–6 kúskov naraz, ostatné si necháš v zálohe a rotuješ podľa sezóny.</p>
              <div className="test-foot">
                <div className="test-person">
                  <div><div className="test-name">Typický profil</div><div className="test-role">Šperkárka, sviečkarka, keramikárka</div></div>
                </div>
              </div>
            </div>
            <div className="test-card">
              <div className="test-stars" style={{ fontSize: "1.8rem" }}>🎨</div>
              <p className="test-quote"><b>Kurzy, workshopy, rezervácie.</b> Cvičenie, doučovanie, joga, kaderníctvo, masáž. Klient si sám vyberie termín a rezervácia príde priamo na tvoj WhatsApp — bez SMS a chatov.</p>
              <div className="test-foot">
                <div className="test-person">
                  <div><div className="test-name">Typický profil</div><div className="test-role">Lektor, tréner, kaderníčka, masér</div></div>
                </div>
              </div>
            </div>
            <div className="test-card">
              <div className="test-stars" style={{ fontSize: "1.8rem" }}>🧁</div>
              <p className="test-quote"><b>Domáca kuchyňa a pečivo.</b> Torty na objednávku, koláče, chlieb z kvásku, domáce sirupy. Zákazník klikne, zaplatí QR kódom a ty si potvrdíš, kedy má prísť po objednávku.</p>
              <div className="test-foot">
                <div className="test-person">
                  <div><div className="test-name">Typický profil</div><div className="test-role">Cukrárka, pekárka, domáca farma</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="wrap">
          <div className="sec-head center">
            <div className="eyebrow">Časté otázky</div>
            <h2>Čo o Vitríne najčastejšie počúvame.</h2>
          </div>
          <div className="faq-list">
            <details className="faq-item">
              <summary>Musím mať IČO alebo živnosť?</summary>
              <p>Nie. Vitrína ťa neregistruje ani nevystavuje faktúry — funguje aj s osobným účtom. Ak zarobíš pravidelne, odporúčame si vybaviť živnosť pre daňové povinnosti, ale to je nezávislé od Vitríny.</p>
            </details>
            <details className="faq-item">
              <summary>Koľko si Vitrína berie z každej objednávky?</summary>
              <p><b>0 %.</b> Vitrína je predplatné (8 alebo 10 € mesačne), z tvojich predajov si nič neberie. Zákazník ti platí priamo na účet cez QR prevod — banka nezoberie nič, my nezoberieme nič.</p>
            </details>
            <details className="faq-item">
              <summary>Prečo QR kód, keď mi banka nepovie „zaplatil"?</summary>
              <p>QR je pohodlie pre zákazníka — nemusí opisovať IBAN a variabilný symbol. Banka mu automaticky vyplní správne údaje. Ty potom v internetbankingu jednoducho nájdeš platbu s tým VS a máš istotu.</p>
            </details>
            <details className="faq-item">
              <summary>Slovenské banky pre QR platbu podporujú?</summary>
              <p>Áno. Tatra banka, SLSP, VÚB, ČSOB, mBank, 365.bank, UniCredit — všetky majú Payme QR skener priamo v mobilnej aplikácii. Zákazník QR naskenuje, prevod dorazí do 10 sekúnd (SEPA Instant) alebo do 1–2 hodín (klasický prevod).</p>
            </details>
            <details className="faq-item">
              <summary>Môžem meniť produkty aj po tom, čo som dosiahol limit?</summary>
              <p>Áno. Zmažeš starý produkt → pridáš nový. Vitrína ti umožňuje <b>rotovať sezónnu ponuku</b> bez toho, aby si platil za veľký katalóg. Zmazané objednávky s predchádzajúcich produktov si zachovávaš.</p>
            </details>
            <details className="faq-item">
              <summary>Môžem zrušiť predplatné?</summary>
              <p>Kedykoľvek. Predplatné platí do konca zaplateného obdobia. Obchod potom prestane byť viditeľný pre zákazníkov, ale všetky dáta zostávajú zachované — kedykoľvek zapneš späť.</p>
            </details>
            <details className="faq-item">
              <summary>Ako mi chodia objednávky?</summary>
              <p>Zákazník klikne „Odoslať objednávku" a jeho WhatsApp sa otvorí s prednastavenou správou (produkty, cena, adresa, VS). Pošle ti ju a ty máš celú objednávku v chatu ako obyčajnú správu. Nič nový nemusíš inštalovať.</p>
            </details>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="cena">
        <div className="wrap">
          <div className="sec-head center">
            <div className="eyebrow">Cenník</div>
            <h2>Jednoduché a transparentné ceny</h2>
            <p>10 dní na vyskúšanie zadarmo, so všetkými funkciami. Potom si vyberieš, koľko vecí naraz chceš mať vystavených vo výklade.</p>
          </div>
          <div className="save-note">✓ 10 dní zdarma, žiadna kreditná karta</div>
          <div className="price-table">
            <div className="price-cols header">
              <div className="pc" style={{ textAlign: "left", display: "flex", alignItems: "flex-end" }}><span style={{ color: "var(--muted)", fontSize: ".8rem" }}>Porovnanie plánov</span></div>
              <div className="pc">
                <div className="plan-name">Štandard</div>
                <div className="plan-price">8 €<span className="plan-per">/mes.</span></div>
                <a href="/app" onClick={(e) => handleNav(e, "/app")} className="plan-cta">Vyskúšať 10 dní zdarma</a>
              </div>
              <div className="pc highlight">
                <div className="plan-badge">OBĽÚBENÉ</div>
                <div className="plan-name">Rozšírený</div>
                <div className="plan-price">10 €<span className="plan-per">/mes.</span></div>
                <a href="/app" onClick={(e) => handleNav(e, "/app")} className="plan-cta solid">Vyskúšať 10 dní zdarma</a>
              </div>
            </div>

            <div className="price-row section-row"><div className="pc">Základné funkcie</div></div>
            <div className="price-row"><div className="pc">Provízia platformy</div><div className="pc">0 %</div><div className="pc">0 %</div></div>
            <div className="price-row"><div className="pc">Aktívne produkty a rezervácie naraz</div><div className="pc">2</div><div className="pc">6</div></div>
            <div className="price-row"><div className="pc">Uložené produkty (neaktívne v zálohe)</div><div className="pc">Neobmedzené</div><div className="pc">Neobmedzené</div></div>
            <div className="price-row"><div className="pc">Mesačné objednávky</div><div className="pc">Neobmedzené</div><div className="pc">Neobmedzené</div></div>
            <div className="price-row"><div className="pc">Vlastná farba obchodu</div><div className="pc"><span className="check">✓</span></div><div className="pc"><span className="check">✓</span></div></div>

            <div className="price-row section-row"><div className="pc">Nástroje pre obchod</div></div>
            <div className="price-row"><div className="pc">Platba QR kódom</div><div className="pc"><span className="check">✓</span></div><div className="pc"><span className="check">✓</span></div></div>
            <div className="price-row"><div className="pc">Prehľad objednávok</div><div className="pc"><span className="check">✓</span></div><div className="pc"><span className="check">✓</span></div></div>
            <div className="price-row"><div className="pc">Automatické notifikácie</div><div className="pc"><span className="dash">—</span></div><div className="pc"><span className="check">✓</span></div></div>
          </div>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: ".85rem", marginTop: "26px" }}>Vitrína je tvoj výklad, nie sklad. Predávate viac ako 6 vecí naraz? Pre väčší sortiment odporúčame plnohodnotný e-shop.</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="wrap">
          <div className="final-box">
            <div className="eyebrow" style={{ marginBottom: "16px", display: "block" }}>Pripravený, keď budete pripravení</div>
            <h2>Váš obchod. <span className="accent-italic">Spustený do 5 minút.</span></h2>
            <p>Produkty, workshopy, rezervácie, prehliadky — o všetko sa postará jeden obchod a každá pokladňa sa otvorí s predvyplneným WhatsAppom. Žiadne poplatky za nastavenie, žiadna karta, žiadne viazanosti.</p>
            <div className="final-cta-row">
              <a href="/app" onClick={(e) => handleNav(e, "/app")} className="btn-primary">Prejsť na ovládací panel →</a>
              <a href="/app" onClick={(e) => handleNav(e, "/app")} className="btn-secondary">Prihlásiť sa</a>
            </div>
            <div className="final-trust">
              <span>10 dní zdarma na vyskúšanie</span><span>·</span><span>Nie je potrebná žiadna kreditná karta</span><span>·</span><span>Zrušiť kedykoľvek</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <div className="logo"><span className="dot"></span>Vitrína<span className="sub">by zavio</span></div>
              <p className="footer-desc">Najjednoduchší spôsob, ako premeniť svoj odkaz v bio na obchod, ktorý predáva — s objednávkami doručenými priamo do WhatsAppu.</p>
              <div className="footer-social"><span>◐</span><span>✕</span><span>in</span></div>
            </div>
            <div className="footer-col">
              <h4>Produkt</h4>
              <a href="#funkcie">Funkcie</a>
              <a href="#cena">Cenník</a>
              <a href="#ako-to-funguje">Ako to funguje</a>
              <a href="#pre-koho">Pre koho</a>
            </div>
            <div className="footer-col">
              <h4>Prípady použitia</h4>
              <a href="#">Šperky a doplnky</a>
              <a href="#">Tréneri a lektori</a>
              <a href="#">Ručná výroba</a>
              <a href="#">Módne butiky</a>
            </div>
            <div className="footer-col">
              <h4>Spoločnosť</h4>
              <a href="https://zavio.sk" target="_blank" rel="noreferrer">zavio.sk</a>
              <a href="mailto:info@zavio.sk">Kontakt</a>
              <a href="/podmienky" onClick={(e) => { e.preventDefault(); onNavigate("/podmienky"); }}>Podmienky</a>
              <a href="/ochrana-udajov" onClick={(e) => { e.preventDefault(); onNavigate("/ochrana-udajov"); }}>Ochrana údajov</a>
              <a href="/cookies" onClick={(e) => { e.preventDefault(); onNavigate("/cookies"); }}>Cookies</a>
              <a href="/reklamacie" onClick={(e) => { e.preventDefault(); onNavigate("/reklamacie"); }}>Reklamácie</a>
              <a href="/odstupenie" onClick={(e) => { e.preventDefault(); onNavigate("/odstupenie"); }}>Odstúpenie</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Zavio. Všetky práva vyhradené.</span>
            <span>Vyrobené na Slovensku.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
