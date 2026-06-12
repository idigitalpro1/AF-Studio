import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const config = {
  ...firebaseConfig,
  apiKey: process.env.GEMINI_API_KEY || firebaseConfig.apiKey
};

const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);
export { db, auth };