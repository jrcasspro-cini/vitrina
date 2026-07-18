import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// Údaje firmy, ktoré sa zobrazujú vo všetkých právnych stránkach
// (/podmienky, /ochrana-udajov, /cookies, /reklamacie, /odstupenie).
// Ukladajú sa do Firestore dokumentu `config/company` a načítavajú
// sa v komponente LegalPage cez onSnapshot (t.j. pri zmene sa
// všade okamžite prekreslia).
export interface CompanyForm {
  nazov: string;
  adresa: string;
  ico: string;
  dic: string;
  ic_dph: string;
  register: string;
  datum_ucinnosti: string;
  kontakt: string;
  iban: string;
}

const EMPTY: CompanyForm = {
  nazov: "",
  adresa: "",
  ico: "",
  dic: "",
  ic_dph: "",
  register: "",
  datum_ucinnosti: "",
  kontakt: "info@zavio.sk",
  iban: "",
};

export default function CompanySettings() {
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "company"), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Partial<CompanyForm>;
        setForm({ ...EMPTY, ...d });
      }
      setLoaded(true);
    }, (err) => {
      console.error("Load company error:", err);
      setError("Nepodarilo sa načítať údaje firmy.");
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await setDoc(doc(db, "config", "company"), form, { merge: true });
      setSavedAt(new Date().toLocaleTimeString("sk-SK"));
    } catch (e: any) {
      console.error(e);
      setError("Nepodarilo sa uložiť: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (!loaded) {
    return (
      <section className="bg-white p-6 rounded-3xl border shadow-xs mb-6" style={{ borderColor: "#E2E8F0" }}>
        <div className="text-sm text-slate-500">Načítavam údaje firmy…</div>
      </section>
    );
  }

  const fields: { key: keyof CompanyForm; label: string; placeholder: string; help?: string; wide?: boolean }[] = [
    { key: "nazov", label: "Názov firmy", placeholder: "napr. Zavio s.r.o. alebo Jozef Rolík – živnosť", wide: true },
    { key: "adresa", label: "Sídlo / adresa", placeholder: "napr. Hlavná 123, 080 01 Prešov", wide: true },
    { key: "ico", label: "IČO", placeholder: "napr. 12345678" },
    { key: "dic", label: "DIČ", placeholder: "napr. 2023456789" },
    { key: "ic_dph", label: "IČ DPH (ak platca)", placeholder: "napr. SK2023456789", help: "Ak nie si platcom DPH, nechaj prázdne." },
    { key: "register", label: "Register", placeholder: "napr. Živnostenský register OÚ Prešov", wide: true },
    { key: "datum_ucinnosti", label: "Dátum účinnosti", placeholder: "napr. 13. júl 2026", help: "Deň keď podmienky nadobúdajú platnosť." },
    { key: "kontakt", label: "Kontaktný email", placeholder: "info@zavio.sk" },
    { key: "iban", label: "IBAN (nepovinné)", placeholder: "napr. SK00 0000 0000 0000 0000 0000", help: "Pre budúce prepojenie s platbami.", wide: true },
  ];

  return (
    <section className="bg-white p-6 rounded-3xl border shadow-xs mb-6" style={{ borderColor: "#E2E8F0" }}>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800">Údaje firmy</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">
            Tieto údaje sa automaticky zobrazia vo všetkých právnych stránkach
            (Podmienky, Ochrana údajov, Cookies, Reklamácie, Odstúpenie). Kým
            nie sú vyplnené, návštevníci vidia „(nedoplnené)".
          </p>
        </div>
        {savedAt && !saving && (
          <span className="text-[11px] font-bold text-emerald-600 shrink-0 whitespace-nowrap">
            ✓ Uložené o {savedAt}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, placeholder, help, wide }) => (
          <div key={key} className={wide ? "md:col-span-2" : ""}>
            <label className="text-xs font-bold text-slate-500 block mb-1">{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:border-indigo-600 bg-slate-50 focus:bg-white transition-all outline-none"
              style={{ borderColor: "#CBD5E1" }}
            />
            {help && <span className="text-[10px] text-slate-500 block mt-1">{help}</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-xs font-bold text-red-500">⚠️ {error}</div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
        >
          {saving ? "Ukladám…" : "Uložiť údaje firmy"}
        </button>
      </div>
    </section>
  );
}
