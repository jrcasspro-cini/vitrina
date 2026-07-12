import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export type LegalPageType =
  | "podmienky"
  | "ochrana-udajov"
  | "cookies"
  | "reklamacie"
  | "odstupenie";

interface LegalPageProps {
  type: LegalPageType;
  onNavigate: (path: string) => void;
}

// Údaje firmy — načítajú sa z Firestore `config/company`.
// Ak dokument ešte neexistuje (napr. pred vyplnením v Admin sekcii),
// stránka ukazuje "(nedoplnené)" — aby bolo v prehliadači jasne vidno,
// čo treba doplniť pred spustením naostro.
export interface CompanyInfo {
  nazov: string;
  adresa: string;
  ico: string;
  dic: string;
  ic_dph: string;
  register: string;
  datum_ucinnosti: string;
  kontakt: string;
  iban?: string;
}

const EMPTY: CompanyInfo = {
  nazov: "(nedoplnené — Admin → Údaje firmy)",
  adresa: "(nedoplnené)",
  ico: "(nedoplnené)",
  dic: "(nedoplnené)",
  ic_dph: "(nedoplnené)",
  register: "(nedoplnené)",
  datum_ucinnosti: "(nedoplnené)",
  kontakt: "info@zavio.sk",
};

function useCompany(): CompanyInfo {
  const [company, setCompany] = useState<CompanyInfo>(EMPTY);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "company"), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Partial<CompanyInfo>;
        setCompany({
          nazov: d.nazov || EMPTY.nazov,
          adresa: d.adresa || EMPTY.adresa,
          ico: d.ico || EMPTY.ico,
          dic: d.dic || EMPTY.dic,
          ic_dph: d.ic_dph || EMPTY.ic_dph,
          register: d.register || EMPTY.register,
          datum_ucinnosti: d.datum_ucinnosti || EMPTY.datum_ucinnosti,
          kontakt: d.kontakt || EMPTY.kontakt,
          iban: d.iban,
        });
      }
    });
    return () => unsub();
  }, []);
  return company;
}

const TITLES: Record<LegalPageType, string> = {
  "podmienky": "Všeobecné obchodné podmienky služby Vitrína",
  "ochrana-udajov": "Zásady ochrany osobných údajov",
  "cookies": "Zásady používania cookies",
  "reklamacie": "Reklamačný poriadok",
  "odstupenie": "Odstúpenie od zmluvy",
};

export default function LegalPage({ type, onNavigate }: LegalPageProps) {
  const company = useCompany();
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: "#E2E8F0" }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate("/")}
            className="flex items-center gap-2 text-lg font-black text-slate-800 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🛍️</span>
            Vitrína
          </button>
          <button
            onClick={() => onNavigate("/")}
            className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Späť na hlavnú stránku
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-8">
          {TITLES[type]}
        </h1>

        <div className="bg-white rounded-3xl p-8 md:p-12 border shadow-sm" style={{ borderColor: "#E2E8F0" }}>
          <PageBody type={type} f={company} />
        </div>

        {/* Footer navigation */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center text-xs font-bold text-slate-500">
          <button onClick={() => onNavigate("/podmienky")} className="hover:text-indigo-600">Podmienky</button>
          <span>·</span>
          <button onClick={() => onNavigate("/ochrana-udajov")} className="hover:text-indigo-600">Ochrana údajov</button>
          <span>·</span>
          <button onClick={() => onNavigate("/cookies")} className="hover:text-indigo-600">Cookies</button>
          <span>·</span>
          <button onClick={() => onNavigate("/reklamacie")} className="hover:text-indigo-600">Reklamácie</button>
          <span>·</span>
          <button onClick={() => onNavigate("/odstupenie")} className="hover:text-indigo-600">Odstúpenie</button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Vitrína · Predajná platforma pre malých tvorcov · <a href={`mailto:${company.kontakt}`} className="text-indigo-600 hover:underline">{company.kontakt}</a>
        </p>
      </main>
    </div>
  );
}

function PageBody({ type, f }: { type: LegalPageType; f: CompanyInfo }) {
  switch (type) {
    case "podmienky":
      return <Podmienky f={f} />;
    case "ochrana-udajov":
      return <OchranaUdajov f={f} />;
    case "cookies":
      return <Cookies f={f} />;
    case "reklamacie":
      return <Reklamacie f={f} />;
    case "odstupenie":
      return <Odstupenie f={f} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function Podmienky({ f }: { f: CompanyInfo }) {
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      <Section title="1. Úvodné ustanovenia">
        <p>Poskytovateľom služby Vitrína je <b>{f.nazov}</b>, so sídlom {f.adresa}, IČO: {f.ico}, DIČ: {f.dic}, IČ DPH: {f.ic_dph}, zapísaná v {f.register}.</p>
        <p>Kontakt: <a href={`mailto:${f.kontakt}`}>{f.kontakt}</a></p>
      </Section>

      <Section title="2. Predmet služby">
        <p>Vitrína je online SaaS platforma pre malých predajcov a živnostníkov na predaj produktov a služieb formou "link-in-bio" obchodu. Zákazník si vyberie produkty alebo služby, zaplatí bankovým prevodom (QR kód) a objednávka je odovzdaná predajcovi cez WhatsApp správu.</p>
        <p>Poskytovaná služba je pre predajcov ako predplatné (subscription). Nezahŕňa spracovanie platieb medzi predajcom a jeho koncovými zákazníkmi.</p>
      </Section>

      <Section title="3. Registrácia a účet">
        <ul>
          <li>Používateľ (predajca) musí mať minimálne 18 rokov alebo byť registrovaným podnikateľom.</li>
          <li>Používateľ zodpovedá za pravdivosť údajov, ktoré uvádza v profile a pri produktoch.</li>
          <li>Poskytovateľ môže účet zablokovať pri podstatnom porušení podmienok, pri publikovaní nelegálneho obsahu alebo pri zneužívaní služby.</li>
        </ul>
      </Section>

      <Section title="4. Predplatné a platby">
        <ul>
          <li>Skúšobná doba: 10 dní zadarmo od registrácie obchodu, s limitom 6 aktívnych produktov.</li>
          <li>Plán <b>Standard</b>: 8 €/mes, limit 2 aktívne produkty.</li>
          <li>Plán <b>Rozšírený</b>: 12 €/mes, limit 6 aktívnych produktov.</li>
          <li>Ceny sú uvedené bez DPH*. * Ak je poskytovateľ platcom DPH, k cene sa pripočíta príslušná sadzba DPH.</li>
          <li>Po vypršaní skúšobnej doby bez zvoleného plánu sa obchod automaticky skryje pre zákazníkov (dáta zostávajú zachované).</li>
          <li>Predplatné je možné zrušiť kedykoľvek v Nastaveniach obchodu; po zrušení plán platí do konca zaplateného obdobia.</li>
        </ul>
      </Section>

      <Section title="5. Práva a povinnosti používateľa (predajcu)">
        <ul>
          <li>Používať službu iba na legitímne účely v súlade so zákonmi Slovenskej republiky.</li>
          <li>Nepredávať prístup k svojmu účtu tretím stranám.</li>
          <li>Zodpovednosť za obsah zadávaný do aplikácie (opisy produktov, fotografie, ceny, informácie pre zákazníka).</li>
          <li>Zodpovednosť za dodržiavanie zákonných povinností voči vlastným zákazníkom (napr. vydávanie dokladov, spracovanie osobných údajov zákazníkov, reklamácie svojich produktov).</li>
        </ul>
      </Section>

      <Section title="6. Práva a povinnosti poskytovateľa">
        <ul>
          <li>Poskytovať službu s maximálnou snahou o kontinuálnu dostupnosť (s výnimkou plánovanej údržby a udalostí mimo kontroly poskytovateľa).</li>
          <li>Ochrana osobných údajov podľa GDPR a platnej legislatívy (viď <a href="/ochrana-udajov">Zásady ochrany osobných údajov</a>).</li>
          <li>Podpora prostredníctvom <a href={`mailto:${f.kontakt}`}>{f.kontakt}</a>.</li>
        </ul>
      </Section>

      <Section title="7. Obmedzenie zodpovednosti">
        <ul>
          <li>Vitrína je nástroj — poskytovateľ nezodpovedá za obsah publikovaný predajcami, za správnosť opisov produktov, ani za vyriešenie prípadných sporov medzi predajcom a jeho zákazníkom.</li>
          <li>Poskytovateľ nezodpovedá za dočasnú nedostupnosť služby spôsobenú tretími stranami (Firebase, Netlify, poskytovatelia internetových služieb) alebo udalosťami vyššej moci.</li>
          <li>Poskytovateľ neručí za škody vzniknuté rozhodnutiami predajcu na základe údajov v aplikácii.</li>
        </ul>
      </Section>

      <Section title="8. Ukončenie zmluvy">
        <ul>
          <li>Používateľom kedykoľvek (zrušenie predplatného, prípadne vymazanie obchodu cez funkciu „Začať odznova").</li>
          <li>Poskytovateľom pri podstatnom porušení podmienok, po predchádzajúcom upozornení.</li>
          <li>Odstúpenie od zmluvy podľa zákona — viď <a href="/odstupenie">Odstúpenie od zmluvy</a>.</li>
        </ul>
      </Section>

      <Section title="9. Riešenie sporov">
        <ul>
          <li>Rozhodné právo: slovenské.</li>
          <li>Miestne súdy: podľa sídla poskytovateľa.</li>
          <li>Alternatívne riešenie sporov (pre spotrebiteľov): <a href="https://www.soi.sk" target="_blank" rel="noreferrer">Slovenská obchodná inšpekcia (SOI)</a>.</li>
        </ul>
      </Section>

      <Section title="10. Záverečné ustanovenia">
        <ul>
          <li>Podmienky platia od {f.datum_ucinnosti}.</li>
          <li>Zmeny podmienok oznámime používateľom emailom minimálne 30 dní pred nadobudnutím účinnosti.</li>
          <li>Ak niektoré ustanovenie stratí platnosť, ostatné zostávajú platné.</li>
        </ul>
      </Section>
    </div>
  );
}

function OchranaUdajov({ f }: { f: CompanyInfo }) {
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      <Section title="1. Prevádzkovateľ">
        <p>{f.nazov}, {f.adresa}, IČO: {f.ico}. Kontakt: <a href={`mailto:${f.kontakt}`}>{f.kontakt}</a></p>
      </Section>

      <Section title="2. Aké údaje spracúvame">
        <ul>
          <li><b>Registračné údaje predajcu:</b> email, meno/názov obchodu, mesto, telefónne číslo, IBAN pre prijímanie platieb.</li>
          <li><b>Obsah obchodu:</b> produkty, ceny, fotografie, opisy.</li>
          <li><b>Objednávkové údaje (zákazníci predajcu):</b> meno, mesto/adresa, položky objednávky. Tieto údaje sa ukladajú v databáze poskytovateľa, prístup má predajca a poskytovateľ.</li>
          <li><b>Technické údaje:</b> IP adresa, prehliadač, session cookies, technické logy.</li>
        </ul>
      </Section>

      <Section title="3. Účel spracovania">
        <ul>
          <li>Poskytovanie a prevádzka služby.</li>
          <li>Fakturácia a účtovníctvo (u predajcov s plateným plánom).</li>
          <li>Zabezpečenie a technická podpora.</li>
          <li>Zákonné povinnosti (napr. účtovníctvo, GDPR).</li>
        </ul>
      </Section>

      <Section title="4. Právny základ (GDPR čl. 6)">
        <ul>
          <li><b>Plnenie zmluvy:</b> poskytovanie služby predajcovi.</li>
          <li><b>Zákonná povinnosť:</b> fakturácia, účtovná evidencia.</li>
          <li><b>Oprávnený záujem:</b> bezpečnosť, prevencia zneužívania.</li>
          <li><b>Súhlas:</b> ak vôbec (napr. marketingové emaily) — vyhradený a odvolateľný.</li>
        </ul>
      </Section>

      <Section title="5. Doba uchovávania">
        <ul>
          <li>Účtovné doklady: 10 rokov (zákonná povinnosť).</li>
          <li>Používateľské údaje predajcu: počas trvania predplatného + 6 mesiacov.</li>
          <li>Objednávkové údaje: podľa nastavení predajcu, minimálne 30 dní pre vybavovanie reklamácií.</li>
          <li>Technické logy: 90 dní.</li>
          <li>Cookies: podľa typu (viď <a href="/cookies">Cookies</a>).</li>
        </ul>
      </Section>

      <Section title="6. Tretie strany (sprostredkovatelia)">
        <ul>
          <li><b>Google Firebase</b> (Alphabet Inc., USA + EU regióny) — autentifikácia a Firestore databáza. DPA štandardné podmienky.</li>
          <li><b>Netlify</b> (Netlify Inc., USA) — hosting aplikácie.</li>
          <li><b>Resend</b> (EU, Írsko) — odosielanie transakčných emailov (napr. koniec trialu).</li>
          <li><b>WhatsApp / Meta</b> — objednávky sú predávané cez WhatsApp správu; spracovanie správ podlieha podmienkam WhatsApp.</li>
        </ul>
      </Section>

      <Section title="7. Vaše práva (GDPR)">
        <ul>
          <li>Právo na prístup, opravu, vymazanie údajov.</li>
          <li>Právo na obmedzenie spracovania.</li>
          <li>Právo na prenositeľnosť údajov.</li>
          <li>Právo namietať.</li>
          <li>Právo podať sťažnosť <a href="https://dataprotection.gov.sk" target="_blank" rel="noreferrer">Úradu na ochranu osobných údajov SR</a>.</li>
        </ul>
      </Section>

      <Section title="8. Ako uplatniť práva">
        <p>Email: <a href={`mailto:${f.kontakt}`}>{f.kontakt}</a>. Reakcia do 30 dní.</p>
      </Section>

      <Section title="9. Cookies">
        <p>Viď samostatný dokument <a href="/cookies">Zásady používania cookies</a>.</p>
      </Section>

      <Section title="10. Účinnosť">
        <p>Zásady platia od {f.datum_ucinnosti}. Zmeny oznamujeme cez aplikáciu alebo emailom.</p>
      </Section>
    </div>
  );
}

function Cookies({ f }: { f: CompanyInfo }) {
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      <Section title="1. Prevádzkovateľ">
        <p>{f.nazov}, kontakt <a href={`mailto:${f.kontakt}`}>{f.kontakt}</a></p>
      </Section>

      <Section title="2. Čo sú cookies">
        <p>Cookies sú malé textové súbory ukladané v prehliadači, ktoré umožňujú webovej aplikácii zapamätať si informácie o návšteve (napr. prihlásenie).</p>
      </Section>

      <Section title="3. Aké cookies Vitrína používa">
        <ul>
          <li><b>Nutné (technické) cookies:</b> zabezpečujú prihlásenie a fungovanie aplikácie (Firebase Authentication session). Bez nich by aplikácia nefungovala.</li>
          <li><b>Analytické cookies:</b> Vitrína momentálne <b>nepoužíva</b> žiadny analytický nástroj (Google Analytics a pod.).</li>
          <li><b>Marketingové cookies:</b> Vitrína <b>nepoužíva</b> marketingové cookies.</li>
        </ul>
      </Section>

      <Section title="4. Ako spravovať cookies">
        <p>Nutné cookies sa nedajú vypnúť v aplikácii, ale môžeš ich blokovať alebo mazať v nastaveniach prehliadača. Blokovanie môže spôsobiť, že sa nebudeš vedieť prihlásiť.</p>
      </Section>

      <Section title="5. Odkaz na ochranu údajov">
        <p>Pre viac informácií o spracovaní údajov viď <a href="/ochrana-udajov">Zásady ochrany osobných údajov</a>.</p>
      </Section>
    </div>
  );
}

function Reklamacie({ f }: { f: CompanyInfo }) {
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      <Section title="Predmet reklamačného poriadku">
        <p>Tento reklamačný poriadok upravuje reklamáciu služby Vitrína (predplatného, funkčnosti aplikácie) medzi poskytovateľom a predajcom. <b>Nesúvisí s reklamáciou produktov, ktoré predajca predáva svojim zákazníkom</b> — tie sú v zodpovednosti predajcu.</p>
      </Section>

      <Section title="1. Právo na reklamáciu">
        <p>Predajca má právo reklamovať vady poskytovanej služby Vitrína (napr. nedostupnosť aplikácie, chyby v základnej funkčnosti, nesprávne zúčtované predplatné).</p>
      </Section>

      <Section title="2. Ako podať reklamáciu">
        <ul>
          <li>Email: <a href={`mailto:${f.kontakt}`}>{f.kontakt}</a></li>
          <li>Predmet: „Reklamácia — [krátky popis]"</li>
          <li>Uveďte: meno / názov obchodu, email z účtu Vitrína, popis vady (screenshoty vítané), kedy sa vada objavila.</li>
        </ul>
      </Section>

      <Section title="3. Lehoty">
        <ul>
          <li>Reklamáciu prijmeme okamžite po doručení emailu (automatická odpoveď).</li>
          <li>Rozhodnutie do 30 dní od doručenia.</li>
          <li>V zložitých prípadoch do 60 dní (predajcu vopred informujeme).</li>
        </ul>
      </Section>

      <Section title="4. Vybavenie reklamácie">
        <ul>
          <li><b>Uznaná reklamácia:</b> pomerná časť predplatného alebo kredit na ďalšie obdobie.</li>
          <li><b>Neuznaná reklamácia:</b> písomné (emailové) zdôvodnenie.</li>
        </ul>
      </Section>

      <Section title="5. Dozorný orgán">
        <p>Slovenská obchodná inšpekcia (SOI) — <a href="https://www.soi.sk" target="_blank" rel="noreferrer">www.soi.sk</a></p>
      </Section>
    </div>
  );
}

function Odstupenie({ f }: { f: CompanyInfo }) {
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      <Section title="Odstúpenie od zmluvy">
        <p>Podľa zákona č. 102/2014 Z. z. spotrebiteľ (fyzická osoba nakupujúca mimo predmet svojho podnikania) môže odstúpiť od zmluvy uzavretej dištančnou formou <b>do 14 dní bez uvedenia dôvodu</b>.</p>
      </Section>

      <Section title="Dôležité: B2B vs. B2C">
        <p><b>Ak si podnikateľ</b> (SZČO, s.r.o.) a Vitrínu používaš na svoju podnikateľskú činnosť, toto právo sa <b>na teba nevzťahuje</b>. Použi Reklamačný poriadok.</p>
        <p><b>Ak si spotrebiteľ</b> (fyzická osoba mimo podnikania), postup nižšie.</p>
      </Section>

      <Section title="Ako uplatniť odstúpenie">
        <ol>
          <li>Napíš na <a href={`mailto:${f.kontakt}`}>{f.kontakt}</a> do 14 dní od registrácie.</li>
          <li>Uveď meno, email z účtu, dátum registrácie.</li>
          <li>Vrátenie zaplatenej sumy do 14 dní od doručenia odstúpenia.</li>
        </ol>
      </Section>

      <Section title="Výnimka (§ 7 ods. 6 písm. l zák. 102/2014)">
        <p>Aktívnym prihlásením a začatím používania služby Vitrína (napr. vytvorením obchodu, pridaním produktov) predajca výslovne súhlasí s tým, že službu už nemôže vrátiť ako neposkytovanú. Túto voľbu potvrdzuje pri registrácii zaškrtnutím súhlasového checkboxu.</p>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-black text-slate-800 mb-3">{title}</h2>
      <div className="text-sm leading-relaxed [&_a]:text-indigo-600 [&_a]:underline hover:[&_a]:text-indigo-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_p]:mb-3">
        {children}
      </div>
    </section>
  );
}
