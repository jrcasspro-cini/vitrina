// Právne texty PRE PREDAJCOV (nie pre Vitrínu).
// Zobrazujú sa na URL /{handle}/podmienky, /{handle}/ochrana-udajov, atď.
// Auto-vyplnia sa údajmi predajcu z jeho Nastavenia (fakturaNazov, fakturaAdresa,
// fakturaIco, fakturaDic, contactEmail).
//
// Vitrína nie je právne zodpovedná za obsah — texty sú generické šablóny.
// Predajca ich môže neskôr upraviť (feature na neskôr).

export type SellerLegalType = "podmienky" | "ochrana-udajov" | "odstupenie" | "reklamacie";

interface SellerData {
  name: string;             // Názov obchodu (napr. "Zubná pasta Lux")
  fakturaNazov?: string;    // Meno / obchodné meno (SZČO alebo s.r.o.)
  fakturaAdresa?: string;   // Adresa sídla
  fakturaIco?: string;      // IČO
  fakturaDic?: string;      // DIČ
  contactEmail?: string;    // Kontaktný email
  phone?: string;           // Kontaktné telefónne číslo
  handle: string;           // URL slug obchodu
}

interface Props {
  type: SellerLegalType;
  seller: SellerData;
  onNavigate: (path: string) => void;
}

const TITLES: Record<SellerLegalType, string> = {
  "podmienky": "Všeobecné obchodné podmienky",
  "ochrana-udajov": "Zásady ochrany osobných údajov",
  "odstupenie": "Odstúpenie od zmluvy",
  "reklamacie": "Reklamačný poriadok",
};

// Naformátuje predajcove údaje do bloku, ktorý sa zobrazí v hlavičke
// každého právneho dokumentu.
function SellerHeader({ seller }: { seller: SellerData }) {
  return (
    <div className="p-5 rounded-2xl mb-8 bg-slate-50 border border-slate-200 text-sm">
      <div className="font-bold text-slate-800 mb-2">Predávajúci (prevádzkovateľ):</div>
      <div className="text-slate-700 leading-relaxed">
        <div><b>{seller.fakturaNazov || seller.name || "(meno predajcu nie je vyplnené)"}</b></div>
        <div>{seller.fakturaAdresa || "(adresa nie je vyplnená)"}</div>
        <div>IČO: {seller.fakturaIco || "(nedoplnené)"}</div>
        <div>DIČ: {seller.fakturaDic || "(nedoplnené)"}</div>
        {seller.contactEmail && <div>E-mail: {seller.contactEmail}</div>}
        {seller.phone && <div>Telefón: {seller.phone}</div>}
        <div className="mt-2 text-xs text-slate-500">
          Obchod: <a href={`/${seller.handle}`} className="text-slate-700 font-semibold hover:underline">vitrina.zavio.sk/{seller.handle}</a>
        </div>
      </div>
    </div>
  );
}

// ── Podmienky predaja ────────────────────────────────────────────────
function PodmienkyContent({ seller }: { seller: SellerData }) {
  const shopName = seller.fakturaNazov || seller.name || "predávajúci";
  return (
    <div className="space-y-6 text-slate-700 leading-relaxed">
      <SellerHeader seller={seller} />

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">1. Úvodné ustanovenia</h2>
        <p>Tieto obchodné podmienky upravujú vzťahy medzi predávajúcim <b>{shopName}</b> a kupujúcim (spotrebiteľom) pri predaji tovaru cez internetovú stránku <b>vitrina.zavio.sk/{seller.handle}</b>. Nákupom tovaru súhlasíte s týmito podmienkami.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">2. Objednávka a uzavretie zmluvy</h2>
        <p>Objednávku môžete uskutočniť priamo cez formulár na stránke obchodu. Odoslaním objednávky (kliknutím na tlačidlo objednania a odoslaním údajov predajcovi) sa objednávka stáva pre kupujúceho záväznou. Kúpna zmluva vzniká potvrdením objednávky zo strany predávajúceho (napr. WhatsApp správou, e-mailom).</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">3. Cena a spôsob platby</h2>
        <p>Ceny sú uvedené vrátane všetkých poplatkov okrem dopravy (ak nie je uvedené inak). Platba prebieha bankovým prevodom cez QR kód (PAY by square štandard) priamo na účet predávajúceho pred odoslaním tovaru. Iné spôsoby platby možno dohodnúť individuálne.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">4. Dodanie tovaru</h2>
        <p>Tovar dodávame po pripísaní platby na účet predávajúceho. Spôsob dodania (osobný odber, kuriér, pošta) a náklady na dopravu sú uvedené pri objednávke. Predpokladaná doba dodania je uvedená pri produkte alebo bude dohodnutá individuálne.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">5. Odstúpenie od zmluvy</h2>
        <p>Kupujúci — spotrebiteľ — má právo odstúpiť od zmluvy bez uvedenia dôvodu <b>do 14 kalendárnych dní</b> od prevzatia tovaru, v súlade so zákonom č. 102/2014 Z. z. Postup a formulár na odstúpenie nájdete v dokumente <a href={`/${seller.handle}/odstupenie`} className="text-blue-600 hover:underline">Odstúpenie od zmluvy</a>.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">6. Reklamácie</h2>
        <p>V prípade vady tovaru máte právo na reklamáciu. Postup nájdete v <a href={`/${seller.handle}/reklamacie`} className="text-blue-600 hover:underline">Reklamačnom poriadku</a>.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">7. Ochrana osobných údajov</h2>
        <p>Osobné údaje spracúvame v súlade s GDPR — podrobnosti v <a href={`/${seller.handle}/ochrana-udajov`} className="text-blue-600 hover:underline">Zásadách ochrany osobných údajov</a>.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">8. Alternatívne riešenie sporov</h2>
        <p>Kupujúci má právo obrátiť sa na predávajúceho so žiadosťou o nápravu, ak nie je spokojný so spôsobom vybavenia reklamácie. Ak predávajúci na žiadosť odpovie zamietavo alebo do 30 dní vôbec, spotrebiteľ má právo podať návrh na začatie alternatívneho riešenia sporu — príslušným subjektom je <b>Slovenská obchodná inšpekcia</b> (www.soi.sk) alebo iný oprávnený subjekt.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">9. Záverečné ustanovenia</h2>
        <p>Vzťahy neupravené týmito podmienkami sa riadia príslušnými ustanoveniami Občianskeho zákonníka a Zákona o ochrane spotrebiteľa. Predávajúci si vyhradzuje právo tieto podmienky zmeniť; nové znenie sa nevzťahuje na už uzavreté objednávky.</p>
      </section>

      <p className="text-xs text-slate-500 pt-4 border-t border-slate-200">
        Podmienky sú platné od dňa zverejnenia. Poskytnuté ako informatívna šablóna platformou Vitrína. Za obsah zodpovedá predávajúci.
      </p>
    </div>
  );
}

// ── Ochrana osobných údajov ──────────────────────────────────────────
function OchranaUdajovContent({ seller }: { seller: SellerData }) {
  const shopName = seller.fakturaNazov || seller.name || "predávajúci";
  return (
    <div className="space-y-6 text-slate-700 leading-relaxed">
      <SellerHeader seller={seller} />

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">1. Prevádzkovateľ</h2>
        <p>Prevádzkovateľom pri spracúvaní osobných údajov v zmysle nariadenia GDPR a zákona č. 18/2018 Z. z. je <b>{shopName}</b> (údaje vyššie).</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">2. Aké údaje spracúvame</h2>
        <p>Pri objednávke od Vás žiadame nasledovné údaje:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Meno a priezvisko</li>
          <li>Doručovacia adresa (mesto, ulica, PSČ)</li>
          <li>Telefónne číslo</li>
          <li>E-mail (voliteľne, pre potvrdenie objednávky)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">3. Účel spracúvania</h2>
        <p>Vaše údaje spracúvame výhradne za účelom:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Vybavenia objednávky a doručenia tovaru</li>
          <li>Komunikácie s Vami (potvrdenie, prípadné dohody o dodaní)</li>
          <li>Účtovnej evidencie a plnenia zákonných povinností</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">4. Právny základ</h2>
        <p>Spracúvanie prebieha na základe:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><b>Plnenia zmluvy</b> (kúpna zmluva, čl. 6 ods. 1 písm. b) GDPR)</li>
          <li><b>Zákonnej povinnosti</b> (účtovníctvo, čl. 6 ods. 1 písm. c) GDPR)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">5. Doba uchovávania</h2>
        <p>Údaje potrebné pre plnenie zmluvy a účtovnú evidenciu uchovávame po zákonom stanovenú dobu (obvykle 10 rokov pre daňové účely). Po jej uplynutí sú údaje bezpečne vymazané.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">6. Príjemcovia údajov</h2>
        <p>Vaše údaje môžeme odovzdať:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Prepravnej spoločnosti alebo pošte pre doručenie tovaru</li>
          <li>Účtovníkovi alebo daňovému úradu v rozsahu povinností</li>
          <li>Platforme Vitrína (Zavio) — technický poskytovateľ obchodu (spracovateľ)</li>
        </ul>
        <p className="mt-2">Vaše údaje neposielame do tretích krajín a nepredávame ich tretím stranám na marketingové účely.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">7. Vaše práva</h2>
        <p>Podľa GDPR máte právo:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Na prístup k svojim údajom</li>
          <li>Na opravu nesprávnych údajov</li>
          <li>Na vymazanie („právo byť zabudnutý")</li>
          <li>Na obmedzenie spracúvania</li>
          <li>Na prenosnosť údajov</li>
          <li>Namietať proti spracúvaniu</li>
          <li>Podať sťažnosť na <b>Úrad na ochranu osobných údajov SR</b> (www.dataprotection.gov.sk)</li>
        </ul>
        <p className="mt-2">Svoje práva môžete uplatniť e-mailom na adrese predávajúceho uvedenej vyššie.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">8. Cookies a analytika</h2>
        <p>Obchod používa iba technicky nevyhnutné súbory cookies pre správne fungovanie stránky. Nepoužívame sledovacie cookies tretích strán bez Vášho súhlasu.</p>
      </section>

      <p className="text-xs text-slate-500 pt-4 border-t border-slate-200">
        Šablóna poskytnutá platformou Vitrína. Za obsah zodpovedá prevádzkovateľ.
      </p>
    </div>
  );
}

// ── Odstúpenie od zmluvy ─────────────────────────────────────────────
function OdstupenieContent({ seller }: { seller: SellerData }) {
  const shopName = seller.fakturaNazov || seller.name || "predávajúci";
  return (
    <div className="space-y-6 text-slate-700 leading-relaxed">
      <SellerHeader seller={seller} />

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">1. Právo na odstúpenie</h2>
        <p>V súlade so zákonom č. 102/2014 Z. z. má kupujúci — spotrebiteľ — právo odstúpiť od kúpnej zmluvy uzavretej na diaľku <b>bez uvedenia dôvodu do 14 kalendárnych dní</b> od prevzatia tovaru.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">2. Ako odstúpiť</h2>
        <p>Odstúpenie oznámte predávajúcemu <b>{shopName}</b>:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>E-mailom na adresu uvedenú vyššie</li>
          <li>Alebo poštou na adresu sídla predávajúceho</li>
        </ul>
        <p className="mt-2">Môžete použiť formulár nižšie (nie je povinný).</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">3. Vrátenie tovaru</h2>
        <p>Tovar odošlite predávajúcemu <b>najneskôr do 14 dní</b> od odstúpenia od zmluvy. Náklady na vrátenie tovaru znáša kupujúci (ak sa strany nedohodnú inak). Tovar musí byť <b>nepoužitý</b>, <b>nepoškodený</b> a v pôvodnom obale (ak je to možné).</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">4. Vrátenie platby</h2>
        <p>Predávajúci vráti kupujúcemu <b>všetky platby</b> vrátane nákladov na doručenie (v pôvodnej hodnote) do <b>14 dní</b> od doručenia oznámenia o odstúpení, obvykle na ten istý účet, z ktorého bola platba prijatá. Predávajúci nie je povinný vrátiť peniaze pred doručením vráteného tovaru.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">5. Výnimky z práva na odstúpenie</h2>
        <p>Právo odstúpiť sa <b>nevzťahuje</b> na:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Tovar vyrobený podľa osobitných požiadaviek kupujúceho (napr. torty s menom, personalizované šperky)</li>
          <li>Rýchlo sa kaziaci tovar (potraviny)</li>
          <li>Zapečatený tovar, ktorý nie je vhodné vrátiť z hygienických dôvodov (kozmetika, spodná bielizeň) — po rozpečatení</li>
          <li>Digitálny obsah, ak sa jeho poskytovanie začalo so súhlasom kupujúceho</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">📝 Vzorový formulár na odstúpenie</h2>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <p>Predávajúcemu: <b>{shopName}</b>, {seller.fakturaAdresa || "(adresa)"}, {seller.contactEmail || "(email)"}</p>
          <p className="mt-3">Týmto oznamujem, že odstupujem od zmluvy na tento tovar:</p>
          <p>_______________________________________________</p>
          <p className="mt-2">Dátum objednania: _____________________</p>
          <p>Dátum prevzatia: _______________________</p>
          <p>Meno a priezvisko spotrebiteľa: _______________________</p>
          <p>Adresa spotrebiteľa: _______________________________</p>
          <p className="mt-2">Podpis (iba ak sa formulár podáva v listinnej podobe): _______________________</p>
          <p>Dátum: _____________</p>
        </div>
      </section>

      <p className="text-xs text-slate-500 pt-4 border-t border-slate-200">
        Šablóna poskytnutá platformou Vitrína. Za obsah zodpovedá predávajúci.
      </p>
    </div>
  );
}

// ── Reklamačný poriadok ──────────────────────────────────────────────
function ReklamacieContent({ seller }: { seller: SellerData }) {
  const shopName = seller.fakturaNazov || seller.name || "predávajúci";
  return (
    <div className="space-y-6 text-slate-700 leading-relaxed">
      <SellerHeader seller={seller} />

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">1. Úvodné ustanovenia</h2>
        <p>Tento reklamačný poriadok upravuje spôsob a podmienky reklamácie vád tovaru zakúpeného u predávajúceho <b>{shopName}</b> spotrebiteľom.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">2. Záruka</h2>
        <p>Zákonná záručná doba je <b>24 mesiacov</b> odo dňa prevzatia tovaru (spotrebiteľom). Pri použitom tovare môže byť skrátená na 12 mesiacov (musí byť uvedené pri predaji). Záruka sa nevzťahuje na opotrebenie spôsobené bežným používaním.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">3. Ako uplatniť reklamáciu</h2>
        <p>Reklamáciu oznámte predávajúcemu čo najskôr po zistení vady:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>E-mailom na adresu uvedenú v hlavičke</li>
          <li>Alebo doručte tovar na adresu sídla predávajúceho</li>
        </ul>
        <p className="mt-2">V reklamácii uveďte:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Vaše meno a kontaktné údaje</li>
          <li>Číslo objednávky (variabilný symbol)</li>
          <li>Presný popis vady</li>
          <li>Ako sa vada prejavuje</li>
          <li>Fotografie (ak sa dá)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">4. Riešenie reklamácie</h2>
        <p>Predávajúci reklamáciu vybaví <b>bez zbytočného odkladu, najneskôr do 30 dní</b> od jej doručenia. O výsledku Vás bude informovať e-mailom.</p>
        <p className="mt-2">Reklamácia môže byť vybavená:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Bezplatnou opravou tovaru</li>
          <li>Výmenou za bezvadný tovar</li>
          <li>Vrátením kúpnej ceny</li>
          <li>Poskytnutím zľavy</li>
          <li>Zamietnutím reklamácie (s odôvodnením)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">5. Reklamácia nie je uznaná ak</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Vada bola spôsobená nesprávnym používaním tovaru</li>
          <li>Vada bola spôsobená bežným opotrebením</li>
          <li>Kupujúci upravil tovar bez súhlasu predávajúceho</li>
          <li>Vada bola spôsobená vyššou mocou</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">6. Náklady na reklamáciu</h2>
        <p>Pri oprávnenej reklamácii znáša náklady na doručenie tovaru na reklamáciu predávajúci (do primeranej výšky). Pri neoprávnenej reklamácii znáša náklady kupujúci.</p>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-2">7. Alternatívne riešenie sporov</h2>
        <p>Ak nie ste spokojný so spôsobom vybavenia reklamácie, môžete sa obrátiť na <b>Slovenskú obchodnú inšpekciu</b> (www.soi.sk) alebo iný oprávnený subjekt alternatívneho riešenia sporov.</p>
      </section>

      <p className="text-xs text-slate-500 pt-4 border-t border-slate-200">
        Šablóna poskytnutá platformou Vitrína. Za obsah zodpovedá predávajúci.
      </p>
    </div>
  );
}

export default function SellerLegalPage({ type, seller, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/${seller.handle}`)}
            className="text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            ← Späť do obchodu {seller.name || seller.handle}
          </button>
          <div className="text-xs text-slate-500">vitrina.zavio.sk/{seller.handle}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-slate-900 mb-8">{TITLES[type]}</h1>

        {type === "podmienky" && <PodmienkyContent seller={seller} />}
        {type === "ochrana-udajov" && <OchranaUdajovContent seller={seller} />}
        {type === "odstupenie" && <OdstupenieContent seller={seller} />}
        {type === "reklamacie" && <ReklamacieContent seller={seller} />}

        {/* Ostatné právne odkazy */}
        <nav className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-500">
          {(["podmienky", "ochrana-udajov", "odstupenie", "reklamacie"] as SellerLegalType[])
            .filter(t => t !== type)
            .map(t => (
              <a key={t} href={`/${seller.handle}/${t}`} onClick={(e) => { e.preventDefault(); onNavigate(`/${seller.handle}/${t}`); }} className="hover:text-slate-800 hover:underline">
                {TITLES[t]}
              </a>
            ))}
        </nav>
      </main>
    </div>
  );
}
