import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBzjawHP1PF5EZdNblGEBeviwEm5uLzS_E",
  authDomain: "gen-lang-client-0971393570.firebaseapp.com",
  projectId: "gen-lang-client-0971393570",
  storageBucket: "gen-lang-client-0971393570.firebasestorage.app",
  messagingSenderId: "140569652568",
  appId: "1:140569652568:web:ba02eaae157a0a2628092d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-vitrna-c2588a60-4f0b-45c8-a986-0ee627206f01");
export const auth = getAuth(app);
