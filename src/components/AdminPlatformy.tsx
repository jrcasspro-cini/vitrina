import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import defaultLogo from "../assets/images/default_store_logo.jpg";
import CompanySettings from "./CompanySettings";

interface AdminPlatformyProps {
  onNavigate: (path: string) => void;
}

interface StoreData {
  id: string;
  name: string;
  handle: string;
  category: string;
  city: string;
  phone: string;
  iban: string;
  plan: string;
  createdAt: any;
  trialEndsAt: string;
  logo: string;
  ownerId?: string;
}

// Zoznam admin emailov. Musí sedieť s Firestore rules isAdmin() funkciou.
// Admin sa dostane cez normálny Firebase Auth login (email + heslo),
// nie cez hardcoded heslo v kóde.
const ADMIN_EMAILS = ["jrcasspro@gmail.com"];

const eur = (n: number) => n.toLocaleString("sk-SK", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function AdminPlatformy({ onNavigate }: AdminPlatformyProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const isAuthenticated = adminUser !== null;

  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | "trial" | "standard" | "extended" | "expired">("all");

  const [storeToDelete, setStoreToDelete] = useState<StoreData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dbError, setDbError] = useState("");

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    const handle = storeToDelete.handle;
    try {
      setDeleting(true);
      setDbError("");

      // 1. Delete all items belonging to this store
      const itemsSnapshot = await getDocs(query(collection(db, "items"), where("storeId", "==", handle)));
      for (const d of itemsSnapshot.docs) {
        await deleteDoc(doc(db, "items", d.id));
      }

      // 2. Delete all orders belonging to this store
      const ordersSnapshot = await getDocs(query(collection(db, "orders"), where("storeId", "==", handle)));
      for (const d of ordersSnapshot.docs) {
        await deleteDoc(doc(db, "orders", d.id));
      }

      // 3. Delete the store itself
      await deleteDoc(doc(db, "stores", handle));

      setStoreToDelete(null);
    } catch (err: any) {
      console.error("Error deleting store from platform admin:", err);
      setDbError("Nepodarilo sa zmazať obchod: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Load all stores from Firestore
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = onSnapshot(
      collection(db, "stores"),
      (snapshot) => {
        const loaded: StoreData[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name || "Bez názvu",
            handle: d.handle || docSnap.id,
            category: d.category || d.industry || "Lokálny predajca",
            city: d.city || "",
            phone: d.phone || "",
            iban: d.iban || "",
            plan: d.plan || "",
            createdAt: d.createdAt,
            trialEndsAt: d.trialEndsAt || "",
            logo: d.logo || "",
            ownerId: d.ownerId || ""
          };
        });
        setStores(loaded);
        setLoading(false);
      },
      (err) => {
        console.error("Platform admin stores fetch error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isAuthenticated]);

  // Sledovanie Firebase Auth state — admin je iba ak jeho email je v ADMIN_EMAILS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        setAdminUser(user);
      } else {
        setAdminUser(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSigningIn(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.email || !ADMIN_EMAILS.includes(cred.user.email.toLowerCase())) {
        // Prihlásený, ale nie je to admin — odhlás a ukáž chybu.
        await firebaseSignOut(auth);
        setError("Tento účet nemá admin oprávnenia.");
      }
      // Ak je to admin, onAuthStateChanged nastaví adminUser automaticky.
    } catch (err: any) {
      console.error("Admin login error:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Nesprávny email alebo heslo.");
      } else if (err.code === "auth/invalid-email") {
        setError("Neplatný email.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Príliš veľa neúspešných pokusov. Skús neskôr.");
      } else {
        setError("Chyba prihlásenia. Skús to znova.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      if (!cred.user.email || !ADMIN_EMAILS.includes(cred.user.email.toLowerCase())) {
        await firebaseSignOut(auth);
        setError("Tento Google účet nemá admin oprávnenia.");
      }
      // Ak je admin, onAuthStateChanged nastaví adminUser automaticky.
    } catch (err: any) {
      console.error("Google admin login error:", err);
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        // Užívateľ zatvoril popup, tichšie
        setError("");
      } else if (err.code === "auth/popup-blocked") {
        setError("Prehliadač zablokoval popup. Povoľ ho a skús znova.");
      } else {
        setError("Chyba prihlásenia cez Google.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = () => {
    setEmail("");
    setPassword("");
    firebaseSignOut(auth).catch(console.error);
  };

  // Helper to calculate trial days remaining
  const getTrialDaysLeft = (trialEndsAtStr?: string) => {
    if (!trialEndsAtStr) return 0;
    const endsAtMs = new Date(trialEndsAtStr).getTime();
    const diff = endsAtMs - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  // Classify each store
  const analyzedStores = useMemo(() => {
    return stores.map((s) => {
      const daysLeft = getTrialDaysLeft(s.trialEndsAt);
      const isTrial = s.plan !== "standard" && s.plan !== "extended";
      
      let status: "standard" | "extended" | "trial" | "expired" = "expired";
      if (s.plan === "standard") status = "standard";
      else if (s.plan === "extended") status = "extended";
      else if (isTrial && daysLeft > 0) status = "trial";

      return {
        ...s,
        daysLeft,
        status
      };
    });
  }, [stores]);

  // Calculations
  const stats = useMemo(() => {
    const total = analyzedStores.length;
    const standardCount = analyzedStores.filter(s => s.status === "standard").length;
    const extendedCount = analyzedStores.filter(s => s.status === "extended").length;
    const trialCount = analyzedStores.filter(s => s.status === "trial").length;
    const expiredCount = analyzedStores.filter(s => s.status === "expired").length;

    // Monthly revenue estimates: Standard (8 EUR), Extended (12 EUR)
    const estimatedMRR = (standardCount * 8) + (extendedCount * 12);

    return {
      total,
      standardCount,
      extendedCount,
      trialCount,
      expiredCount,
      estimatedMRR
    };
  }, [analyzedStores]);

  // Filtered store list
  const filteredStores = useMemo(() => {
    return analyzedStores.filter((s) => {
      // 1. Plan status filter
      if (filterPlan !== "all" && s.status !== filterPlan) return false;

      // 2. Search search term
      if (searchTerm.trim() === "") return true;
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        s.handle.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term) ||
        s.city.toLowerCase().includes(term) ||
        s.phone.toLowerCase().includes(term)
      );
    });
  }, [analyzedStores, searchTerm, filterPlan]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    try {
      // Handle Firestore Timestamp or ISO string or JS Date
      let date: Date;
      if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleDateString("sk-SK", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  // Kým Firebase Auth zistí či je user prihlásený, ukazujeme jednoduché wait state
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 font-sans">
        <div className="text-sm text-slate-400 font-bold">Načítavam…</div>
      </div>
    );
  }

  // LOGIN VIEW — Firebase Auth email + heslo. Prístup má iba účet z ADMIN_EMAILS.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border shadow-lg" style={{ borderColor: "#E2E8F0" }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mx-auto mb-4 border border-indigo-100">
              🔒
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Admin platformy</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Tento panel slúži výhradne pre správcu platformy Vitrína.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={signingIn}
            className="w-full py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            {signingIn ? "Prihlasujem…" : "Prihlásiť cez Google"}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">alebo emailom</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Admin email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@…"
                className="w-full px-4 py-3 rounded-xl border text-sm font-medium focus:border-indigo-600 bg-slate-50 focus:bg-white transition-all outline-none"
                style={{ borderColor: "#CBD5E1" }}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border text-sm font-medium focus:border-indigo-600 bg-slate-50 focus:bg-white transition-all outline-none"
                style={{ borderColor: "#CBD5E1" }}
                required
                autoComplete="current-password"
              />
              {error && (
                <span className="text-[11px] font-bold text-red-500 block mt-1.5">
                  ⚠️ {error}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-transform active:scale-[0.99] hover:opacity-95 disabled:opacity-60"
              style={{ background: "#4F46E5" }}
            >
              {signingIn ? "Prihlasujem…" : "Vstúpiť do adminu"}
            </button>

            <button
              type="button"
              onClick={() => onNavigate("/")}
              className="w-full py-2.5 rounded-xl border text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
              style={{ borderColor: "#E2E8F0" }}
            >
              ← Späť na hlavný web
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PLATFORM ADMIN DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Platform Header */}
      <header className="sticky top-0 z-20 bg-white border-b px-6 py-4 flex items-center justify-between shadow-xs" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚡</div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">Vitrína Admin</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Platform Control Panel</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("/")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            ← Portál obchodov
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-red-50 text-red-600 transition-colors"
            style={{ borderColor: "#FCA5A5" }}
          >
            Odhlásiť sa 🔓
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* ÚDAJE FIRMY — pre právne stránky (ToS, Privacy, Cookies...) */}
        <CompanySettings />

        {/* STATS BENTO GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* STAT 1: Total stores */}
          <div className="bg-white p-5 rounded-3xl border shadow-xs" style={{ borderColor: "#E2E8F0" }}>
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Celkový počet obchodov</span>
            <span className="text-3xl font-black block mt-2 text-slate-800">{loading ? "..." : stats.total}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Zaregistrovaných celkom</span>
          </div>

          {/* STAT 2: Standard Plan */}
          <div className="bg-white p-5 rounded-3xl border shadow-xs border-l-4" style={{ borderColor: "#E2E8F0", borderLeftColor: "#4F46E5" }}>
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Plán Štandard (8 €/mes)</span>
            <span className="text-3xl font-black block mt-2 text-indigo-600">{loading ? "..." : stats.standardCount}</span>
            <span className="text-[10px] text-slate-500 block mt-1">S limitom 2 produktov</span>
          </div>

          {/* STAT 3: Expanded Plan */}
          <div className="bg-white p-5 rounded-3xl border shadow-xs border-l-4" style={{ borderColor: "#E2E8F0", borderLeftColor: "#10B981" }}>
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Plán Rozšírený (12 €/mes)</span>
            <span className="text-3xl font-black block mt-2 text-emerald-600">{loading ? "..." : stats.extendedCount}</span>
            <span className="text-[10px] text-slate-500 block mt-1">S limitom 6 produktov</span>
          </div>

          {/* STAT 4: Trial count */}
          <div className="bg-white p-5 rounded-3xl border shadow-xs" style={{ borderColor: "#E2E8F0" }}>
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">V skúšobnej dobe (Trial)</span>
            <span className="text-3xl font-black block mt-2 text-amber-500">{loading ? "..." : stats.trialCount}</span>
            <span className="text-[10px] text-slate-500 block mt-1">{stats.expiredCount} exspirovaných bez plánu</span>
          </div>

          {/* STAT 5: Estimated MRR */}
          <div className="bg-indigo-600 text-white p-5 rounded-3xl border shadow-md border-indigo-700">
            <span className="text-indigo-200 font-bold text-[10px] uppercase tracking-wider block">Mesačný príjem (MRR)</span>
            <span className="text-3xl font-black block mt-2 text-white">{loading ? "..." : eur(stats.estimatedMRR)}</span>
            <span className="text-[10px] text-indigo-200 block mt-1">Odhad z aktívnych predplatných</span>
          </div>
        </section>

        {/* CONTROLS (Search & Filter) */}
        <section className="bg-white p-4 rounded-3xl border shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between" style={{ borderColor: "#E2E8F0" }}>
          {/* Search bar */}
          <div className="relative w-full md:w-96 flex items-center">
            <span className="absolute left-4 text-slate-400 text-sm select-none">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Vyhladať obchod (meno, mesto, handle, kategória)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-semibold focus:border-indigo-600 bg-slate-50/50 focus:bg-white transition-all outline-none"
              style={{ borderColor: "#E2E8F0" }}
            />
          </div>

          {/* Plan segment selector */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
            {(
              [
                ["all", "Všetky"],
                ["trial", "Trial (Aktívny)"],
                ["standard", "Štandard"],
                ["extended", "Rozšírený"],
                ["expired", "Exspirované"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilterPlan(k)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex-1 md:flex-none text-center"
                style={filterPlan === k ? { background: "#4F46E5", color: "#fff" } : { color: "#64748B" }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* STORES TABLE */}
        <section className="bg-white rounded-3xl border shadow-xs overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
          {loading ? (
            <div className="py-20 text-center text-sm font-bold text-slate-400">
              Načítavam zoznam obchodov z databázy... ⏳
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm font-bold text-slate-500">Nenašli sa žiadne obchody pre zadané kritériá.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase text-slate-500 tracking-wider">
                    <th className="py-4 px-6">Obchod</th>
                    <th className="py-4 px-4">Kategória / Mesto</th>
                    <th className="py-4 px-4">WhatsApp číslo</th>
                    <th className="py-4 px-4">Stav plánu</th>
                    <th className="py-4 px-4">Založený</th>
                    <th className="py-4 px-4 text-right">Zostáva dní</th>
                    <th className="py-4 px-6 text-right">Akcie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredStores.map((store) => (
                    <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Handle */}
                      <td className="py-4 px-6 min-w-[240px]">
                        <div className="flex items-center gap-3">
                          <img
                            src={store.logo || defaultLogo}
                            alt={store.name}
                            className="w-8 h-8 rounded-lg object-cover bg-slate-50 border"
                            style={{ borderColor: "#E2E8F0" }}
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate text-sm leading-snug">{store.name}</span>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <a
                                href={`/${store.handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                /{store.handle} ↗
                              </a>
                              
                              {store.ownerId ? (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <span className="truncate max-w-[120px]" title={store.ownerId}>👤 {store.ownerId}</span>
                                  <button
                                    onClick={async () => {
                                      const val = prompt("Zadajte nové UID vlastníka (nechajte prázdne pre odstránenie):", store.ownerId);
                                      if (val === null) return;
                                      try {
                                        await updateDoc(doc(db, "stores", store.handle), { ownerId: val.trim() });
                                        alert("Vlastník bol úspešne priradený!");
                                      } catch (err: any) {
                                        alert("Chyba: " + err.message);
                                      }
                                    }}
                                    className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer inline-block shrink-0 ml-0.5"
                                  >
                                    Upraviť
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-1 flex flex-col gap-1">
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded px-1 py-0.5 inline-block w-fit">
                                    ⚠️ Bez vlastníka
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder="UID vlastníka"
                                      className="px-1.5 py-0.5 rounded text-[9px] border border-slate-200 bg-white font-mono w-[100px]"
                                      id={`owner-input-${store.handle}`}
                                    />
                                    <button
                                      onClick={async () => {
                                        const inputEl = document.getElementById(`owner-input-${store.handle}`) as HTMLInputElement;
                                        const val = inputEl?.value?.trim();
                                        if (!val) return;
                                        try {
                                          await updateDoc(doc(db, "stores", store.handle), { ownerId: val });
                                          alert("Vlastník bol úspešne priradený!");
                                        } catch (err: any) {
                                          alert("Chyba: " + err.message);
                                        }
                                      }}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                    >
                                      Uložiť
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & City */}
                      <td className="py-4 px-4">
                        <span className="text-slate-800 block text-xs">{store.category}</span>
                        <span className="text-slate-400 block text-[10px] mt-0.5">📍 {store.city || "Neuvedené"}</span>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 font-mono text-xs">
                        {store.phone ? (
                          <a href={`https://wa.me/${store.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                            {store.phone}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Plan status badge */}
                      <td className="py-4 px-4">
                        {store.status === "standard" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 inline-block">
                            Štandard (8 €)
                          </span>
                        )}
                        {store.status === "extended" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 inline-block">
                            Rozšírený (12 €)
                          </span>
                        )}
                        {store.status === "trial" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 inline-block">
                            Trial (10 dní)
                          </span>
                        )}
                        {store.status === "expired" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 inline-block">
                            Exspirovaný
                          </span>
                        )}
                      </td>

                      {/* Date of creation */}
                      <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                        {formatDate(store.createdAt)}
                      </td>

                      {/* Days remaining */}
                      <td className="py-4 px-4 text-right font-bold text-xs">
                        {store.status === "trial" ? (
                          <span className="text-amber-600">{store.daysLeft} dní</span>
                        ) : store.status === "expired" ? (
                          <span className="text-red-500">Vypršal</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setStoreToDelete(store)}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-600 transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Vymazať obchod z platformy"
                        >
                          🗑️ Vymazať
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* DB Error toast */}
      {dbError && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 shadow-xl flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <h4 className="font-bold text-xs">Chyba pri operácii</h4>
            <p className="text-[11px] font-medium mt-0.5">{dbError}</p>
          </div>
          <button onClick={() => setDbError("")} className="text-red-400 hover:text-red-600 font-bold text-xs px-1">✕</button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border shadow-2xl" style={{ borderColor: "#E2E8F0" }}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl mb-4 border border-red-100">
              🗑️
            </div>
            
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Nenávratne vymazať obchod?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Chystáte sa vymazať obchod <strong className="text-slate-800">{storeToDelete.name}</strong> (handle: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">/{storeToDelete.handle}</code>).
            </p>
            <p className="text-xs text-red-600 mt-2 font-semibold">
              ⚠️ Táto akcia vymaže samotný obchod, všetky jeho vystavené produkty a taktiež všetky s ním súvisiace objednávky z databázy. Akciu nie je možné vrátiť späť!
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStoreToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                style={{ borderColor: "#E2E8F0" }}
              >
                Zrušiť
              </button>
              <button
                onClick={handleDeleteStore}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                    Mazanie...
                  </>
                ) : (
                  "Nenávratne vymazať"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
