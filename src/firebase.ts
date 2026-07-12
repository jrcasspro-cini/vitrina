import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Vlastný Firebase projekt Vitríny (predtym zdielany "gen-lang-client-0971393570"
// s ONKO E-shop — presunute do vitrina-zavio dna 12.7.2026).
const firebaseConfig = {
  apiKey: "AIzaSyDJIzUHXq1p2ZddUOhFP3DdvQrCRwx6y5A",
  authDomain: "vitrina-zavio.firebaseapp.com",
  projectId: "vitrina-zavio",
  storageBucket: "vitrina-zavio.firebasestorage.app",
  messagingSenderId: "1094435791532",
  appId: "1:1094435791532:web:85e0b46e15502c66a57509"
};

const app = initializeApp(firebaseConfig);
// Vlastný Firebase projekt používa štandardnú (default) databázu.
export const db = getFirestore(app);
export const auth = getAuth(app);
