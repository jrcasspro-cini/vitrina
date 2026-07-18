import { useState, useMemo, useEffect, FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { db, auth } from "./firebase";
import LandingPage from "./components/LandingPage";
import AdminPlatformy from "./components/AdminPlatformy";
import LegalPage, { LegalPageType, useCompany } from "./components/LegalPage";
import defaultLogo from "./assets/images/default_store_logo.jpg";

const LEGAL_PATHS: Record<string, LegalPageType> = {
  "/podmienky": "podmienky",
  "/ochrana-udajov": "ochrana-udajov",
  "/cookies": "cookies",
  "/reklamacie": "reklamacie",
  "/odstupenie": "odstupenie",
};
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  getDoc,
  updateDoc
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from "firebase/auth";

// ─── Clipboard & Host helpers ─────────────────────────────────────────
function copyToClipboardFallback(text: string) {
  if (typeof document === "undefined") return;
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("Fallback copy failed:", err);
  }
  document.body.removeChild(textArea);
}

function copyText(text: string, onSuccess: () => void) {
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(onSuccess)
      .catch(() => {
        copyToClipboardFallback(text);
        onSuccess();
      });
  } else {
    copyToClipboardFallback(text);
    onSuccess();
  }
}

// ─── Vitrína — tvoj link je tvoj obchod ────────────────────────────────
// Prototyp: storefront + rezervácie + checkout s predvyplnenou
// objednávkou do WhatsAppu + jednoduchá administrácia.

// Soft Minimalism paleta — krémová/béžová + sage green akcent (podľa Gemini návrhu Option 1)
const C = {
  bg: "#F5F0E8",        // teplá krémová (pozadie)
  card: "#FFFFFF",      // biela karta
  ink: "#2A2620",       // hlboká hnedá (namiesto čiernej — mäkšie)
  soft: "#6B655C",      // teplá šedá (podtitulky)
  line: "#E8DFD1",      // krémová obruba
  accent: "#7A8471",    // sage green (namiesto fialovej — teplé, prírodné) — pre pozadia/okraje/ikony
  accentSoft: "#E4E8DE", // svetlá sage (backgrounds, hovers)
  accentText: "#647058", // tmavšia sage — pre TEXT na accent farbe (kontrast 4.2–5.3:1, čitateľné na mobile)
  wa: "#25D366",         // WhatsApp green (nemeníme — je to brand)
  waDark: "#128C4B",
};

interface StoreItem {
  id: string;
  storeId: string;
  type: string;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
  badge?: string | null;
  img?: string | null;              // Legacy: prvá fotka (backward compat)
  imgs?: (string | null)[];         // Multi-photo: až 4 fotky produktu
  slot?: string;
  left?: number;
  longDesc?: string;
}

const MAX_PRODUCT_PHOTOS = 4;

const startItems: any[] = [
  { id: "1", type: "product", emoji: "🕯️", name: "Ručne liata sójová sviečka", desc: "Vôňa: pražená káva a vanilka", price: 14.9, unit: "ks", badge: "Bestseller" },
  { id: "2", type: "product", emoji: "🎁", name: "Darčekový set Trio", desc: "3 mini sviečky v krabičke", price: 32.0, unit: "set", badge: null },
  { id: "3", type: "booking", emoji: "🎨", name: "Workshop výroby sviečok", desc: "90 minút · malá skupina", price: 39.0, unit: "miesto", slot: "So 14. 12. · 15:00", left: 2 },
  { id: "4", type: "booking", emoji: "☕", name: "Súkromná prehliadka ateliéru", desc: "45 minút · s kávou", price: 18.0, unit: "osoba", slot: "Ne 15. 12. · 11:00", left: 6 },
];

const CATEGORIES = [
  "Sviečky a darčeky",
  "Kozmetika",
  "Domáce sirupy a medy",
  "Šperky a doplnky",
  "Oblečenie a textil",
  "Keramika a dekorácie",
  "Potraviny a koláče",
  "Remeselné výrobky",
  "Iné"
];

const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

const getPastelBg = (it: StoreItem) => {
  const emoji = it.emoji || "🎁";
  const code = emoji.codePointAt(0) || 0;
  const bgs = [
    "#FFE6EB", // jemná ružová
    "#FFF2E6", // jemná broskyňová
    "#EFEBFF", // jemná fialová
    "#E6F0FA", // jemná belasá
    "#E6FAF0", // jemná mätová
    "#FAF9E6", // jemná žltá
    "#F5F5F5", // neutrálna sivá
  ];
  return bgs[code % bgs.length];
};

// ── Logo: výkladné okno so svetlom ──
function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="8" fill={C.ink} />
      <rect x="9" y="9" width="14" height="17" rx="4" fill={C.bg} />
      <circle cx="16" cy="15" r="3.2" fill={C.accent} />
      <rect x="12" y="21" width="8" height="2.4" rx="1.2" fill={C.ink} opacity="0.55" />
    </svg>
  );
}

// ── StoreLogo: univerzálna predvolená ikonka alebo vlastné logo obchodu ──
function StoreLogo({ logo, name, className = "w-16 h-16 rounded-2xl text-3xl" }: { logo?: string, name?: string, className?: string }) {
  const imgSrc = logo || defaultLogo;
  return (
    <img
      src={imgSrc}
      alt={name || "Logo obchodu"}
      className={`${className} object-cover`}
      style={{ border: `1px solid ${C.line}` }}
      referrerPolicy="no-referrer"
    />
  );
}

export default function Vitrina() {
  const currentHost = typeof window !== "undefined" ? window.location.host : "vitrina.app";
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://vitrina.app";

  // Údaje spoločnosti (majiteľa Vitríny) — z Firestore config/company
  // Používame IBAN pri platbe predplatného od predajcov.
  const company = useCompany();

  const [view, setView] = useState<"shop" | "admin">("shop"); // shop | admin
  const [stores, setStores] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<StoreItem[]>([]);
  
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname;
    }
    return "/";
  });

  const [selectedStoreHandle, setSelectedStoreHandle] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const s = params.get("s");
      if (s && (path === "/" || path === "/app")) {
        window.history.replaceState({}, "", `/${s}`);
        return s;
      }
      if (path === "/" || path === "/app" || path === "/vytvorit" || path === "/admin-platformy") {
        return null;
      }
      // Remove leading slash to get handle
      const handle = path.substring(1);
      return handle || null;
    }
    return null;
  });

  // ── Odstúpenie od zmluvy & Objednávky ──
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({ name: "", orderIdent: "", email: "" });
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState("");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<any | null>(null);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);

  const [store, setStore] = useState({
    name: "",
    handle: "",
    city: "Prešov",
    phone: "+421900123456",
    messengerUsername: "",
    contactEmail: "",
    iban: "",
    category: "Sviečky a darčeky",
    trialEndsAt: "",
    plan: "",
    planEndsAt: "",
    paymentReported: false,
    paymentReportedAt: "",
    paymentReportedNote: "",
    createdAt: null as any,
    logo: "",
    description: "",
    ownerId: ""
  });

  const [storeExists, setStoreExists] = useState<boolean | null>(null);

  // ─── Firebase Auth State & Forms ──────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDigitalService, setAcceptDigitalService] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const userStores = useMemo(() => {
    return stores.filter(st => st.ownerId === currentUser?.uid);
  }, [stores, currentUser]);

  const isOwner = useMemo(() => {
    if (!selectedStoreHandle) {
      return currentPath === "/" || currentPath === "/app" || currentPath === "/vytvorit" || currentPath === "/admin-platformy";
    }
    return currentUser !== null && store.ownerId === currentUser.uid;
  }, [selectedStoreHandle, currentPath, currentUser, store.ownerId]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Prosím vyplňte e-mail a heslo.");
      return;
    }

    if (isRegisterMode) {
      if (!acceptTerms) {
        setAuthError("Prosím súhlaste s Podmienkami a Ochranou údajov.");
        return;
      }
      if (!acceptDigitalService) {
        setAuthError("Prosím potvrďte súhlas so začatím poskytovania služby.");
        return;
      }
    }

    setAuthSubmitting(true);
    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        setAuthSuccess("Účet bol úspešne vytvorený!");
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = "Nastala chyba pri prihlasovaní.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Nesprávny e-mail alebo heslo.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "Tento e-mail už používa iný účet.";
      } else if (err.code === "auth/weak-password") {
        msg = "Heslo musí mať aspoň 6 znakov.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Neplatný formát e-mailovej adresy.";
      }
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setAuthError("Nepodarilo sa prihlásiť cez Google.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!authEmail.trim()) {
      setAuthError("Zadajte prosím váš e-mail pre obnovu hesla.");
      return;
    }
    setAuthSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, authEmail.trim());
      setAuthSuccess("Odkaz na obnovu hesla bol odoslaný na váš e-mail!");
    } catch (err: any) {
      console.error("Reset password error:", err);
      let msg = "Nepodarilo sa odoslať resetovací e-mail.";
      if (err.code === "auth/user-not-found") {
        msg = "Užívateľ s týmto e-mailom neexistuje.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Neplatný formát e-mailovej adresy.";
      }
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const [cart, setCart] = useState<Record<string, number>>({}); // id -> qty
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({
    name: "",
    desc: "",
    longDesc: "",
    price: "",
    slot: ""
  });
  const [checkout, setCheckout] = useState(false);
  const [cust, setCust] = useState({ name: "", city: "", time: "", pay: "Prevod na účet" });
  const [checkoutError, setCheckoutError] = useState("");
  const [dbError, setDbError] = useState<string>("");

  // Onboarding Wizard State
  const [wizardOpen, setWizardOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname === "/vytvorit";
    }
    return false;
  });
  const [wizardStep, setWizardStep] = useState(1); // 1-Identity, 2-Contact, 3-Payment, 4-Launch, 5-Success
  const [newStore, setNewStore] = useState({
    name: "",
    handle: "",
    phone: "",
    city: "",
    iban: "",
    category: "Sviečky a darčeky"
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedVs, setCopiedVs] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [handleManuallyEdited, setHandleManuallyEdited] = useState(false);

  // VS State for payment tracking
  const [orderVs, setOrderVs] = useState("");
  const [confirmDeleteStore, setConfirmDeleteStore] = useState(false);
  const [trialModalDismissed, setTrialModalDismissed] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<any | null>(null);

  // 1. Sync list of stores and seed if empty
  useEffect(() => {
    let active = true;
    let unsub: (() => void) | undefined;

    async function startListener() {
      if (!active) return;

      // Priamo listener — už neseedujeme default obchody (legacy z AI Studio).
      // Reálni predajcovia si vytvoria obchod cez wizard sami.
      unsub = onSnapshot(collection(db, "stores"), (snapshot) => {
        if (!active) return;
        const loaded = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name || "",
            handle: d.handle || docSnap.id,
            city: d.city || "",
            phone: d.phone || "",
            iban: d.iban || "",
            category: d.category || d.industry || "Lokálny predajca",
            createdAt: d.createdAt,
            logo: d.logo || "",
            ownerId: d.ownerId || ""
          };
        });
        setStores(loaded);
      }, (error) => {
        console.error("Stores listener error:", error);
        if (active) {
          setDbError("Chyba pripojenia (Zoznam obchodov): " + error.message);
        }
      });
    }

    startListener();

    return () => {
      active = false;
      if (unsub) unsub();
    };
  }, []);

  // 2. Sync selected store metadata
  useEffect(() => {
    if (!selectedStoreHandle) {
      setStoreExists(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "stores", selectedStoreHandle), async (docSnap) => {
      if (docSnap.exists()) {
        setStoreExists(true);
        const d = docSnap.data();
        let trialEndsAt = d.trialEndsAt || "";
        
        // Auto-generate trialEndsAt for existing or seeded stores if missing
        if (!trialEndsAt) {
          const createdMs = d.createdAt 
            ? (d.createdAt.seconds ? d.createdAt.seconds * 1000 : new Date(d.createdAt).getTime())
            : Date.now();
          trialEndsAt = new Date(createdMs + 10 * 24 * 60 * 60 * 1000).toISOString();
          try {
            await setDoc(doc(db, "stores", selectedStoreHandle), { trialEndsAt }, { merge: true });
          } catch (e) {
            console.error("Auto-set trialEndsAt failed:", e);
          }
        }

        setStore({
          name: d.name || "",
          handle: d.handle || selectedStoreHandle,
          city: d.city || "Prešov",
          phone: d.phone || "+421900123456",
          messengerUsername: d.messengerUsername || "",
          contactEmail: d.contactEmail || "",
          iban: d.iban || "",
          category: d.category || d.industry || "Lokálny predajca",
          trialEndsAt: trialEndsAt,
          plan: d.plan || "",
          planEndsAt: d.planEndsAt || "",
          paymentReported: !!d.paymentReported,
          paymentReportedAt: d.paymentReportedAt || "",
          paymentReportedNote: d.paymentReportedNote || "",
          createdAt: d.createdAt || null,
          logo: d.logo || "",
          description: d.description || "",
          ownerId: d.ownerId || ""
        });
      } else {
        setStoreExists(false);
        setStore({
          name: selectedStoreHandle,
          handle: selectedStoreHandle,
          city: "Prešov",
          phone: "+421900123456",
          messengerUsername: "",
          contactEmail: "",
          iban: "",
          category: "Lokálny predajca",
          trialEndsAt: "",
          plan: "",
          planEndsAt: "",
          paymentReported: false,
          paymentReportedAt: "",
          paymentReportedNote: "",
          createdAt: null,
          logo: "",
          description: "",
          ownerId: ""
        });
      }
    }, (error) => {
      console.error("Store detail listener error:", error);
      setDbError("Chyba pri načítaní obchodu: " + error.message);
    });

    return () => unsub();
  }, [selectedStoreHandle]);

  // 3. Sync all items from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), (snapshot) => {
      const loaded: StoreItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        // Multi-photo: preferuj imgUrls array. Backward compat: fallback na legacy imgUrl.
        const imgs: (string | null)[] = Array.isArray(d.imgUrls) && d.imgUrls.length > 0
          ? d.imgUrls.filter((u: any) => typeof u === "string" && u)
          : (d.imgUrl ? [d.imgUrl] : []);
        return {
          id: d.id || docSnap.id,
          storeId: d.storeId || "milasviecky",
          name: d.name || "",
          desc: d.desc || "",
          price: Number(d.price) || 0,
          unit: d.unit || "",
          type: d.type || "product",
          img: imgs[0] || null,      // Legacy pole — prvá fotka
          imgs,                       // Nové pole — všetky fotky
          slot: d.slot || "",
          left: d.leftCapacity ?? 0,
          badge: d.badge || null,
          emoji: d.emoji || (d.type === "booking" ? "📅" : "🛍️"),
          longDesc: d.longDesc || ""
        };
      });
      setAllItems(loaded);
    }, (error) => {
      console.error("Items real-time listen error:", error);
      setDbError("Chyba pripojenia (Produkty): " + error.message);
    });
    return () => unsub();
  }, []);

  // Filter items for the selected store
  const items = useMemo(() => {
    if (!selectedStoreHandle) return [];
    return allItems.filter(it => it.storeId === selectedStoreHandle);
  }, [allItems, selectedStoreHandle]);

  const trialDaysLeft = useMemo(() => {
    if (!store.trialEndsAt) return 0;
    const endsAtMs = new Date(store.trialEndsAt).getTime();
    const diff = endsAtMs - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [store.trialEndsAt]);

  const isTrialActive = trialDaysLeft > 0;

  // Plán je aktívny len ak (a) je nastavený a (b) planEndsAt je v budúcnosti
  const planActive = useMemo(() => {
    const hasPlanChosen = store.plan === "standard" || store.plan === "extended";
    if (!hasPlanChosen) return false;
    if (!store.planEndsAt) return false;
    return new Date(store.planEndsAt).getTime() > Date.now();
  }, [store.plan, store.planEndsAt]);

  // Používa sa vo viacerých UI miestach — zachovávame názov ale semantika je "aktívny + neexpirovaný"
  const hasPlan = planActive;
  const isStoreVisibleToCustomers = isTrialActive || planActive;

  // Počet dní do konca plánu (0 ak už expiroval alebo nie je)
  const planDaysLeft = useMemo(() => {
    if (!store.planEndsAt) return 0;
    const diff = new Date(store.planEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [store.planEndsAt]);

  // Stály variabilný symbol pre platby predplatného (z ownerId)
  const paymentVs = useMemo(() => {
    if (!store.ownerId) return "";
    // Deterministický hash → 8-miestne číslo
    let h = 0;
    for (let i = 0; i < store.ownerId.length; i++) {
      h = ((h << 5) - h) + store.ownerId.charCodeAt(i);
      h |= 0;
    }
    // 8-miestne číslo (10000000 - 99999999)
    const abs = Math.abs(h) % 90000000 + 10000000;
    return String(abs);
  }, [store.ownerId]);

  const shouldShowTrialModal =
    isOwner &&
    !!selectedStoreHandle &&
    !trialModalDismissed &&
    ((isTrialActive && trialDaysLeft <= 3) || (!isTrialActive && !planActive));

  const maxItemsAllowed = useMemo(() => {
    // Aktívny plán rozhoduje o limitu (2 alebo 6)
    if (planActive) {
      if (store.plan === "standard") return 2;
      if (store.plan === "extended") return 6;
    }
    // Ak trial ešte beží, dovoľuje 6 (plná funkčnosť)
    if (isTrialActive) return 6;
    return 0;
  }, [isTrialActive, planActive, store.plan]);

  const hasReachedItemLimit = items.length >= maxItemsAllowed;
  // Ak už je limit maximálny (6 — Rozšírený alebo Trial), nemá zmysel odkazovať na "Rozšírený plán"
  // — Rozšírený má tiež len 6 produktov. Text by mal hovoriť "najprv zmaž niektorý existujúci".
  const limitMessage = maxItemsAllowed >= 6
    ? `Dosiahli ste maximum (6 produktov) — to je najväčší limit vo Vitríne. Ak chcete pridať ďalší, najprv zmažte niektorý existujúci produkt v zozname nižšie.`
    : `Dosiahli ste limit vášho plánu (${maxItemsAllowed} ${maxItemsAllowed === 2 ? "produkty" : "produktov"}). Pre pridanie ďalších produktov si zvoľte Rozšírený plán nižšie.`;

  // Filter items that are visible to customers (sliced based on plan limit)
  const visibleItems = useMemo(() => {
    if (isOwner) return items; // Owner sees everything
    return items.slice(0, maxItemsAllowed);
  }, [items, maxItemsAllowed, isOwner]);

  // Pre-generate VS when checkout panel opens
  useEffect(() => {
    if (checkout) {
      const vs = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      setOrderVs(vs);
    }
  }, [checkout]);

  // Listen to orders for the admin view
  useEffect(() => {
    if (!selectedStoreHandle || !isOwner) {
      setAdminOrders([]);
      return;
    }
    const q = query(
      collection(db, "orders"),
      where("storeId", "==", selectedStoreHandle)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      // Sort in-memory by createdAt desc safely
      loaded.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setAdminOrders(loaded);
    }, (err) => {
      console.error("Error loading orders:", err);
    });
    return unsub;
  }, [selectedStoreHandle, isOwner]);

  // Find order helper for public withdrawal
  const findOrder = async (orderIdent: string) => {
    if (!orderIdent || !selectedStoreHandle) return null;
    const trimmed = orderIdent.trim();
    // 1. Try by document ID
    const docRef = doc(db, "orders", trimmed);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.storeId === selectedStoreHandle) {
        return { id: docSnap.id, ref: docRef, data };
      }
    }
    // 2. Try by variabilnySymbol
    const q = query(
      collection(db, "orders"),
      where("storeId", "==", selectedStoreHandle),
      where("variabilnySymbol", "==", trimmed)
    );
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      return { id: firstDoc.id, ref: firstDoc.ref, data: firstDoc.data() };
    }
    return null;
  };

  // Submit handler for consumer withdrawal
  const handleWithdrawalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setWithdrawalError("");
    setWithdrawalLoading(true);

    const { name, orderIdent, email } = withdrawalForm;
    if (!name.trim() || !orderIdent.trim() || !email.trim()) {
      setWithdrawalError("Prosím, vyplňte všetky povinné polia.");
      setWithdrawalLoading(false);
      return;
    }

    try {
      // Find the order
      const orderMatch = await findOrder(orderIdent);
      if (!orderMatch) {
        setWithdrawalError("Objednávka s týmto číslom alebo variabilným symbolom sa v tomto obchode nenašla. Skontrolujte prosím zadané údaje.");
        setWithdrawalLoading(false);
        return;
      }

      const orderId = orderMatch.id;
      const orderRef = orderMatch.ref;

      // Update the order in Firestore
      const now = new Date();
      await updateDoc(orderRef, {
        status: "Žiadosť o odstúpenie",
        withdrawalName: name.trim(),
        withdrawalEmail: email.trim(),
        withdrawalDate: now.toISOString()
      });

      // Show success
      setWithdrawalSuccess({
        orderId,
        variabilnySymbol: orderMatch.data.variabilnySymbol || "",
        name: name.trim(),
        email: email.trim(),
        timestamp: now.toLocaleString("sk-SK")
      });

      // Reset form fields
      setWithdrawalForm({ name: "", orderIdent: "", email: "" });
    } catch (err: any) {
      console.error("Error submitting withdrawal: ", err);
      setWithdrawalError("Pri spracovaní žiadosti nastala chyba. Skúste to prosím znova.");
    } finally {
      setWithdrawalLoading(false);
    }
  };

  // Listen to popstate to react to browser back buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        setCurrentPath(path);
        
        if (path === "/" || path === "/app" || path === "/vytvorit" || path === "/admin-platformy") {
          setSelectedStoreHandle(null);
          if (path === "/vytvorit") {
            setWizardOpen(true);
            setWizardStep(1);
          } else {
            setWizardOpen(false);
          }
        } else {
          const handle = path.substring(1);
          setSelectedStoreHandle(handle);
          setWizardOpen(false);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Client-side navigation helper
  const navigateTo = (path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      setCurrentPath(path);
      
      if (path === "/" || path === "/app" || path === "/vytvorit" || path === "/admin-platformy") {
        setSelectedStoreHandle(null);
        if (path === "/vytvorit") {
          setWizardOpen(true);
          setWizardStep(1);
        } else {
          setWizardOpen(false);
        }
      } else {
        const handle = path.substring(1);
        setSelectedStoreHandle(handle);
        setWizardOpen(false);
      }
    }
  };

  // Update browser history and clean cart
  const selectStore = (handle: string | null) => {
    setSelectedStoreHandle(handle);
    setCart({});
    setSelectedProductId(null);
    setCheckout(false);
    setDbError("");
    setTrialModalDismissed(false);
    if (typeof window !== "undefined") {
      const path = handle ? `/${handle}` : "/";
      window.history.pushState({}, "", path);
      setCurrentPath(path);
    }
  };

  const cartRows = useMemo(
    () => items.filter((i) => (cart[i.id] ?? 0) > 0).map((i) => ({ ...i, qty: cart[i.id] })),
    [items, cart]
  );
  const selectedProduct = useMemo(
    () => items.find((it) => it.id === selectedProductId) || null,
    [items, selectedProductId]
  );
  const total = cartRows.reduce((s, r) => s + r.qty * r.price, 0);
  const count = cartRows.reduce((s, r) => s + r.qty, 0);

  const add = (id: string, d: number) =>
    setCart((c) => {
      const q = Math.max(0, (c[id] || 0) + d);
      const n = { ...c, [id]: q };
      if (q === 0) delete n[id];
      return n;
    });

  // Update active store field in Firestore
  const updateStoreField = async (field: string, val: string) => {
    if (!selectedStoreHandle) return;

    // Update local state first so inputs are responsive as user types
    const newStore = { ...store, [field]: val };
    setStore(newStore);

    // Safety check: do not save empty strings to Firestore for required fields
    if (["name", "phone", "city", "iban"].includes(field) && !val.trim()) {
      return;
    }

    try {
      await setDoc(doc(db, "stores", selectedStoreHandle), { [field]: val }, { merge: true });
    } catch (err: any) {
      console.error("Error updating store field:", err);
      setDbError("Zápis nastavení zlyhal: " + err.message);
    }
  };

  // Predajca "nahlási platbu" — zapíšeme flag + timestamp, ty (admin) to schváliš v AdminPlatformy
  const [reportingPayment, setReportingPayment] = useState(false);
  const reportPayment = async () => {
    if (!selectedStoreHandle || !store.plan) return;
    setReportingPayment(true);
    try {
      const now = new Date().toISOString();
      await setDoc(doc(db, "stores", selectedStoreHandle), {
        paymentReported: true,
        paymentReportedAt: now,
        paymentReportedPlan: store.plan,
      }, { merge: true });
      setStore({ ...store, paymentReported: true, paymentReportedAt: now });
      // Notifikácia adminovi bude riešená cronom (check-trials.mjs) — nie priamo z klienta.
    } catch (err: any) {
      console.error("Error reporting payment:", err);
      setDbError("Nahlásenie platby zlyhalo: " + err.message);
    } finally {
      setReportingPayment(false);
    }
  };

  // Predvyplnená WhatsApp správa
  const waText = useMemo(() => {
    const lines = [
      `🛍️ Nová objednávka — ${store.name}`,
      "",
      ...cartRows.map(
        (r) =>
          `${r.emoji} ${r.name}\n   ${r.qty} × ${eur(r.price)}${r.type === "booking" ? `\n   📅 ${r.slot}` : ""}`
      ),
      "",
      `💰 Spolu: ${eur(total)}`,
      `👤 Meno: ${cust.name || "—"}`,
      `📍 Mesto: ${cust.city || "—"}`,
      `💳 Platba: ${cust.pay}`,
      cust.pay === "Prevod na účet" ? `🔢 VS: ${orderVs}` : null,
      "",
      "Odoslané cez Vitrína ✨",
    ].filter((l) => l !== null);
    return lines.join("\n");
  }, [cartRows, total, cust, store.name, orderVs]);

  // Multi-kanál odkazy pre checkout. Zákazník si vyberie kanál podľa toho čo má nainštalované.
  const cleanPhone = store.phone.replace(/[^0-9]/g, "");
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}` : "";
  const smsLink = cleanPhone ? `sms:${cleanPhone.startsWith("00") ? "+" + cleanPhone.slice(2) : "+" + cleanPhone}?body=${encodeURIComponent(waText)}` : "";
  // Predajca môže zadať username ako "polskefirmysk", "m.me/polskefirmysk", "https://m.me/polskefirmysk"
  // alebo "facebook.com/polskefirmysk" — sanitujeme na čistý username.
  const rawMessenger = ((store as any).messengerUsername || "").trim();
  const messengerUsername = rawMessenger
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^m\.me\//, "")
    .replace(/^facebook\.com\//, "")
    .replace(/^messenger\.com\//, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  const messengerLink = messengerUsername ? `https://m.me/${messengerUsername}` : "";
  const contactEmail = ((store as any).contactEmail || "").trim();
  const emailLink = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Nová objednávka — ${store.name}`)}&body=${encodeURIComponent(waText)}`
    : "";

  // Save order to Firestore orders
  const handleCheckout = async (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!selectedStoreHandle) return;

    if (!cust.name.trim() || !cust.city.trim()) {
      e.preventDefault();
      setCheckoutError("Prosím, vyplňte meno a mesto / adresu doručenia — predajca potrebuje vedieť, komu a kam má objednávku doručiť.");
      return;
    }
    setCheckoutError("");

    const orderId = Date.now().toString();

    const orderItemsData = cartRows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      qty: r.qty,
      type: r.type,
      slot: r.slot || ""
    }));

    const orderData = {
      id: orderId,
      storeId: selectedStoreHandle,
      variabilnySymbol: orderVs,
      items: orderItemsData,
      total: total,
      customerName: cust.name,
      customerCity: cust.city,
      customerTime: cust.time || "",
      status: "Nová",
      createdAt: new Date()
    };

    try {
      await setDoc(doc(db, "orders", orderId), orderData);
      setCart({});
      setCheckout(false);
    } catch (error) {
      console.error("Error saving order: ", error);
    }
  };

  // Slovak Payme QR Pay generator
  const paymeUrl = useMemo(() => {
    if (!store.iban) return "";
    const cleanIban = store.iban.replace(/\s+/g, "").toUpperCase();
    const amount = total.toFixed(2);
    const desc = encodeURIComponent(`Objednavka ${store.name}`);
    return `https://payme.sk?v=1&iban=${cleanIban}&amount=${amount}&currency=EUR&vs=${orderVs}&desc=${desc}`;
  }, [store.iban, total, orderVs, store.name]);

  // Onboarding handle validation helpers
  const sanitizedHandle = useMemo(() => {
    return newStore.handle.toLowerCase().replace(/[^a-z0-9-]/g, "");
  }, [newStore.handle]);

  // Rezervované handles — nesmú byť použité ako názov obchodu (kolízia s aplikačnými routami).
  // Ak si niekto vezme "podmienky", jeho obchod by nefungoval — otvorila by sa mu legal stránka.
  const RESERVED_HANDLES = useMemo(() => new Set([
    "app", "vytvorit", "admin", "admin-platformy",
    "podmienky", "ochrana-udajov", "cookies", "reklamacie", "odstupenie",
    "api", "assets", "static", "www", "root", "faq", "cena", "cennik",
    "prihlaseni", "registracia", "login", "signup", "logout",
    "sitemap.xml", "robots.txt", "favicon.ico"
  ]), []);

  const handleIsReserved = useMemo(() => {
    return RESERVED_HANDLES.has(sanitizedHandle);
  }, [sanitizedHandle, RESERVED_HANDLES]);

  const handleIsTaken = useMemo(() => {
    if (!sanitizedHandle) return false;
    return stores.some(s => s.handle.toLowerCase() === sanitizedHandle);
  }, [sanitizedHandle, stores]);

  const handleIsValid = useMemo(() => {
    return sanitizedHandle.length >= 3 && /^[a-z0-9-]+$/.test(sanitizedHandle) && !handleIsReserved;
  }, [sanitizedHandle, handleIsReserved]);

  const finishStep1 = () => {
    if (handleIsValid && !handleIsTaken) {
      setNewStore({ ...newStore, handle: sanitizedHandle });
      setWizardStep(2);
    }
  };

  const createAndLaunchStore = async () => {
    const handle = sanitizedHandle;
    if (!handle || handleIsTaken || !handleIsValid || !newStore.name.trim()) return;

    // Business rule: 1 účet = 1 obchod. Ak už má, blokujeme vytvorenie ďalšieho.
    if (currentUser && stores.some(s => s.ownerId === currentUser.uid)) {
      setDbError("Váš účet už má vytvorený obchod. Jeden účet môže mať iba jeden obchod. Pre ďalší biznis založte nový účet.");
      setWizardOpen(false);
      navigateTo("/app");
      return;
    }

    try {
      const storeData = {
        id: handle,
        name: newStore.name.trim(),
        handle: handle,
        phone: newStore.phone.trim() || "+421900123456",
        city: newStore.city.trim() || "Prešov",
        iban: newStore.iban.trim().toUpperCase(),
        category: newStore.category.trim() || "Sviečky a darčeky",
        createdAt: new Date(),
        trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        plan: "",
        logo: "",
        ownerId: currentUser?.uid || ""
      };

      // 1. Create store doc
      await setDoc(doc(db, "stores", handle), storeData);

      setWizardStep(5);
    } catch (err: any) {
      console.error("Error creating store:", err);
      setDbError("Vytvorenie obchodu zlyhalo: " + err.message);
    }
  };

  const confirmDeleteStoreFromHub = async () => {
    if (!storeToDelete) return;
    const handle = storeToDelete.handle;
    try {
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
      console.error("Error deleting store from hub:", err);
      setDbError("Chyba pri mazaní obchodu: " + err.message);
    }
  };

  const copyStoreLink = (handle: string) => {
    const fullUrl = `${currentOrigin}/${handle}`;
    copyText(fullUrl, () => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  if (currentPath === "/admin-platformy") {
    return <AdminPlatformy onNavigate={navigateTo} />;
  }

  // Právne stránky (ToS, Privacy, Cookies, Reklamácie, Odstúpenie).
  if (LEGAL_PATHS[currentPath]) {
    return <LegalPage type={LEGAL_PATHS[currentPath]} onNavigate={navigateTo} />;
  }

  if (currentPath === "/") {
    return <LandingPage onNavigate={navigateTo} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center animate-in fade-in duration-300" style={{ background: C.bg }}>
        <div className="flex flex-col items-center gap-4">
          <Logo size={48} />
          <div className="text-sm font-semibold animate-pulse" style={{ color: C.soft }}>Načítavam Vitrínu...</div>
        </div>
      </div>
    );
  }

  if (currentUser === null && (currentPath === "/app" || currentPath === "/vytvorit")) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 animate-in fade-in duration-300" style={{ background: C.bg, color: C.ink, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
          .disp { font-family: 'Sora', sans-serif; }
          input { outline: none; }
          input:focus { border-color: ${C.accent} !important; }
        `}</style>
        
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border shadow-xl flex flex-col gap-6" style={{ borderColor: C.line }}>
          <div className="text-center flex flex-col items-center gap-2">
            <Logo size={42} />
            <h1 className="disp text-2xl font-extrabold tracking-tight mt-2">
              {resetMode ? "Obnova hesla" : isRegisterMode ? "Vytvoriť predajný účet" : "Prihlásenie predajcu"}
            </h1>
            <p className="text-xs" style={{ color: C.soft }}>
              {resetMode 
                ? "Zadajte svoj e-mail a my vám pošleme odkaz na obnovenie hesla." 
                : isRegisterMode 
                  ? "Zaregistrujte sa a otvorte si vlastnú online Vitrínu za pár sekúnd." 
                  : "Prihláste sa do svojej administrácie pre správu vitrín."
              }
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-800 border border-red-100 text-xs font-semibold leading-relaxed">
              ⚠️ {authError}
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold leading-relaxed">
              ✅ {authSuccess}
            </div>
          )}

          {resetMode ? (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: C.soft }}>E-mailová adresa</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="napriklad@mail.sk"
                  className="px-4 py-3 rounded-xl border text-sm w-full transition-all bg-slate-50/50 focus:bg-white"
                  style={{ borderColor: C.line }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 mt-2"
                style={{ background: C.accent }}
              >
                {authSubmitting ? "Odosielam..." : "Odoslať odkaz na obnovu"}
              </button>

              <button
                type="button"
                onClick={() => { setResetMode(false); setAuthError(""); setAuthSuccess(""); }}
                className="text-xs font-bold transition-colors text-center mt-2 hover:opacity-100"
                style={{ color: C.soft }}
              >
                Späť na prihlásenie
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: C.soft }}>E-mailová adresa</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="napriklad@mail.sk"
                  className="px-4 py-3 rounded-xl border text-sm w-full transition-all bg-slate-50/50 focus:bg-white"
                  style={{ borderColor: C.line }}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: C.soft }}>Heslo</label>
                  {!isRegisterMode && (
                    <button
                      type="button"
                      onClick={() => { setResetMode(true); setAuthError(""); setAuthSuccess(""); }}
                      className="text-[10px] font-bold"
                      style={{ color: C.accentText }}
                    >
                      Zabudli ste heslo?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showAuthPassword ? "text" : "password"}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="px-4 py-3 pr-11 rounded-xl border text-sm w-full transition-all bg-slate-50/50 focus:bg-white"
                    style={{ borderColor: C.line }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 text-sm"
                    aria-label={showAuthPassword ? "Skryť heslo" : "Zobraziť heslo"}
                  >
                    {showAuthPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {isRegisterMode && (
                <div className="flex flex-col gap-2.5 mt-1">
                  <label className="flex items-start gap-2.5 text-[11px] leading-relaxed cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 shrink-0 accent-[#7A8471]"
                    />
                    <span>
                      Súhlasím s{" "}
                      <a href="/podmienky" onClick={(e) => { e.preventDefault(); navigateTo("/podmienky"); }} className="text-[#647058] font-bold hover:underline">
                        Podmienkami používania
                      </a>{" "}
                      a{" "}
                      <a href="/ochrana-udajov" onClick={(e) => { e.preventDefault(); navigateTo("/ochrana-udajov"); }} className="text-[#647058] font-bold hover:underline">
                        Ochranou osobných údajov
                      </a>.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-[11px] leading-relaxed cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={acceptDigitalService}
                      onChange={(e) => setAcceptDigitalService(e.target.checked)}
                      className="mt-0.5 shrink-0 accent-[#7A8471]"
                    />
                    <span>
                      Súhlasím so začatím poskytovania digitálnej služby ihneď (viď{" "}
                      <a href="/odstupenie" onClick={(e) => { e.preventDefault(); navigateTo("/odstupenie"); }} className="text-[#647058] font-bold hover:underline">
                        Odstúpenie od zmluvy
                      </a>
                      ).
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 mt-2"
                style={{ background: C.accent }}
              >
                {authSubmitting
                  ? (isRegisterMode ? "Vytváram účet..." : "Prihlasujem...")
                  : (isRegisterMode ? "Zaregistrovať sa" : "Prihlásiť sa")
                }
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t" style={{ borderColor: C.line }}></div>
                <span className="flex-shrink mx-4 text-[10px] uppercase font-bold tracking-wider" style={{ color: C.soft }}>alebo</span>
                <div className="flex-grow border-t" style={{ borderColor: C.line }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-xl border text-slate-700 font-bold text-xs bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5"
                style={{ borderColor: C.line }}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-5.29-4.53z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Prihlásiť sa cez Google
              </button>

              <button
                type="button"
                onClick={() => { setIsRegisterMode(!isRegisterMode); setAuthError(""); setAuthSuccess(""); }}
                className="text-xs font-bold transition-colors text-center mt-2 hover:opacity-100"
                style={{ color: C.accentText }}
              >
                {isRegisterMode ? "Už máte účet? Prihláste sa" : "Nemáte účet? Zaregistrujte sa"}
              </button>
            </form>
          )}
        </div>
        
        <button
          onClick={() => navigateTo("/")}
          className="mt-6 text-xs font-bold opacity-75 hover:opacity-100 transition-opacity flex items-center gap-1.5"
          style={{ color: C.soft }}
        >
          ← Späť na hlavnú stránku
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: C.bg, color: C.ink, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
        .disp { font-family: 'Sora', sans-serif; }
        input, select { outline: none; }
        input:focus, select:focus { border-color: ${C.accent} !important; }
      `}</style>

      {/* ── Horná lišta ── */}
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ background: C.bg, borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo("/")}>
          <Logo />
          <span className="disp text-lg font-bold tracking-tight">Vitrína</span>
        </div>
        {selectedStoreHandle && isOwner ? (
          <nav className="flex gap-1 p-1 rounded-full" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            {[
              ["shop", "Obchod"],
              ["admin", "Nastavenia"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setView(k as "shop" | "admin")}
                className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                style={view === k ? { background: C.ink, color: "#fff" } : { color: C.soft }}
              >
                {label}
              </button>
            ))}
          </nav>
        ) : (
          currentUser && (currentPath === "/app" || currentPath === "/vytvorit") && (
            <div className="flex items-center gap-2.5 animate-in fade-in duration-200">
              <span className="text-xs font-semibold max-w-[150px] truncate hidden sm:inline animate-pulse" style={{ color: C.soft }}>
                {currentUser.email}
              </span>
              <button
                onClick={() => {
                  signOut(auth).catch(console.error);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors hover:bg-slate-50 cursor-pointer flex items-center gap-1 shadow-sm"
                style={{ borderColor: C.line, color: C.soft, background: C.card }}
              >
                <span>Odhlásiť sa</span>
                <span className="text-[10px]">🚪</span>
              </button>
            </div>
          )
        )}
      </header>

      {/* ── Modálne okno: koniec skúšobnej doby / vypršaná bez plánu ── */}
      {shouldShowTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-white shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3" style={{ background: isTrialActive ? "#FEF3C7" : "#FEE2E2" }}>
              {isTrialActive ? "⏳" : "📴"}
            </div>
            {isTrialActive ? (
              <>
                <h3 className="disp text-lg font-extrabold text-slate-900">Skúšobná doba čoskoro skončí</h3>
                <p className="text-xs mt-2 leading-relaxed text-slate-500">
                  Zostáva vám už len <strong>{trialDaysLeft} {trialDaysLeft === 1 ? "deň" : trialDaysLeft < 5 ? "dni" : "dní"}</strong>. Ak si dovtedy nezvolíte plán, váš obchod prestane byť viditeľný pre zákazníkov.
                </p>
              </>
            ) : (
              <>
                <h3 className="disp text-lg font-extrabold text-slate-900">Skúšobná doba vypršala</h3>
                <p className="text-xs mt-2 leading-relaxed text-slate-500">
                  Váš obchod momentálne <strong>nie je viditeľný pre zákazníkov</strong>. Zvoľte si plán a obnovte viditeľnosť vášho obchodu.
                </p>
              </>
            )}
            <div className="flex flex-col gap-2 w-full mt-5">
              <button
                onClick={() => {
                  setTrialModalDismissed(true);
                  setView("admin");
                }}
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm transition-colors"
                style={{ background: C.ink }}
              >
                Vybrať plán
              </button>
              <button
                onClick={() => setTrialModalDismissed(true)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-600 transition-colors"
              >
                Pripomenúť neskôr
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chybové oznámenie ── */}
      {dbError && (
        <div className="max-w-md mx-auto mt-4 mx-4 p-3 rounded-xl text-xs bg-red-50 text-red-800 border border-red-200 flex flex-col gap-1 shadow-sm">
          <div className="font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">⚠️ Systémová chyba</span>
            <button className="text-[10px] uppercase tracking-wider font-semibold opacity-60 hover:opacity-100" onClick={() => setDbError("")}>[Skryť]</button>
          </div>
          <p className="font-mono mt-0.5 break-all">{dbError}</p>
        </div>
      )}

      {/* ── Hlavný Obsah podľa stavu ── */}
      {selectedStoreHandle && storeExists === false ? (
        <main className="max-w-md mx-auto w-full px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-4xl mb-4">
            🔍
          </div>
          <h1 className="disp text-2xl font-extrabold tracking-tight mb-2">Tento obchod neexistuje</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Obchod s názvom <strong className="font-semibold text-slate-800">"{selectedStoreHandle}"</strong> sme v našom systéme nenašli. Skontrolujte prosím preklepy v adrese.
          </p>
          <button
            onClick={() => navigateTo("/")}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md transition-transform hover:scale-[1.01]"
            style={{ background: C.accent }}
          >
            Späť na hlavnú stránku
          </button>
        </main>
      ) : !selectedStoreHandle ? (
        /* ==================== PORTÁL OBCHODOV (HUB) ==================== */
        <main className="max-w-md mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-between">
          {/* Admin (jrcasspro@gmail.com) bez obchodu → uvítacia obrazovka superadmina, nie stránka predajcu */}
          {currentUser?.email === "jrcasspro@gmail.com" && userStores.length === 0 ? (
            <div className="text-center my-auto py-6">
              <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl bg-white shadow-sm mb-4 border border-slate-100" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                🛠️
              </div>
              <h1 className="disp text-3xl font-extrabold tracking-tight mb-2">
                Vitajte, správca
              </h1>
              <p className="text-sm px-2 mb-8 leading-relaxed" style={{ color: C.soft }}>
                Prihlásili ste sa ako administrátor platformy Vitrína. Otvorte Superadmin panel pre správu obchodov, aktiváciu platieb a údajov firmy.
              </p>

              <button
                onClick={() => navigateTo("/admin-platformy")}
                className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-transform hover:scale-[1.01]"
                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
              >
                🛠️ Otvoriť Superadmin panel →
              </button>

              <p className="text-[11px] text-slate-500 mt-6 leading-relaxed">
                Ak chcete testovať Vitrínu ako predajca, môžete si založiť aj vlastný obchod na tomto účte.
              </p>
              <button
                onClick={() => {
                  setNewStore({ name: "", handle: "", phone: "", city: "", iban: "", category: "Sviečky a darčeky" });
                  setHandleManuallyEdited(false);
                  navigateTo("/vytvorit");
                }}
                className="mt-2 text-xs font-semibold text-slate-500 hover:text-[#647058] hover:underline"
              >
                Vytvoriť si testovací obchod
              </button>
            </div>
          ) : (
          <div className="text-center my-auto py-6">
            <img
              src={defaultLogo}
              alt="Vitrína logo"
              className="w-20 h-20 mx-auto rounded-3xl object-cover bg-white shadow-sm mb-4 border border-slate-100"
              referrerPolicy="no-referrer"
            />
            <h1 className="disp text-3xl font-extrabold tracking-tight mb-2">
              {userStores.length === 0 ? "Vlastná Vitrína" : "Váš obchod"}
            </h1>
            <p className="text-sm px-2 mb-8 leading-relaxed" style={{ color: C.soft }}>
              {userStores.length === 0
                ? "Založ si moderné výkladné okno za pár sekúnd, vystav produkty a prijímaj platby priamo cez WhatsApp s Payme QR platbami!"
                : "Váš obchod je vytvorený. Pokračujte v úprave produktov alebo si pozrite ako vyzerá zákaznícka stránka."}
            </p>

            {/* Tlačidlo Vytvoriť — LEN ak ešte nemá žiadny obchod (pravidlo: 1 účet = 1 obchod) */}
            {userStores.length === 0 && (
              <button
                onClick={() => {
                  setNewStore({ name: "", handle: "", phone: "", city: "", iban: "", category: "Sviečky a darčeky" });
                  setHandleManuallyEdited(false);
                  navigateTo("/vytvorit");
                }}
                className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-transform hover:scale-[1.01]"
                style={{ background: C.accent }}
              >
                ✨ Vytvoriť vlastný obchod
              </button>
            )}
          </div>
          )}

          {/* Zoznam existujúcich obchodov — mením "Moje Vitríny (N)" na "Môj obchod" (1 účet = 1 obchod) */}
          <div className="mt-8 border-t pt-6" style={{ borderColor: C.line }}>
            {userStores.length > 0 && (
              <h2 className="disp text-sm font-extrabold uppercase tracking-wider mb-3" style={{ color: C.soft }}>
                {userStores.length === 1 ? "⚡ Môj obchod" : `⚡ Moje obchody (${userStores.length})`}
              </h2>
            )}
            <div className="flex flex-col gap-2.5">
              {userStores.length === 0 ? null : (
                userStores.map((st) => (
                <div
                  key={st.id}
                  onClick={() => selectStore(st.handle)}
                  className="p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all hover:translate-x-0.5"
                  style={{ background: C.card, border: `1px solid ${C.line}` }}
                >
                  <StoreLogo logo={st.logo} name={st.name} className="w-10 h-10 rounded-xl text-xl shrink-0" />
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-bold text-sm truncate">{st.name || "Bez názvu obchodu"}</h3>
                    <p className="text-xs truncate" style={{ color: C.soft }}>
                      {(st.category || st.industry || "Lokálny predajca")} · {st.city} · {st.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoreToDelete(st);
                      }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Vymazať 🗑️
                    </button>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: C.accentSoft, color: C.accentText }}>
                      Vstúpiť →
                    </span>
                  </div>
                </div>
              )))}
            </div>
            {userStores.length >= 1 && (
              <p className="text-[11px] text-slate-500 mt-4 leading-relaxed text-center px-4">
                🔒 Jeden účet = jeden obchod. Ak chcete predávať v úplne inej kategórii, vytvorte nový účet s iným emailom.
              </p>
            )}
          </div>

          <div className="text-center mt-8 pb-2">
            <button
              onClick={() => navigateTo("/admin-platformy")}
              className="text-[11px] font-bold text-slate-500 hover:text-[#647058] transition-colors inline-flex items-center gap-1"
            >
              ⚙️ Prejsť do Adminu platformy
            </button>
          </div>

          {/* Potvrdzovací dialóg pre vymazanie obchodu z Hubu */}
          {storeToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full border shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150" style={{ borderColor: C.line }}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mx-auto mb-3">
                    🗑️
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">Vymazať tento obchod?</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Naozaj chcete vymazať obchod <strong className="text-slate-800">"{storeToDelete.name || "Bez názvu obchodu"}"</strong> aj všetky jeho produkty a objednávky? Táto akcia je nevratná.
                  </p>
                </div>
                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={() => setStoreToDelete(null)}
                    className="flex-1 py-2.5 rounded-xl border text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    style={{ borderColor: C.line }}
                  >
                    Zrušiť
                  </button>
                  <button
                    onClick={confirmDeleteStoreFromHub}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Vymazať
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* ==================== INDIVIDUÁLNY OBCHOD ==================== */
        (!isOwner || view === "shop") ? (
          !isStoreVisibleToCustomers && !isOwner ? (
            <main className="max-w-md mx-auto w-full px-4 py-16 text-center flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-4xl mb-4 shadow-sm animate-bounce">
                📴
              </div>
              <h1 className="disp text-2xl font-extrabold text-slate-800 leading-tight">Vitrína je dočasne offline</h1>
              <p className="text-sm mt-3 text-slate-500 leading-relaxed px-4">
                Tento obchod momentálne nie je verejne dostupný. Predajca si musí vybrať plán, aby bol jeho obchod viditeľný pre zákazníkov.
              </p>
              <button 
                onClick={() => navigateTo("/")}
                className="mt-8 px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-colors"
              >
                Späť na hlavnú stránku
              </button>
            </main>
          ) : (
            <main className="max-w-2xl mx-auto w-full px-4 pb-40 pt-6">
              {!isStoreVisibleToCustomers && isOwner && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in slide-in-from-top-3">
                  <div>
                    <span className="font-extrabold block text-sm">⚠️ Obchod nie je viditeľný pre zákazníkov</span>
                    <span className="opacity-90 block mt-0.5">Skúšobná doba vypršala a zatiaľ ste si nezvolili plán. Vyberte si plán, aby váš obchod zostal viditeľný pre zákazníkov.</span>
                  </div>
                  <button
                    onClick={() => setView("admin")}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-800 text-white font-bold hover:bg-amber-900 transition-colors whitespace-nowrap self-start sm:self-center"
                  >
                    Vybrať plán
                  </button>
                </div>
              )}
            {selectedProductId && selectedProduct ? (
              /* ==================== SCREEN: DETAIL PRODUKTU ==================== */
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-200">
                {/* Späť tlačidlo */}
                <button
                  onClick={() => setSelectedProductId(null)}
                  className="text-xs font-bold mb-6 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border"
                  style={{ borderColor: C.line }}
                >
                  ← Späť na ponuku
                </button>

                {/* Galéria — carousel s bodkami ak je viac fotiek */}
                <ProductGallery product={selectedProduct} />

                {/* Odznaky pod galériou */}
                {(selectedProduct.badge || (selectedProduct.type === "booking" && selectedProduct.left !== undefined)) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedProduct.badge && (
                      <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold" style={{ background: C.accentSoft, color: C.accentText }}>
                        {selectedProduct.badge}
                      </span>
                    )}
                    {selectedProduct.type === "booking" && selectedProduct.left !== undefined && (
                      <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold" style={{ background: "#FFF3E6", color: "#B4690E" }}>
                        {selectedProduct.left} voľné
                      </span>
                    )}
                  </div>
                )}

                {/* Detaily o produkte */}
                <div className="flex flex-col gap-3">
                  <h1 className="disp text-2xl font-black text-slate-900 leading-tight">{selectedProduct.name}</h1>
                  
                  <div className="flex items-baseline gap-1.5">
                    <span className="disp text-3xl font-extrabold" style={{ color: C.ink }}>{eur(selectedProduct.price)}</span>
                    <span className="text-xs text-slate-500 font-medium">/ {selectedProduct.unit}</span>
                  </div>

                  {selectedProduct.type === "booking" && selectedProduct.slot && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center gap-3 text-xs font-semibold" style={{ color: "#B4690E" }}>
                      <span className="text-2xl">📅</span>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-amber-600/80 font-bold">Termín rezervácie</span>
                        <span className="text-sm font-extrabold">{selectedProduct.slot}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 border-t pt-5" style={{ borderColor: C.line }}>
                    <h3 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mb-2.5">O produkte</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedProduct.longDesc || selectedProduct.desc || "K tomuto produktu zatiaľ predajca neuviedol podrobnejší popis."}
                    </p>
                  </div>

                  {/* Ovládanie množstva a pridávania */}
                  <div className="mt-8 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: C.card, borderColor: C.line }}>
                    <div className="flex flex-col gap-1 items-center sm:items-start shrink-0">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">Počet {selectedProduct.type === "booking" ? "miest" : "kusov"}</span>
                      <div className="flex items-center gap-1.5 rounded-xl p-0.5 border mt-1" style={{ borderColor: C.line, background: C.bg }}>
                        <button 
                          onClick={() => {
                            const q = cart[selectedProduct.id] ?? 0;
                            if (q > 0) add(selectedProduct.id, -1);
                          }}
                          className="w-9 h-9 flex items-center justify-center text-sm font-bold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30" 
                          style={{ color: C.soft }}
                          disabled={(cart[selectedProduct.id] ?? 0) === 0}
                        >
                          −
                        </button>
                        <span className="text-sm font-extrabold w-6 text-center">
                          {cart[selectedProduct.id] ?? 0}
                        </span>
                        <button 
                          onClick={() => add(selectedProduct.id, 1)}
                          className="w-9 h-9 flex items-center justify-center text-sm font-bold rounded-lg hover:bg-slate-100 transition-colors" 
                          style={{ color: C.accentText }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const qty = cart[selectedProduct.id] ?? 0;
                        if (qty === 0) {
                          add(selectedProduct.id, 1);
                        } else {
                          setCheckout(true);
                          setSelectedProductId(null); // return to store to show checkout
                        }
                      }}
                      className="w-full sm:flex-1 py-3.5 px-6 rounded-full text-white font-extrabold text-sm flex items-center justify-between shadow-lg transition-transform hover:scale-[1.01] active:scale-95"
                      style={{ background: C.accent }}
                    >
                      <span className="flex items-center gap-1.5">
                        {(cart[selectedProduct.id] ?? 0) === 0 ? (
                          <>🛒 {selectedProduct.type === "booking" ? "Rezervovať miesto" : "Pridať do košíka"}</>
                        ) : (
                          <>💳 Pokračovať k objednávke</>
                        )}
                      </span>
                      <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/20">
                        {eur(((cart[selectedProduct.id] ?? 0) || 1) * selectedProduct.price)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ==================== ORIGINAL STORE LISTING ==================== */
              <>
                {/* Tlačidlo späť na zoznam */}
                {isOwner && (
                  <button
                    onClick={() => {
                      // Predajca (owner) → jeho portál obchodov (/app), nie landing.
                      setSelectedStoreHandle(null);
                      setCart({});
                      setSelectedProductId(null);
                      setCheckout(false);
                      setDbError("");
                      setTrialModalDismissed(false);
                      navigateTo("/app");
                    }}
                    className="text-xs font-semibold mb-4 flex items-center gap-1 opacity-70 hover:opacity-100"
                    style={{ color: C.soft }}
                  >
                    ← Späť do môjho portálu
                  </button>
                )}

                {/* ── Vizitka obchodu ── */}
                <section className="text-center mb-6">
                  <div className="mx-auto flex justify-center">
                    <StoreLogo logo={store.logo} name={store.name} className="w-16 h-16 rounded-2xl text-3xl" />
                  </div>
                  <h1 className="disp text-2xl font-extrabold mt-3">{store.name}</h1>
                  <p className="text-sm mt-1" style={{ color: C.soft }}>
                    {store.category || "Lokálny predajca"} · {store.city}
                  </p>
                  <a
                    href={`${currentOrigin}/${selectedStoreHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-1 font-semibold hover:underline inline-flex items-center gap-1"
                    style={{ color: C.accentText }}
                  >
                    {currentHost}/{selectedStoreHandle} ↗
                  </a>
                </section>

                {/* ── Popis obchodu ── */}
                {store.description && store.description.trim() && (
                  <div 
                    className="rounded-2xl p-4 md:p-5 mb-6 text-sm text-left leading-relaxed shadow-xs font-medium border animate-in fade-in duration-300"
                    style={{ 
                      background: C.card, 
                      borderColor: C.line,
                      color: C.ink 
                    }}
                  >
                    <p className="whitespace-pre-wrap">{store.description.trim()}</p>
                  </div>
                )}

                {/* ── Položky ── */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.length === 0 ? (
                    <div className="sm:col-span-2 text-center py-12 rounded-2xl border border-dashed p-6" style={{ borderColor: C.line, background: C.card }}>
                      <p className="text-sm font-medium" style={{ color: C.soft }}>Tento obchod zatiaľ nemá žiadne produkty.</p>
                      <button
                        onClick={() => setView("admin")}
                        className="mt-3 text-xs font-bold underline"
                        style={{ color: C.accentText }}
                      >
                        Pridaj prvý produkt v Nastaveniach
                      </button>
                    </div>
                  ) : (
                    visibleItems.map((it) => (
                      <article key={it.id} className="rounded-2xl flex flex-col h-full overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                        <div onClick={() => setSelectedProductId(it.id)} className="cursor-pointer group flex-1 flex flex-col">
                          <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 border-b shrink-0" style={{ borderColor: C.line }}>
                            {it.img ? (
                              <img src={it.img} alt={it.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-5xl transition-transform duration-300 group-hover:scale-105" style={{ background: getPastelBg(it) }}>
                                {it.emoji || "🎁"}
                              </div>
                            )}
                            
                            {/* Odznaky priamo na fotke v ľavom hornom rohu */}
                            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
                              {it.badge && (
                                <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shadow-sm" style={{ background: C.accentSoft, color: C.accentText }}>
                                  {it.badge}
                                </span>
                              )}
                              {it.type === "booking" && it.left !== undefined && (
                                <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shadow-sm" style={{ background: "#FFF3E6", color: "#B4690E" }}>
                                  {it.left} voľné
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-[#647058] transition-colors">{it.name}</h3>
                              <p className="text-xs mt-1 line-clamp-2" style={{ color: C.soft }}>{it.desc}</p>
                              {it.type === "booking" && it.slot && (
                                <p className="text-[11px] mt-1.5 font-semibold flex items-center gap-1" style={{ color: C.accentText }}>
                                  <span>📅</span> {it.slot}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-4 pb-4 shrink-0">
                          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.line }}>
                            <span className="disp font-extrabold text-base">
                              {eur(it.price)}
                              <span className="text-[10px] font-normal block" style={{ color: C.soft }}>/ {it.unit}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedProductId(it.id)}
                                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors hover:bg-slate-50 shrink-0"
                                style={{ borderColor: C.line, color: C.soft }}
                              >
                                Viac info →
                              </button>
                              {cart[it.id] ? (
                                <div className="flex items-center gap-1 rounded-full p-0.5 border shrink-0" style={{ borderColor: C.line, background: C.bg }}>
                                  <button onClick={() => add(it.id, -1)} className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded-full hover:bg-slate-100 transition-colors" style={{ color: C.soft }}>−</button>
                                  <span className="text-xs font-bold w-4 text-center">{cart[it.id]}</span>
                                  <button onClick={() => add(it.id, 1)} className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded-full hover:bg-slate-100 transition-colors" style={{ color: C.accentText }}>+</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => add(it.id, 1)}
                                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-transform duration-100 active:scale-95 hover:opacity-90 shrink-0"
                                  style={{ background: C.ink }}
                                >
                                  {it.type === "booking" ? "Rezervovať" : "Pridať"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </section>
              </>
            )}

            {/* ── Checkout ── */}
            {checkout && count > 0 && (
              <section className="mt-6 rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                {/* Shopping Cart Item List with More Info button */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="disp font-extrabold text-base text-slate-900">Váš nákupný košík</h2>
                    <button
                      onClick={() => setCheckout(false)}
                      className="text-xs font-bold text-[#647058] hover:underline"
                    >
                      ← Späť do obchodu
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 bg-white rounded-2xl p-3 border shadow-xs" style={{ borderColor: C.line }}>
                    {cartRows.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: C.line }}>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: getPastelBg(it) }}>
                            {it.emoji || "🎁"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs truncate text-slate-800">{it.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px]" style={{ color: C.soft }}>
                                {eur(it.price)} / {it.unit}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedProductId(it.id);
                                  setCheckout(false);
                                }}
                                className="text-[10px] font-bold text-[#647058] hover:underline flex items-center gap-0.5"
                              >
                                Viac info →
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1 rounded-full p-0.5 border" style={{ borderColor: C.line, background: C.bg }}>
                            <button onClick={() => add(it.id, -1)} className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full hover:bg-slate-100 transition-colors" style={{ color: C.soft }}>−</button>
                            <span className="text-xs font-bold w-4 text-center">{it.qty}</span>
                            <button onClick={() => add(it.id, 1)} className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full hover:bg-slate-100 transition-colors" style={{ color: C.accentText }}>+</button>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800 min-w-[50px] text-right">
                            {eur(it.price * it.qty)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 mt-1 border-t font-extrabold text-sm text-slate-900" style={{ borderColor: C.line }}>
                      <span>Celkom na úhradu:</span>
                      <span className="text-base" style={{ color: C.accentText }}>{eur(total)}</span>
                    </div>
                  </div>
                </div>

                <h2 className="disp font-bold mb-3">Tvoje údaje</h2>
                <div className="flex flex-col gap-2">
                  <input value={cust.name} onChange={(e) => { setCust({ ...cust, name: e.target.value }); if (checkoutError) setCheckoutError(""); }} placeholder="Meno a priezvisko *"
                    className="w-full rounded-xl px-3 py-2 text-sm" style={{ border: `1px solid ${checkoutError && !cust.name.trim() ? "#DC2626" : C.line}`, background: C.bg }} />
                  <input value={cust.city} onChange={(e) => { setCust({ ...cust, city: e.target.value }); if (checkoutError) setCheckoutError(""); }} placeholder="Mesto / adresa doručenia *"
                    className="w-full rounded-xl px-3 py-2 text-sm" style={{ border: `1px solid ${checkoutError && !cust.city.trim() ? "#DC2626" : C.line}`, background: C.bg }} />
                  {checkoutError && (
                    <p className="text-xs font-semibold text-red-600 -mt-0.5">⚠️ {checkoutError}</p>
                  )}
                </div>

                {/* ── QR Platba ak má obchod IBAN ── */}
                {store.iban ? (
                  <div className="mt-4 p-4 rounded-xl border border-dashed flex flex-col items-center text-center" style={{ borderColor: C.accent, background: C.accentSoft + "22" }}>
                    <span className="text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded-full mb-2" style={{ background: C.accentSoft, color: C.accentText }}>
                      ⚡ Rýchla QR platba (Prevod)
                    </span>
                    <p className="text-[11px] mb-3" style={{ color: C.soft }}>
                      Naskenuj QR kód v bankovej aplikácii (Payme štandard) pre automatické vyplnenie údajov.
                    </p>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymeUrl)}`}
                      alt="Payme QR kód"
                      className="w-40 h-40 bg-white p-2 rounded-xl border"
                      style={{ borderColor: C.line }}
                    />
                    
                    <div className="w-full mt-3 flex flex-col gap-1.5 text-left text-xs">
                      <div>
                        <span className="font-semibold block" style={{ color: C.soft }}>IBAN príjemcu:</span>
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border text-xs font-mono">
                          <span className="truncate">{store.iban}</span>
                          <button
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(store.iban.replace(/\s+/g, ""));
                                setCopiedIban(true);
                                setTimeout(() => setCopiedIban(false), 2000);
                              }
                            }}
                            className="shrink-0 ml-1.5 font-sans text-[10px] font-bold uppercase text-[#647058] hover:underline"
                          >
                            {copiedIban ? "Skopírované!" : "Kopírovať"}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold block" style={{ color: C.soft }}>Suma:</span>
                          <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border">
                            <span className="font-mono font-bold text-xs truncate">{eur(total)}</span>
                            <button
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(total.toFixed(2));
                                  setCopiedAmount(true);
                                  setTimeout(() => setCopiedAmount(false), 2000);
                                }
                              }}
                              className="shrink-0 ml-1.5 font-sans text-[10px] font-bold uppercase text-[#647058] hover:underline"
                            >
                              {copiedAmount ? "OK" : "Kop"}
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold block" style={{ color: C.soft }}>Variabilný symbol:</span>
                          <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border">
                            <span className="font-mono font-bold text-xs truncate">{orderVs}</span>
                            <button
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(orderVs);
                                  setCopiedVs(true);
                                  setTimeout(() => setCopiedVs(false), 2000);
                                }
                              }}
                              className="shrink-0 ml-1.5 font-sans text-[10px] font-bold uppercase text-[#647058] hover:underline"
                            >
                              {copiedVs ? "OK" : "Kop"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-xl border text-center text-xs text-slate-500 bg-slate-50" style={{ borderColor: C.line }}>
                    ⚠️ Predajca zatiaľ nenastavil IBAN. Platbu prevodom bude potrebné dohodnúť v chate.
                  </div>
                )}

                {/* Signature: živý náhľad WhatsApp správy */}
                <p className="text-xs font-semibold mt-4 mb-1" style={{ color: C.soft }}>Takto bude vyzerať tvoja správa:</p>
                <div className="rounded-2xl p-3" style={{ background: "#E7F8EE", border: `1px solid #CBEBD8` }}>
                  <pre className="text-xs whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "inherit", color: C.waDark }}>{waText}</pre>
                </div>

                <p className="text-xs font-semibold mt-4 mb-2" style={{ color: C.soft }}>
                  Odošli objednávku predajcovi cez:
                </p>
                {(() => {
                  const canCheckout = cartRows.length > 0 && cust.name.trim() && cust.city.trim();
                  const btnStyle = (bg: string): { [k: string]: any } => ({
                    background: bg,
                    cursor: canCheckout ? "pointer" : "not-allowed",
                    opacity: canCheckout ? 1 : 0.5,
                  });
                  return (
                    <div className="flex flex-col gap-2">
                      {waLink && (
                        <a
                          href={canCheckout ? waLink : undefined}
                          target="_blank"
                          rel="noreferrer"
                          onClick={handleCheckout}
                          className="block text-center py-3 rounded-2xl font-bold text-white text-sm transition-transform hover:scale-[1.01]"
                          style={btnStyle("#25D366")}
                        >
                          💬 Pokračovať cez WhatsApp
                        </a>
                      )}
                      {messengerLink && (
                        <a
                          href={canCheckout ? messengerLink : undefined}
                          target="_blank"
                          rel="noreferrer"
                          onClick={handleCheckout}
                          className="block text-center py-3 rounded-2xl font-bold text-white text-sm transition-transform hover:scale-[1.01]"
                          style={btnStyle("#0084FF")}
                        >
                          💬 Pokračovať cez Messenger
                        </a>
                      )}
                      {smsLink && (
                        <a
                          href={canCheckout ? smsLink : undefined}
                          onClick={handleCheckout}
                          className="block text-center py-3 rounded-2xl font-bold text-white text-sm transition-transform hover:scale-[1.01]"
                          style={btnStyle("#7C3AED")}
                        >
                          📱 Poslať cez SMS
                        </a>
                      )}
                      {emailLink && (
                        <a
                          href={canCheckout ? emailLink : undefined}
                          onClick={handleCheckout}
                          className="block text-center py-3 rounded-2xl font-bold text-sm transition-transform hover:scale-[1.01] border-2"
                          style={{ ...btnStyle("transparent"), color: C.ink, borderColor: C.line }}
                        >
                          ✉️ Odoslať emailom
                        </a>
                      )}
                    </div>
                  );
                })()}
                <p className="text-center text-xs mt-3" style={{ color: C.soft }}>
                  Správa sa otvorí predvyplnená — stačí ťuknúť Odoslať.
                </p>
              </section>
            )}

            {/* ── Pätička obchodu s legislatívnym odkazom ── */}
            <footer className="mt-16 pt-8 border-t text-center flex flex-col gap-2" style={{ borderColor: C.line }}>
              <p className="text-xs font-semibold" style={{ color: C.soft }}>
                © {new Date().getFullYear()} {store.name}. Všetky práva vyhradené.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setWithdrawalOpen(true)}
                  className="text-xs font-bold hover:underline cursor-pointer transition-colors hover:text-[#647058]"
                  style={{ color: C.accentText }}
                >
                  Odstúpiť od zmluvy tu
                </button>
              </div>
              <p className="text-[11px] mt-2 font-medium" style={{ color: C.soft }}>
                Vytvorené cez <a href="/" className="hover:underline font-bold text-slate-800">Vitrína</a> · Predajná platforma pre malých tvorcov
              </p>
            </footer>
          </main>
        )) : (
          /* ==================== ADMINISTRÁCIA OBCHODU ==================== */
          <main className="max-w-md lg:max-w-6xl mx-auto w-full px-4 lg:px-6 pb-32 pt-6">
            <button
              onClick={() => setView("shop")}
              className="text-xs font-semibold mb-4 flex items-center gap-1 opacity-70 hover:opacity-100"
              style={{ color: C.soft }}
            >
              ← Späť do obchodu
            </button>

            <h1 className="disp text-xl font-extrabold mb-1">Nastavenia Vitríny</h1>
            <p className="text-sm mb-4" style={{ color: C.soft }}>Zmeny sa uložia okamžite a prenesú sa aj tvojim zákazníkom.</p>

            <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
            <div className="max-w-md lg:max-w-none mx-auto lg:mx-0 w-full">

            <section className="rounded-2xl p-4 mb-4 flex flex-col gap-2" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <label className="text-xs font-semibold" style={{ color: C.soft }}>Názov obchodu</label>
              <input value={store.name} onChange={(e) => updateStoreField("name", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: C.line, background: C.bg }} />
              
              <label className="text-xs font-semibold mt-1" style={{ color: C.soft }}>WhatsApp číslo (kam chodia objednávky)</label>
              <input value={store.phone} onChange={(e) => updateStoreField("phone", e.target.value)}
                placeholder="napr. +421 900 123 456"
                className="w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: C.line, background: C.bg }} />

              <label className="text-xs font-semibold mt-1" style={{ color: C.soft }}>
                Messenger username <span className="text-slate-500 font-normal">(nepovinné)</span>
              </label>
              <input value={(store as any).messengerUsername || ""} onChange={(e) => updateStoreField("messengerUsername", e.target.value)}
                placeholder="napr. janakovacova (z m.me/janakovacova alebo facebook.com/janakovacova)"
                className="w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: C.line, background: C.bg }} />
              <span className="text-[10px] text-slate-500 leading-normal">
                Vyplň iba ak máš Facebook <b>stránku</b> (Page). Osobný profil Messenger link nemá.
              </span>

              <label className="text-xs font-semibold mt-1" style={{ color: C.soft }}>
                Kontaktný email <span className="text-slate-500 font-normal">(nepovinné)</span>
              </label>
              <input value={(store as any).contactEmail || ""} onChange={(e) => updateStoreField("contactEmail", e.target.value)}
                placeholder="napr. jana@gmail.com"
                type="email"
                className="w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: C.line, background: C.bg }} />
              <span className="text-[10px] text-slate-500 leading-normal">
                Ak zákazník nemá WhatsApp/Messenger, môže poslať objednávku emailom.
              </span>

              {/* Warning ak nemá alternatívny kanál (Messenger ani Email) */}
              {!((store as any).messengerUsername || "").trim() && !((store as any).contactEmail || "").trim() && (
                <div className="mt-2 p-3 rounded-xl text-[11px] flex items-start gap-2" style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
                  <span className="text-base leading-none">⚠️</span>
                  <div>
                    <b>Odporúčame pridať aspoň jeden alternatívny kanál.</b> Nie každý zákazník má WhatsApp. Vyplň si Messenger alebo Kontaktný email vyššie — zvýšiš tým počet objednávok, ktoré k tebe dorazia.
                  </div>
                </div>
              )}

              <label className="text-xs font-semibold mt-1" style={{ color: C.soft }}>Mesto</label>
              <input value={store.city} onChange={(e) => updateStoreField("city", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: C.line, background: C.bg }} />

              <label className="text-xs font-semibold mt-1" style={{ color: C.soft }}>Kategória obchodu</label>
              <select value={CATEGORIES.includes(store.category) ? store.category : "Iné"} onChange={(e) => {
                const val = e.target.value;
                if (val === "Iné") {
                  updateStoreField("category", "");
                } else {
                  updateStoreField("category", val);
                }
              }}
                className="w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: C.line, background: C.bg }}>
                {CATEGORIES.filter(c => c !== "Iné").map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Iné">Iná kategória (vlastná)...</option>
              </select>

              {(!CATEGORIES.includes(store.category) || store.category === "") && (
                <input value={store.category || ""} onChange={(e) => updateStoreField("category", e.target.value)}
                  placeholder="Napr. Sójové sviečky, Výšivky, Ateliér..."
                  className="w-full mt-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: C.line, background: C.bg }} />
              )}

              <label className="text-xs font-semibold mt-1" style={{ color: C.soft }}>IBAN pre platby prevodom (QR kód)</label>
              <input value={store.iban} onChange={(e) => updateStoreField("iban", e.target.value.toUpperCase())}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono border animate-none" placeholder="Napr. SK12..." style={{ borderColor: C.line, background: C.bg }} />

              <label className="text-xs font-semibold mt-2.5" style={{ color: C.soft }}>Logo obchodu</label>
              <div className="flex items-center gap-3 mt-1 p-1">
                <StoreLogo logo={store.logo} name={store.name} className="w-12 h-12 rounded-xl text-xl shrink-0 animate-none" />
                <div className="flex flex-col gap-1">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 transition-colors inline-block text-center" style={{ borderColor: C.line }}>
                    Nahrať logo 📁
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden animate-none"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          readAsDataURL(file, (dataUrl) => {
                            updateStoreField("logo", dataUrl);
                          });
                        }
                      }}
                    />
                  </label>
                  {store.logo && (
                    <button
                      onClick={() => updateStoreField("logo", "")}
                      className="text-[10px] text-red-500 hover:underline font-bold text-left animate-none"
                    >
                      Odstrániť logo
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                <label className="text-xs font-semibold" style={{ color: C.soft }}>Popis obchodu</label>
                <span className="text-[10px] font-bold text-slate-500">
                  {((store as any).description || "").length}/400 znakov
                </span>
              </div>
              <textarea
                value={(store as any).description || ""}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 400);
                  updateStoreField("description", val);
                }}
                rows={3}
                placeholder="Napr. Sme malá rodinná dielňa na severe Slovenska. Vyrábame ručne liate sviečky zo sójového vosku s tými najkrajšími vôňami..."
                className="w-full rounded-xl px-3 py-2 text-sm border resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{ borderColor: C.line, background: C.bg }}
              />
            </section>

            <AddItem
              disabled={hasReachedItemLimit} 
              limitMessage={limitMessage}
              onAdd={async (it) => {
              try {
                setDbError("");
                const itemId = `${selectedStoreHandle}_${Date.now()}`;
                await setDoc(doc(db, "items", itemId), {
                  id: itemId,
                  storeId: selectedStoreHandle,
                  name: it.name,
                  desc: it.desc,
                  price: it.price,
                  unit: it.unit,
                  type: it.type,
                  imgUrl: it.img || "",                              // Legacy pre kompatibilitu
                  imgUrls: (it.imgs || []).filter(Boolean),         // Nové pole s viacerými fotkami
                  slot: it.slot || "",
                  leftCapacity: it.left ?? 0,
                  badge: it.badge || null,
                  emoji: it.emoji,
                  longDesc: it.longDesc || ""
                });
              } catch (err: any) {
                console.error("Error adding item:", err);
                setDbError("Nepodarilo sa pridať produkt: " + err.message + ". Skús to znova alebo použi menšiu fotku.");
              }
            }} />

            </div>

            <div className="max-w-md lg:max-w-none mx-auto lg:mx-0 w-full">

            {/* ── Predplatné a Plán ── */}
            <section className="rounded-2xl p-4 mb-4 flex flex-col gap-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div>
                <h2 className="disp text-sm font-extrabold text-slate-800">Predplatné a plán</h2>
                <p className="text-xs text-slate-500 mt-0.5">Správa vášho plánu a limitov obchodu.</p>
              </div>

              {/* Status banner */}
              {planActive ? (
                <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534" }}>
                  <span className="text-lg leading-none">✅</span>
                  <div>
                    <span className="font-extrabold block">Aktívny plán: {store.plan === "standard" ? "Štandard (8 €/mes)" : "Rozšírený (10 €/mes)"}</span>
                    <span className="block mt-0.5 font-medium opacity-90">
                      Váš obchod je aktívny s limitom <strong>{store.plan === "standard" ? 2 : 6} produktov</strong>. Plán platí do <strong>{new Date(store.planEndsAt).toLocaleDateString("sk-SK")}</strong> ({planDaysLeft} {planDaysLeft === 1 ? "deň" : "dní"}).
                    </span>
                  </div>
                </div>
              ) : isTrialActive ? (
                <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5" style={{ background: C.accentSoft, border: `1px solid ${C.accent}55`, color: C.ink }}>
                  <span className="text-lg leading-none">⏱️</span>
                  <div>
                    <span className="font-extrabold block">Skúšobná doba (10-dňový Trial)</span>
                    <span className="block mt-0.5 font-medium opacity-90">
                      Zostáva vám <strong>{trialDaysLeft} {trialDaysLeft === 1 ? "deň" : trialDaysLeft < 5 ? "dni" : "dní"}</strong>. Môžete mať vystavených až 6 aktívnych produktov súčasne.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B" }}>
                  <span className="text-lg leading-none">⚠️</span>
                  <div>
                    <span className="font-extrabold block">Skúšobná doba vypršala!</span>
                    <span className="block mt-0.5 font-medium opacity-90">
                      Váš obchod je momentálne skrytý pre zákazníkov. Vyberte plán a nahláste platbu podľa pokynov nižšie.
                    </span>
                  </div>
                </div>
              )}

              {/* Grid of plans */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                {/* Plán Štandard */}
                <button
                  onClick={() => updateStoreField("plan", "standard")}
                  className={`p-3 rounded-xl text-left border flex flex-col gap-2 transition-all ${
                    store.plan === "standard"
                      ? "ring-2 ring-indigo-600 bg-indigo-50/20"
                      : "hover:bg-slate-50"
                  }`}
                  style={{ borderColor: store.plan === "standard" ? C.accent : C.line }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-extrabold text-xs text-slate-800">Štandard</span>
                    {store.plan === "standard" && (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.accent }} />
                    )}
                  </div>
                  <div>
                    <span className="disp text-lg font-black block text-slate-900 leading-none">8 €</span>
                    <span className="text-[10px] text-slate-500 font-medium">/ mesiac</span>
                  </div>
                  <div className="border-t pt-2 w-full text-[10px] text-slate-500 font-semibold leading-normal" style={{ borderColor: C.line }}>
                    • Max 2 produkty
                  </div>
                </button>

                {/* Plán Rozšírený */}
                <button
                  onClick={() => updateStoreField("plan", "extended")}
                  className={`p-3 rounded-xl text-left border flex flex-col gap-2 transition-all ${
                    store.plan === "extended"
                      ? "ring-2 ring-indigo-600 bg-indigo-50/20"
                      : "hover:bg-slate-50"
                  }`}
                  style={{ borderColor: store.plan === "extended" ? C.accent : C.line }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-extrabold text-xs text-slate-800">Rozšírený</span>
                    {store.plan === "extended" && (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.accent }} />
                    )}
                  </div>
                  <div>
                    <span className="disp text-lg font-black block text-slate-900 leading-none">10 €</span>
                    <span className="text-[10px] text-slate-500 font-medium">/ mesiac</span>
                  </div>
                  <div className="border-t pt-2 w-full text-[10px] text-slate-500 font-semibold leading-normal" style={{ borderColor: C.line }}>
                    • Max 6 produktov
                  </div>
                </button>
              </div>

              {/* Pokyny na platbu — zobrazia sa iba ak už netreba čakať:
                  (a) trial skončil ALEBO
                  (b) trial už má menej ako 4 dni (aby si predajca stihol zaplatiť pred koncom) */}
              {store.plan && !planActive && (!isTrialActive || trialDaysLeft <= 3) && (() => {
                const suma = store.plan === "standard" ? "8.00" : "10.00";
                const nazovPlanu = store.plan === "standard" ? "Štandard" : "Rozšírený";
                const cistyIban = (company.iban || "").replace(/\s+/g, "").toUpperCase();
                const paymentPaymeUrl = cistyIban
                  ? `https://payme.sk?v=1&iban=${cistyIban}&amount=${suma}&currency=EUR&vs=${paymentVs}&desc=${encodeURIComponent(`Vitrina ${nazovPlanu}`)}`
                  : "";
                const paymentReported = !!(store as any).paymentReported;
                return (
                  <div className="mt-3 p-4 rounded-2xl border border-dashed flex flex-col items-center text-center" style={{ borderColor: C.accent, background: C.accentSoft + "22" }}>
                    <span className="text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded-full mb-2" style={{ background: C.accentSoft, color: C.accentText }}>
                      💳 Aktivujte plán {nazovPlanu} ({suma} €/mes)
                    </span>
                    <p className="text-[11px] mb-3 max-w-sm" style={{ color: C.soft }}>
                      Zaplaťte prevodom na náš účet. Váš stály variabilný symbol je <strong>{paymentVs}</strong> — používajte ho pri každej mesačnej platbe. Po prevode kliknite „Nahlásiť platbu" — obvykle aktivujeme <strong>do niekoľkých hodín</strong> (pracovné dni 8–20 h).
                    </p>

                    {cistyIban ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentPaymeUrl)}`}
                        alt="QR kód pre platbu predplatného"
                        className="w-40 h-40 bg-white p-2 rounded-xl border"
                        style={{ borderColor: C.line }}
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center rounded-xl border bg-white text-[10px] text-slate-500 text-center p-3" style={{ borderColor: C.line }}>
                        (Administrátor Vitríny ešte nedoplnil IBAN v Admin → Údaje firmy.)
                      </div>
                    )}

                    <div className="w-full mt-3 grid grid-cols-1 gap-1.5 text-left text-xs">
                      <div>
                        <span className="font-semibold block" style={{ color: C.soft }}>IBAN príjemcu (Vitrína):</span>
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border text-xs font-mono">
                          <span className="truncate">{company.iban || "(nedoplnené)"}</span>
                          {company.iban && (
                            <button
                              onClick={() => { navigator.clipboard?.writeText(cistyIban); }}
                              className="shrink-0 ml-1.5 font-sans text-[10px] font-bold uppercase text-[#647058] hover:underline"
                            >
                              Kopírovať
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span className="font-semibold block" style={{ color: C.soft }}>Suma:</span>
                          <div className="bg-white px-2.5 py-1.5 rounded-lg border font-mono text-xs">{suma} €</div>
                        </div>
                        <div>
                          <span className="font-semibold block" style={{ color: C.soft }}>Variabilný symbol:</span>
                          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border font-mono text-xs">
                            <span>{paymentVs}</span>
                            <button
                              onClick={() => { navigator.clipboard?.writeText(paymentVs); }}
                              className="shrink-0 ml-1.5 font-sans text-[10px] font-bold uppercase text-[#647058] hover:underline"
                            >
                              Kop
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {paymentReported ? (
                      <div className="mt-4 w-full p-2.5 rounded-xl text-[11px]" style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
                        <div className="font-bold mb-1">⏳ Nahlásili ste platbu{(store as any).paymentReportedAt ? " dňa " + new Date((store as any).paymentReportedAt).toLocaleString("sk-SK") : ""}.</div>
                        <div className="font-medium">Overujeme platbu v banke a aktivujeme obvykle do niekoľkých hodín. Ak potrebujete okamžite, napíšte na <a href="mailto:info@zavio.sk" className="underline">info@zavio.sk</a>.</div>
                      </div>
                    ) : (
                      <button
                        onClick={reportPayment}
                        disabled={reportingPayment || !cistyIban}
                        className="mt-4 w-full px-4 py-2.5 rounded-xl text-white font-bold text-xs disabled:opacity-60"
                        style={{ background: C.accent }}
                      >
                        {reportingPayment ? "Odosielam…" : "✅ Nahlásiť platbu"}
                      </button>
                    )}
                  </div>
                );
              })()}
            </section>

            {/* ── Sekcia Objednávky v Administrácii ── */}
            <section className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="disp text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Objednávky a odstúpenia ({adminOrders.length})
                </h2>
                {adminOrders.some(o => o.status === "Žiadosť o odstúpenie") && (
                  <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                    ⚠️ Žiadosť o odstúpenie
                  </span>
                )}
              </div>

              {adminOrders.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-dashed p-4" style={{ borderColor: C.line, background: C.card }}>
                  <p className="text-xs font-medium" style={{ color: C.soft }}>Zatiaľ tu nie sú žiadne objednávky.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {adminOrders.map((ord) => {
                    const hasWithdrawal = ord.status === "Žiadosť o odstúpenie";
                    const orderDate = ord.createdAt?.toDate ? ord.createdAt.toDate().toLocaleString("sk-SK") : new Date(ord.createdAt || 0).toLocaleString("sk-SK");
                    
                    return (
                      <div 
                        key={ord.id} 
                        className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                          hasWithdrawal 
                            ? "bg-red-50/40 border-red-200" 
                            : "bg-white"
                        }`}
                        style={{ 
                          borderColor: hasWithdrawal ? undefined : C.line,
                          background: hasWithdrawal ? undefined : C.card 
                        }}
                      >
                        {/* Hlavička objednávky */}
                        <div className="flex items-start justify-between gap-2 border-b pb-2.5" style={{ borderColor: C.line }}>
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900 block">
                              #ID: {ord.id}
                            </span>
                            {ord.variabilnySymbol && (
                              <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                                VS (variabilný symbol): <strong>{ord.variabilnySymbol}</strong>
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {orderDate}
                            </span>
                          </div>
                          
                          {/* Výber statusu */}
                          <div className="flex flex-col items-end gap-1.5">
                            <select
                              value={ord.status || "Nová"}
                              onChange={async (e) => {
                                try {
                                  setDbError("");
                                  await setDoc(doc(db, "orders", ord.id), {
                                    ...ord,
                                    status: e.target.value
                                  });
                                } catch (err: any) {
                                  console.error("Error updating order status:", err);
                                  setDbError("Nepodarilo sa zmeniť stav objednávky: " + err.message);
                                }
                              }}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                                hasWithdrawal 
                                  ? "bg-red-100 text-red-800 border-red-300" 
                                  : ord.status === "Vybavená"
                                    ? "bg-green-50 text-green-800 border-green-200"
                                    : ord.status === "Zrušená" || ord.status === "Odstúpené - vrátené peniaze"
                                      ? "bg-slate-100 text-slate-600 border-slate-200"
                                      : "bg-indigo-50 text-indigo-800 border-indigo-200"
                              }`}
                            >
                              <option value="Nová">Nová</option>
                              <option value="Zaplatená">Zaplatená</option>
                              <option value="Vybavená">Vybavená</option>
                              <option value="Žiadosť o odstúpenie">Žiadosť o odstúpenie ⚠️</option>
                              <option value="Odstúpené - vrátené peniaze">Odstúpené (vrátené peniaze)</option>
                              <option value="Zrušená">Zrušená</option>
                            </select>
                          </div>
                        </div>

                        {/* Položky a celková cena */}
                        <div className="text-xs">
                          <p className="font-bold text-slate-700 mb-1">Objednané položky:</p>
                          <div className="flex flex-col gap-1 text-slate-600">
                            {ord.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center py-0.5">
                                <span>
                                  {item.name} <strong className="text-slate-800">({item.qty}x)</strong>
                                  {item.slot && <span className="block text-[10px] text-slate-500">📅 {item.slot}</span>}
                                </span>
                                <span className="font-mono">{eur(item.price * item.qty)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center border-t pt-2 mt-2 font-extrabold text-slate-900">
                            <span>Celkom:</span>
                            <span className="text-sm font-mono">{eur(ord.total || 0)}</span>
                          </div>
                        </div>

                        {/* Informácie o zákazníkovi */}
                        <div className="text-xs p-2.5 rounded-xl bg-slate-50 border flex flex-col gap-1 text-slate-600" style={{ borderColor: C.line }}>
                          <p className="font-bold text-slate-800 text-[11px] mb-0.5">👤 Zákazník:</p>
                          <p><strong>Meno:</strong> {ord.customerName || "—"}</p>
                          <p><strong>Adresa:</strong> {ord.customerCity || "—"}</p>
                          {ord.customerTime && <p><strong>Čas doručenia:</strong> {ord.customerTime}</p>}
                        </div>

                        {/* ⚠️ DETAIL ODSTÚPENIA OD ZMLUVY */}
                        {hasWithdrawal && (
                          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs flex flex-col gap-1.5 animate-in fade-in duration-200">
                            <div className="flex items-center gap-1.5 text-red-900 font-extrabold">
                              <span className="text-sm leading-none">⚠️</span>
                              <span>SPOTREBITEĽ ODSTÚPIL OD ZMLUVY</span>
                            </div>
                            <p className="text-red-800">
                              Zákazník podal žiadosť o odstúpenie od zmluvy k tejto objednávke v zmysle § 20a zákona č. 108/2024 Z.z.
                            </p>
                            <div className="grid grid-cols-1 gap-1 text-red-950 mt-1 pt-1.5 border-t border-red-200">
                              <p><strong>Meno spotrebiteľa:</strong> {ord.withdrawalName || "—"}</p>
                              <p><strong>E-mail pre kontakt:</strong> <a href={`mailto:${ord.withdrawalEmail}`} className="underline hover:text-[#647058] font-bold">{ord.withdrawalEmail}</a></p>
                              <p><strong>Dátum doručenia odstúpenia:</strong> {ord.withdrawalDate ? new Date(ord.withdrawalDate).toLocaleString("sk-SK") : "—"}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-4 flex flex-col gap-2">
              <h2 className="disp text-xs font-extrabold uppercase tracking-wider mb-1" style={{ color: C.soft }}>
                Zoznam produktov ({items.length})
              </h2>
              {items.length > maxItemsAllowed && (
                <div className="p-3 text-xs rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-medium animate-in fade-in slide-in-from-top-2">
                  ⚠️ Váš plán umožňuje zobraziť len <strong>{maxItemsAllowed}</strong> {maxItemsAllowed === 2 ? "aktívne produkty" : "aktívnych produktov"}. 
                  Zákazníci uvidia len prvých {maxItemsAllowed} produktov z vášho zoznamu. Zvoľte si prosím vyšší plán alebo skryte/vymažte nadbytočné produkty.
                </div>
              )}
              {items.map((it) => (
                <div key={it.id} className="flex flex-col gap-1.5 p-1 rounded-xl" style={{ border: `1px solid ${C.line}`, background: C.card }}>
                  <div className="px-2 py-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      {it.img ? (
                        <img src={it.img} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <span className="text-lg shrink-0">{it.emoji}</span>
                      )}
                      <span className="truncate">{it.name} · <b>{eur(it.price)}</b></span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          setEditingItemId(it.id);
                          setEditFields({
                            name: it.name,
                            desc: it.desc,
                            longDesc: it.longDesc || "",
                            price: it.price.toString(),
                            slot: it.slot || ""
                          });
                        }}
                        className="text-xs font-semibold flex items-center gap-0.5"
                        style={{ color: C.accentText }}
                      >
                        ✏️ Upraviť
                      </button>
                      <label className="text-xs font-semibold cursor-pointer" style={{ color: C.soft }}>
                        📷 Fotka
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            if (!file) return;
                            readAsDataURL(file, async (url) => {
                              try {
                                setDbError("");
                                await setDoc(doc(db, "items", it.id), { imgUrl: url }, { merge: true });
                              } catch (err: any) {
                                console.error("Error updating item photo:", err);
                                setDbError("Nepodarilo sa uložiť fotku: " + err.message);
                              }
                            });
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button onClick={async () => {
                        try {
                          setDbError("");
                          await deleteDoc(doc(db, "items", it.id));
                        } catch (err: any) {
                          console.error("Error deleting item:", err);
                          setDbError("Chyba pri mazaní produktu: " + err.message);
                        }
                      }} className="text-xs font-semibold" style={{ color: "#C2410C" }}>
                        Odstrániť
                      </button>
                    </span>
                  </div>

                  {/* Inline Editor Form */}
                  {editingItemId === it.id && (
                    <div className="mx-2 mb-2 p-3 rounded-lg border bg-slate-50 flex flex-col gap-2" style={{ borderColor: C.line }}>
                      <span className="text-xs font-bold" style={{ color: C.ink }}>Upraviť detaily</span>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editFields.name}
                          onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                          placeholder="Názov"
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs border"
                          style={{ borderColor: C.line, background: "#fff" }}
                        />
                        <input
                          type="text"
                          value={editFields.desc}
                          onChange={(e) => setEditFields({ ...editFields, desc: e.target.value })}
                          placeholder="Doplňujúce info / krátky popis (napr. Vôňa: škorica)"
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs border"
                          style={{ borderColor: C.line, background: "#fff" }}
                        />
                        <textarea
                          value={editFields.longDesc}
                          onChange={(e) => setEditFields({ ...editFields, longDesc: e.target.value })}
                          placeholder="Podrobný popis pre detail produktu"
                          rows={3}
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs border resize-none"
                          style={{ borderColor: C.line, background: "#fff" }}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editFields.price}
                            onChange={(e) => setEditFields({ ...editFields, price: e.target.value })}
                            placeholder="Cena v €"
                            className="w-full rounded-lg px-2.5 py-1.5 text-xs border"
                            style={{ borderColor: C.line, background: "#fff" }}
                          />
                          {it.type === "booking" && (
                            <input
                              type="text"
                              value={editFields.slot}
                              onChange={(e) => setEditFields({ ...editFields, slot: e.target.value })}
                              placeholder="Termín"
                              className="w-full rounded-lg px-2.5 py-1.5 text-xs border"
                              style={{ borderColor: C.line, background: "#fff" }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end mt-1">
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-white hover:bg-slate-100 transition-colors"
                          style={{ borderColor: C.line }}
                        >
                          Zrušiť
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              setDbError("");
                              await setDoc(
                                doc(db, "items", it.id),
                                {
                                  name: editFields.name.trim(),
                                  desc: editFields.desc.trim(),
                                  longDesc: editFields.longDesc.trim(),
                                  price: parseFloat(editFields.price) || 0,
                                  slot: editFields.slot
                                },
                                { merge: true }
                              );
                              setEditingItemId(null);
                            } catch (err: any) {
                              console.error("Error updating item details:", err);
                              setDbError("Nepodarilo sa uložiť zmeny: " + err.message);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-opacity"
                          style={{ background: C.accent }}
                        >
                          Uložiť zmeny
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>

            </div>
            </div>

            {/* Vymazanie Vitríny — možnosť začať odznova. Zámerne až úplne dole, mimo 2-stĺpcového gridu, aby to nebola prvá vec, ktorú predajca vidí. */}
            <section className="mt-10 pt-6 border-t max-w-md lg:max-w-none mx-auto lg:mx-0" style={{ borderColor: C.line }}>
              <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 flex flex-col gap-2.5 lg:max-w-md">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Chcete začať odznova?</h3>
                  <p className="text-xs mt-0.5" style={{ color: C.soft }}>
                    Ak ste sa pri zakladaní pomýlili, chcete úplne zmeniť ponuku produktov, alebo si jednoducho chcete túto Vitrínu založiť odznova, môžete ju spolu so všetkými produktmi vymazať z databázy. V ďalšom kroku vás ešte raz necháme potvrdiť, keďže ide o nenávratný krok.
                  </p>
                </div>
                {confirmDeleteStore ? (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={async () => {
                        try {
                          setDbError("");
                          // 1. Delete all items belonging to this store
                          for (const it of items) {
                            await deleteDoc(doc(db, "items", it.id));
                          }
                          // 2. Delete the store itself
                          await deleteDoc(doc(db, "stores", selectedStoreHandle));
                          // 3. Reset states and return to home portal
                          selectStore(null);
                          setConfirmDeleteStore(false);
                        } catch (err: any) {
                          console.error("Error deleting store:", err);
                          setDbError("Nepodarilo sa zmazať obchod: " + err.message);
                        }
                      }}
                      className="flex-1 py-2 rounded-xl text-white text-xs font-bold bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      Áno, naozaj zmazať
                    </button>
                    <button
                      onClick={() => setConfirmDeleteStore(false)}
                      className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300 transition-colors"
                    >
                      Zrušiť
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteStore(true)}
                    className="self-start text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition-colors"
                  >
                    🗑️ Vymazať túto Vitrínu a začať odznova
                  </button>
                )}
              </div>
            </section>
          </main>
        )
      )}

      {/* ── Plávajúci košík ── */}
      {selectedStoreHandle && view === "shop" && count > 0 && !checkout && (
        <button
          onClick={() => {
            setCheckout(true);
            setSelectedProductId(null);
          }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 rounded-full text-white font-bold shadow-lg transition-transform hover:scale-[1.03] z-40"
          style={{ background: C.accent }}
        >
          🛒 {count} {count === 1 ? "položka" : count < 5 ? "položky" : "položiek"} · {eur(total)} → Pokladňa
        </button>
      )}

      {/* ==================== ONBOARDING WIZARD DIALOG ==================== */}
      {/* Guard: 1 účet = 1 obchod. Ak už má obchod, wizard neotvoríme. */}
      {wizardOpen && userStores.length >= 1 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-5xl text-center mb-3">🎉</div>
            <h3 className="text-lg font-black text-center text-slate-800">Váš obchod je pripravený!</h3>
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              Vaša Vitrína je vytvorená. Vstúpte do svojho obchodu a začnite pridávať produkty, ktoré chcete predávať.
            </p>
            <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
              Jeden účet = jeden obchod. Ak chcete predávať v úplne inej kategórii, vytvorte si nový účet s iným emailom.
            </p>
            <button
              onClick={() => { setWizardOpen(false); navigateTo("/app"); }}
              className="mt-5 w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: C.accent }}
            >
              Vstúpiť do môjho obchodu →
            </button>
          </div>
        </div>
      )}
      {wizardOpen && userStores.length === 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col transition-all">
            
            {/* Header (skryté v kroku 5 — úspešná obrazovka má vlastný nadpis nižšie, aby sa text neduplikoval) */}
            {wizardStep <= 4 && (
              <div className="p-6 border-b flex flex-col relative" style={{ borderColor: C.line }}>
                <button
                  onClick={() => setWizardOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center text-sm transition-all border border-slate-100"
                >
                  ✕
                </button>

                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: C.soft }}>
                    {`Krok ${wizardStep} z 4 · Zostáva ~2 minúty`}
                  </span>
                  <h2 className="disp text-xl font-extrabold mt-1 text-slate-900 leading-tight">
                    {wizardStep === 1 && "Pomenujte svoj obchod"}
                    {wizardStep === 2 && "Zadajte kontaktné údaje"}
                    {wizardStep === 3 && "Kam vám pošleme peniaze?"}
                    {wizardStep === 4 && "Skontrolujte a spustite"}
                  </h2>
                  <p className="text-xs mt-1.5 leading-relaxed text-slate-500">
                    {wizardStep === 1 && "Názov a unikátny odkaz, pod ktorým vás zákazníci nájdu na internete."}
                    {wizardStep === 2 && "Telefónne číslo na WhatsApp, kam vám budú chodiť objednávky, a vaše mesto doručenia."}
                    {wizardStep === 3 && "Bankový účet (IBAN), na ktorý vám od zákazníkov prídu platby cez rýchly QR kód."}
                    {wizardStep === 4 && "Už len skontrolujte, či je všetko správne a môžeme vytvoriť váš obchod."}
                  </p>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {wizardStep <= 4 && (
              <div className="px-6 pt-5 pb-1 bg-white">
                <div className="relative flex items-center justify-between mb-2">
                  <div className="absolute left-4 right-4 top-[14px] h-0.5 bg-slate-100 -translate-y-1/2 -z-10">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        background: C.accent,
                        width: `${((wizardStep - 1) / 3) * 100}%`
                      }}
                    />
                  </div>
                  {[
                    { num: 1, name: "Identita" },
                    { num: 2, name: "Kontakt" },
                    { num: 3, name: "Platba" },
                    { num: 4, name: "Spustenie" }
                  ].map((s) => {
                    const isCompleted = s.num < wizardStep;
                    const isActive = s.num === wizardStep;
                    return (
                      <div key={s.num} className="flex flex-col items-center flex-1 relative z-10">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-xs"
                          style={{
                            background: isCompleted ? C.accent : isActive ? C.ink : "#fff",
                            color: isCompleted || isActive ? "#fff" : "#94A3B8",
                            border: `2px solid ${isCompleted ? C.accent : isActive ? C.ink : "#E2E8F0"}`
                          }}
                        >
                          {isCompleted ? "✓" : s.num}
                        </div>
                        <span
                          className="text-[10px] font-bold mt-1 transition-colors duration-300"
                          style={{ color: isActive ? C.ink : isCompleted ? C.accent : "#94A3B8" }}
                        >
                          {s.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Wizard Steps Content */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]">
              
              {/* KROK 1: IDENTITA */}
              {wizardStep === 1 && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-800">Názov obchodu *</label>
                    <input
                      type="text"
                      placeholder="Mila Sviečky"
                      value={newStore.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        if (handleManuallyEdited) {
                          setNewStore({ ...newStore, name });
                        } else {
                          const autoHandle = name
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "") // odstráni diakritiku (á -> a, č -> c, ...)
                            .replace(/\s+/g, "-") // medzery -> pomlčka
                            .replace(/[^a-z0-9-]/g, "") // zvyšné nepovolené znaky preč
                            .replace(/-+/g, "-") // viac pomlčiek za sebou -> jedna
                            .replace(/^-+|-+$/g, ""); // orezanie pomlčiek na okrajoch
                          setNewStore({ ...newStore, name, handle: autoHandle });
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border text-sm focus:border-indigo-600 bg-slate-50 transition-colors"
                      style={{ borderColor: C.line }}
                    />
                    <div className="mt-1 text-[10px]">
                      {!newStore.name.trim() ? (
                        <span className="text-orange-600 font-semibold flex items-center gap-1">
                          ⚠️ Názov obchodu je povinný údaj.
                        </span>
                      ) : (
                        <p className="text-slate-500 leading-normal">
                          Zákazníci uvidia tento názov v záhlaví vášho obchodu a v doručených WhatsApp správach.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-800">Odkaz na váš obchod (handle) *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-xs select-none opacity-40 font-mono">/</span>
                      <input
                        type="text"
                        placeholder="milasviecky"
                        value={newStore.handle}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const cleaned = raw.toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "") // removes accents (á -> a, č -> c, etc.)
                            .replace(/\s+/g, "") // removes all spaces entirely
                            .replace(/[^a-z0-9-]/g, ""); // removes non-alphanumeric except dash
                          setHandleManuallyEdited(true);
                          setNewStore({ ...newStore, handle: cleaned });
                        }}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border text-sm font-mono focus:border-indigo-600 bg-slate-50 transition-colors"
                        style={{ borderColor: C.line }}
                      />
                    </div>
                    
                    {/* Real-time check feedback */}
                    <div className="mt-1 text-[10px]">
                      {newStore.handle ? (
                        handleIsTaken ? (
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            ❌ Tento odkaz je už obsadený, skús iný.
                          </span>
                        ) : handleIsReserved ? (
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            ❌ Tento názov je rezervovaný systémom, skús iný.
                          </span>
                        ) : !handleIsValid ? (
                          <span className="text-orange-600 font-semibold flex items-center gap-1">
                            ⚠️ Minimálne 3 znaky (malé písmená, čísla, pomlčky).
                          </span>
                        ) : (
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            ✓ Dostupné — vaša predajňa bude umiestnená tu.
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500 leading-normal">
                          Unikátny internetový odkaz pre vašu vitrínu. Zákazníkov sem môžete nasmerovať napríklad z Instagram Bio.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* KROK 2: KONTAKT */}
              {wizardStep === 2 && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-800">WhatsApp číslo *</label>
                    <input
                      type="tel"
                      placeholder="+421900123456"
                      value={newStore.phone}
                      onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border text-sm focus:border-indigo-600 bg-slate-50 transition-colors"
                      style={{ borderColor: C.line }}
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Telefónne číslo priradené k vášmu WhatsAppu vrátane slovenskej predvoľby +421. Na toto číslo vám prídu hotové objednávky od zákazníkov.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-800">Mesto pôsobenia *</label>
                    <input
                      type="text"
                      placeholder="Prešov"
                      value={newStore.city}
                      onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border text-sm focus:border-indigo-600 bg-slate-50 transition-colors"
                      style={{ borderColor: C.line }}
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Mesto, kde vyrábate alebo predávate svoje výrobky. Pomáha budovať dôveru u miestnych nakupujúcich.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-800">Kategória obchodu *</label>
                    <select
                      value={CATEGORIES.includes(newStore.category) ? newStore.category : "Iné"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Iné") {
                          setNewStore({ ...newStore, category: "" });
                        } else {
                          setNewStore({ ...newStore, category: val });
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border text-sm focus:border-indigo-600 bg-slate-50 transition-colors"
                      style={{ borderColor: C.line }}
                    >
                      <option value="" disabled>Vyberte kategóriu...</option>
                      {CATEGORIES.filter(c => c !== "Iné").map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Iné">Iná kategória (vlastná)...</option>
                    </select>
                    
                    {(!CATEGORIES.includes(newStore.category) || newStore.category === "") && (
                      <input
                        type="text"
                        placeholder="Napr. Sójové sviečky, Výšivky, Ateliér..."
                        value={newStore.category}
                        onChange={(e) => setNewStore({ ...newStore, category: e.target.value })}
                        className="w-full mt-2 px-4 py-3 rounded-xl border text-sm focus:border-indigo-600 bg-slate-50 transition-colors"
                        style={{ borderColor: C.line }}
                      />
                    )}
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Zákazníci uvidia túto kategóriu v hlavičke vášho obchodu.
                    </p>
                  </div>
                </div>
              )}

              {/* KROK 3: PLATBA */}
              {wizardStep === 3 && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-800">IBAN pre priame platby *</label>
                    <input
                      type="text"
                      placeholder="SK12 0000 0000 0000 1234 5678"
                      value={newStore.iban}
                      onChange={(e) => setNewStore({ ...newStore, iban: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border text-sm font-mono focus:border-indigo-600 bg-slate-50 uppercase transition-colors"
                      style={{ borderColor: C.line }}
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Sem prídu platby od zákazníkov cez QR kód. V pokladni sa automaticky vytvorí bankový QR kód (Payme štandard) pre okamžitú bezchybnú úhradu.
                    </p>
                  </div>
                </div>
              )}

              {/* KROK 4: SPUSTENIE */}
              {wizardStep === 4 && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border" style={{ borderColor: C.line }}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Prehľad obchodu</span>
                    
                    <div className="flex flex-col gap-4 text-xs">
                      <div className="flex items-start gap-3">
                        <img
                          src={defaultLogo}
                          alt="Náhľad obchodu"
                          className="w-10 h-10 rounded-xl object-cover bg-white border shrink-0"
                          style={{ borderColor: C.line }}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Identita</span>
                          <strong className="text-sm font-bold text-slate-800 block leading-tight">{newStore.name}</strong>
                          <span className="text-[11px] font-mono text-[#647058] block mt-0.5 truncate max-w-full">
                            {currentHost}/{sanitizedHandle}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: C.line }}>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">WhatsApp číslo</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">{newStore.phone || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Mesto pôsobenia</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">{newStore.city || "—"}</span>
                        </div>
                      </div>

                      <div className="border-t pt-3" style={{ borderColor: C.line }}>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Bankový IBAN</span>
                        <span className="font-mono font-semibold text-slate-700 block break-all uppercase mt-0.5">{newStore.iban || "—"}</span>
                        <p className="text-[9px] text-slate-500 mt-1">
                          Zákazníci budú platiť priamo na váš účet pomocou automaticky generovaného QR kódu.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal text-center px-2">
                    Po kliknutí na Spustiť vám automaticky pridáme 4 predvolené ukážkové výrobky (sviečky, workshopy), ktoré môžete ihneď upraviť alebo zmazať.
                  </p>
                </div>
              )}

              {/* KROK 5: ÚSPEŠNE VYTVORENÉ */}
              {wizardStep === 5 && (
                <div className="text-center py-4 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mb-4">
                    🎉
                  </div>
                  <h3 className="disp text-xl font-extrabold mb-2">Vitrína je pripravená!</h3>
                  <p className="text-xs leading-relaxed mb-6 px-4" style={{ color: C.soft }}>
                    Obchod je založený, zatiaľ je však prázdny. Vstúpte dnu a nahrajte svoj prvý produkt, ktorý chcete predávať — odkaz na zdieľanie sa vám zobrazí, hneď ako bude obchod pripravený pre zákazníkov.
                  </p>

                  <button
                    onClick={() => {
                      selectStore(sanitizedHandle);
                      setWizardOpen(false);
                    }}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01]"
                    style={{ background: C.ink }}
                  >
                    Vstúpiť do obchodu 🚀
                  </button>
                </div>
              )}

            </div>

            {/* Footer s tlačidlami */}
            {wizardStep <= 4 && (
              <div className="p-5 border-t flex flex-col gap-4 bg-slate-50" style={{ borderColor: C.line }}>
                {/* 3 Trust badges */}
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 border-b pb-3" style={{ borderColor: C.line }}>
                  <span className="flex items-center gap-1">✓ Začiatok je voľný</span>
                  <span className="flex items-center gap-1">✓ Žiadna platba vopred</span>
                  <span className="flex items-center gap-1">✓ Kedykoľvek uprav</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {wizardStep > 1 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className="px-4 py-3 rounded-xl border text-xs font-bold transition-colors hover:bg-slate-100"
                      style={{ borderColor: C.line, background: "#fff", color: C.ink }}
                    >
                      Späť
                    </button>
                  ) : (
                    <div className="w-12" />
                  )}

                  <span className="text-[10px] text-slate-500 font-medium text-center flex-1 px-1 leading-tight">
                    Stlačte Pokračovať pre uloženie a pokračovanie
                  </span>

                  {wizardStep < 4 ? (
                    <button
                      disabled={
                        (wizardStep === 1 && (!handleIsValid || handleIsTaken || !newStore.name.trim())) ||
                        (wizardStep === 2 && (!newStore.phone.trim() || !newStore.city.trim() || !newStore.category.trim())) ||
                        (wizardStep === 3 && !newStore.iban.trim())
                      }
                      onClick={() => setWizardStep(wizardStep + 1)}
                      className="px-5 py-3 rounded-xl text-white text-xs font-bold disabled:opacity-40 transition-transform hover:scale-[1.01] flex items-center gap-1 shrink-0"
                      style={{ background: C.ink }}
                    >
                      Pokračovať →
                    </button>
                  ) : (
                    <button
                      disabled={!newStore.name.trim() || !newStore.phone.trim() || !newStore.city.trim() || !newStore.category.trim() || !newStore.iban.trim() || handleIsTaken || !handleIsValid}
                      onClick={createAndLaunchStore}
                      className="px-5 py-3 rounded-xl text-white text-xs font-bold disabled:opacity-40 transition-transform hover:scale-[1.01] flex items-center gap-1 shrink-0"
                      style={{ background: C.ink }}
                    >
                      Vytvoriť a spustiť 🚀
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Modálne okno: Odstúpenie od zmluvy (Legislatívna požiadavka) ── */}
      {withdrawalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ borderColor: C.line }}>
            
            {/* Hlavička modálu */}
            <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: C.line, background: "#FAFAFA" }}>
              <div>
                <h3 className="disp text-base font-black text-slate-900">Odstúpenie od zmluvy</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Podľa § 20a zákona č. 108/2024 Z.z. (Ochrana spotrebiteľa)</p>
              </div>
              <button 
                onClick={() => {
                  setWithdrawalOpen(false);
                  setWithdrawalSuccess(null);
                  setWithdrawalError("");
                  setWithdrawalForm({ name: "", orderIdent: "", email: "" });
                }} 
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Obsah modálu */}
            <div className="p-6">
              {withdrawalSuccess ? (
                // ── Úspešné odoslanie ──
                <div className="flex flex-col items-center text-center py-2 animate-in fade-in duration-200">
                  <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-3xl mb-4 text-green-600 animate-bounce">
                    ✓
                  </div>
                  <h4 className="disp text-lg font-black text-slate-900">Odstúpenie zaevidované</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Vaša žiadosť o odstúpenie od zmluvy bola úspešne uložená v systéme obchodu.
                  </p>

                  {/* Potvrdenie s dátumom a časom podania */}
                  <div className="w-full bg-slate-50 rounded-2xl p-4 border text-left flex flex-col gap-2.5 my-6 text-xs text-slate-700" style={{ borderColor: C.line }}>
                    <div className="border-b pb-2 flex justify-between items-center" style={{ borderColor: C.line }}>
                      <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Potvrdenie o podaní</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-green-100 text-green-800 font-bold">ÚSPEŠNÉ</span>
                    </div>
                    <p><strong>Obchod:</strong> {store.name}</p>
                    <p><strong>Meno spotrebiteľa:</strong> {withdrawalSuccess.name}</p>
                    <p><strong>Kontaktný e-mail:</strong> {withdrawalSuccess.email}</p>
                    <p><strong>Identifikácia objednávky:</strong> #{withdrawalSuccess.orderId} {withdrawalSuccess.variabilnySymbol ? `(VS: ${withdrawalSuccess.variabilnySymbol})` : ""}</p>
                    <p><strong>Dátum a čas podania:</strong> <strong className="text-[#647058] font-mono">{withdrawalSuccess.timestamp}</strong></p>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-4">
                    Kópia tohto potvrdenia je pripravená. Kliknutím na tlačidlo nižšie môžete odoslať potvrdzujúci e-mail.
                  </p>

                  <div className="flex flex-col gap-2 w-full">
                    {/* mailto odkaz pre "odoslanie" / "prípravu" e-mailu */}
                    <a
                      href={`mailto:${withdrawalSuccess.email}?subject=${encodeURIComponent("Potvrdenie o prijatí odstúpenia od zmluvy - " + store.name)}&body=${encodeURIComponent(
                        `Dobrý deň,\n\ntýmto potvrdzujeme prijatie Vášho oznámenia o odstúpení od zmluvy v zmysle zákona č. 108/2024 Z.z.:\n\nÚdaje o odstúpení:\n- Obchod: ${store.name}\n- Číslo objednávky: #${withdrawalSuccess.orderId}\n- Variabilný symbol: ${withdrawalSuccess.variabilnySymbol || "—"}\n- Spotrebiteľ: ${withdrawalSuccess.name}\n- E-mailová adresa: ${withdrawalSuccess.email}\n- Dátum a čas podania: ${withdrawalSuccess.timestamp}\n\nVaša žiadosť bola úspešne zaevidovaná v stave "Žiadosť o odstúpenie". Predajca Vás bude v najbližšej dobe kontaktovať ohľadom ďalšieho postupu a vrátenia platby.\n\nS pozdravom,\nTím platformy Vitrína & ${store.name}`
                      )}`}
                      className="w-full py-3 rounded-xl text-white text-xs font-bold shadow-md transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5"
                      style={{ background: C.wa }}
                    >
                      Pripraviť e-mailové potvrdenie ✉️
                    </a>

                    <button
                      onClick={() => {
                        setWithdrawalOpen(false);
                        setWithdrawalSuccess(null);
                        setWithdrawalError("");
                        setWithdrawalForm({ name: "", orderIdent: "", email: "" });
                      }}
                      className="w-full py-3 rounded-xl border text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                      style={{ borderColor: C.line }}
                    >
                      Zatvoriť
                    </button>
                  </div>
                </div>
              ) : (
                // ── Formulár ──
                <form onSubmit={handleWithdrawalSubmit} className="flex flex-col gap-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vyplňte tento formulár, ak si želáte odstúpiť od kúpnej zmluvy uzavretej v tomto obchode do 14 dní od prevzatia tovaru.
                  </p>

                  {withdrawalError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                      ⚠️ {withdrawalError}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Meno a priezvisko</label>
                    <input
                      type="text"
                      required
                      placeholder="Napr. Ján Novák"
                      value={withdrawalForm.name}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, name: e.target.value })}
                      className="w-full rounded-xl px-3 py-2.5 text-sm border focus:outline-none"
                      style={{ borderColor: C.line, background: C.bg }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Číslo objednávky / Variabilný symbol</label>
                    <input
                      type="text"
                      required
                      placeholder="Napr. 1720512345"
                      value={withdrawalForm.orderIdent}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, orderIdent: e.target.value })}
                      className="w-full rounded-xl px-3 py-2.5 text-sm border focus:outline-none"
                      style={{ borderColor: C.line, background: C.bg }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">E-mailová adresa</label>
                    <input
                      type="email"
                      required
                      placeholder="jan.novak@priklad.sk"
                      value={withdrawalForm.email}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, email: e.target.value })}
                      className="w-full rounded-xl px-3 py-2.5 text-sm border focus:outline-none"
                      style={{ borderColor: C.line, background: C.bg }}
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawalOpen(false)}
                      className="flex-1 py-3 rounded-xl border text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                      style={{ borderColor: C.line }}
                    >
                      Zrušiť
                    </button>
                    <button
                      type="submit"
                      disabled={withdrawalLoading}
                      className="flex-1 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-transform hover:scale-[1.01] disabled:opacity-50"
                      style={{ background: C.accent }}
                    >
                      {withdrawalLoading ? "Spracúva sa..." : "Odoslať odstúpenie"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pomocník: prečíta súbor s obrázkom ako dataURL a automaticky zmenší veľké fotky ──
// Mobilné fotky z fotoaparátu majú 2-5 MB. Firestore dokument má limit 1 MB,
// takže nesmieme uložiť viac ako ~800 KB base64 (na obrázok samotný).
// Funkcia teda downscale-uje obrázok cez Canvas API (max ~1200 px na dlhšiu stranu,
// JPEG kvalita 0.85). Ak stále veľký, znižuje kvalitu.
const MAX_IMAGE_DATA_URL_BYTES = 800 * 1024; // ~800 KB

function readAsDataURL(file: File, cb: (result: string) => void) {
  // Pre všetko čo nie je obrázok (alebo SVG/gif — nechajme ako je) použije raw FileReader.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    const r = new FileReader();
    r.onload = () => cb(r.result as string);
    r.readAsDataURL(file);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const originalDataUrl = reader.result as string;
    // Ak je originál dostatočne malý, netreba nič robiť.
    if (originalDataUrl.length <= MAX_IMAGE_DATA_URL_BYTES * 1.4) {
      cb(originalDataUrl);
      return;
    }

    // Downscale cez Canvas
    const img = new Image();
    img.onload = () => {
      const maxDim = 1200; // max šírka/výška
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { cb(originalDataUrl); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // Skús JPEG kvalitu 0.85 → 0.75 → 0.6 → 0.45 kým sa nezmestí
      const qualities = [0.85, 0.75, 0.6, 0.45];
      for (const q of qualities) {
        const out = canvas.toDataURL("image/jpeg", q);
        if (out.length <= MAX_IMAGE_DATA_URL_BYTES * 1.4) {
          cb(out);
          return;
        }
      }
      // Fallback — najnižšia kvalita
      cb(canvas.toDataURL("image/jpeg", 0.4));
    };
    img.onerror = () => cb(originalDataUrl);
    img.src = originalDataUrl;
  };
  reader.readAsDataURL(file);
}

// ── Galéria fotiek produktu (carousel s bodkami ak > 1) ──
function ProductGallery({ product }: { product: StoreItem }) {
  const [idx, setIdx] = useState(0);
  const photos = (product.imgs && product.imgs.filter((u): u is string => !!u)) || (product.img ? [product.img] : []);
  const count = photos.length;

  useEffect(() => { setIdx(0); }, [product.id]);

  if (count === 0) {
    return (
      <div className="relative w-full aspect-square sm:aspect-[3/2] rounded-3xl overflow-hidden bg-slate-100 border mb-4" style={{ borderColor: C.line }}>
        <div className="w-full h-full flex items-center justify-center text-8xl" style={{ background: getPastelBg(product) }}>
          {product.emoji || "🎁"}
        </div>
      </div>
    );
  }

  const go = (delta: number) => setIdx((i) => (i + delta + count) % count);

  return (
    <div className="mb-4">
      <div className="relative w-full aspect-square sm:aspect-[3/2] rounded-3xl overflow-hidden bg-slate-100 border" style={{ borderColor: C.line }}>
        <img src={photos[idx]} alt={`${product.name} ${idx + 1}/${count}`} className="w-full h-full object-cover" />

        {count > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-700 flex items-center justify-center shadow font-bold text-lg"
              aria-label="Predchádzajúca fotka"
            >‹</button>
            <button
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-700 flex items-center justify-center shadow font-bold text-lg"
              aria-label="Ďalšia fotka"
            >›</button>
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-bold">
              {idx + 1} / {count}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === idx ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
              style={{ borderColor: i === idx ? C.accent : "transparent" }}
              aria-label={`Zobraziť fotku ${i + 1}`}
            >
              <img src={p} alt={`Náhľad ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Formulár na pridanie položky ──
function AddItem({ onAdd, disabled, limitMessage }: { onAdd: (item: StoreItem) => void; disabled?: boolean; limitMessage?: string }) {
  const [f, setF] = useState<{
    name: string;
    desc: string;
    longDesc: string;
    price: string;
    type: string;
    slot: string;
    imgs: (string | null)[];
  }>({ name: "", desc: "", longDesc: "", price: "", type: "product", slot: "", imgs: [] });

  const addPhoto = (url: string) => {
    setF((p) => {
      const next = [...p.imgs, url].slice(0, MAX_PRODUCT_PHOTOS);
      return { ...p, imgs: next };
    });
  };
  const removePhoto = (idx: number) => {
    setF((p) => ({ ...p, imgs: p.imgs.filter((_, i) => i !== idx) }));
  };

  // Slovenskí užívatelia zadávajú desatinné číslo s čiarkou (0,77) — akceptujeme obidve.
  const parsePrice = (v: string) => parseFloat((v || "").replace(",", "."));
  const ok = f.name.trim() && parsePrice(f.price) > 0 && !disabled;
  return (
    <section className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      {disabled && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
          <span className="text-2xl mb-1.5">🔒</span>
          <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Limit dosiahnutý</span>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-[240px]">{limitMessage}</p>
        </div>
      )}
      <h2 className="disp font-bold text-sm">Pridať položku</h2>
      <div className="flex gap-2">
        {[[ "product", "Produkt" ], [ "booking", "Rezervácia" ]].map(([k, l]) => (
          <button key={k} onClick={() => setF({ ...f, type: k })}
            disabled={disabled}
            className="px-3 py-1 rounded-full text-xs font-semibold disabled:opacity-50"
            style={f.type === k ? { background: C.ink, color: "#fff" } : { border: `1px solid ${C.line}`, color: C.soft }}>
            {l}
          </button>
        ))}
      </div>
      <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Názov"
        disabled={disabled}
        className="w-full rounded-xl px-3 py-2 text-sm border disabled:opacity-50" style={{ borderColor: C.line, background: C.bg }} />
      <input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="Doplňujúce info / krátky popis (napr. Vôňa: škorica)"
        disabled={disabled}
        className="w-full rounded-xl px-3 py-2 text-sm border disabled:opacity-50" style={{ borderColor: C.line, background: C.bg }} />
      <textarea value={f.longDesc} onChange={(e) => setF({ ...f, longDesc: e.target.value })} placeholder="Podrobný popis produktu (zobrazený v detaile)" rows={3}
        disabled={disabled}
        className="w-full rounded-xl px-3 py-2 text-sm border resize-none disabled:opacity-50" style={{ borderColor: C.line, background: C.bg }} />
      <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="Cena v € (napr. 12.50)" inputMode="decimal"
        disabled={disabled}
        className="w-full rounded-xl px-3 py-2 text-sm border disabled:opacity-50" style={{ borderColor: C.line, background: C.bg }} />
      {f.type === "booking" && (
        <input value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} placeholder="Termín (napr. So 20. 12. · 15:00)"
          disabled={disabled}
          className="w-full rounded-xl px-3 py-2 text-sm border disabled:opacity-50" style={{ borderColor: C.line, background: C.bg }} />
      )}
      <div className="mt-1">
        <div className="text-[11px] font-semibold mb-1.5" style={{ color: C.soft }}>
          Fotky produktu ({f.imgs.length}/{MAX_PRODUCT_PHOTOS}) — prvá bude titulná
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_PRODUCT_PHOTOS }).map((_, idx) => {
            const url = f.imgs[idx];
            if (url) {
              return (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border" style={{ borderColor: C.line }}>
                  <img src={url} alt={`Fotka ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    disabled={disabled}
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                    aria-label="Odstrániť fotku"
                  >✕</button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-slate-700">TITULNÁ</span>
                  )}
                </div>
              );
            }
            // Prázdny slot — first empty slot = pridať tlačidlo
            const isFirstEmpty = idx === f.imgs.length;
            return (
              <label
                key={idx}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center text-[10px] font-semibold cursor-pointer ${disabled || !isFirstEmpty ? "opacity-50 pointer-events-none" : ""}`}
                style={{
                  border: `1px dashed ${isFirstEmpty ? C.accent : C.line}`,
                  color: isFirstEmpty ? C.accent : C.soft,
                  background: isFirstEmpty ? C.accentSoft : C.bg,
                }}
              >
                <span className="text-xl mb-0.5">{isFirstEmpty ? "📷" : "＋"}</span>
                <span className="leading-tight px-1">{isFirstEmpty ? "Nahrať" : "Slot"}</span>
                {isFirstEmpty && (
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0];
                      if (!file) return;
                      readAsDataURL(file, (url) => addPhoto(url));
                      e.target.value = "";
                    }}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>
      <button
        disabled={!ok || disabled}
        onClick={() => {
          const imgs = f.imgs.filter((u): u is string => !!u);
          onAdd({
            id: Date.now().toString(),
            storeId: "",
            type: f.type,
            emoji: f.type === "booking" ? "📅" : "🛍️",
            img: imgs[0] || null,       // Legacy pole — prvá fotka
            imgs,                        // Nové pole — všetky fotky
            name: f.name.trim(),
            desc: f.desc.trim(),
            price: parsePrice(f.price),
            unit: f.type === "booking" ? "miesto" : "ks",
            slot: f.slot || "Po dohode",
            left: 10,
            badge: null,
            longDesc: f.longDesc.trim()
          });
          setF({ name: "", desc: "", longDesc: "", price: "", type: "product", slot: "", imgs: [] });
        }}
        className="mt-1 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40"
        style={{ background: C.accent }}
      >
        Pridať do Vitríny
      </button>
    </section>
  );
}
