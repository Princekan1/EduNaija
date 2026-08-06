import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyAYHK0QpOP2CksizSWSUkhkjeQXj-YaUCY",
  authDomain: "edunaija-633e8.firebaseapp.com",
  projectId: "edunaija-633e8",
  storageBucket: "edunaija-633e8.firebasestorage.app",
  appId: "1:571080271020:web:689c3aff1cbca99e1d2b09"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// AI Model (Gemini)
const ai = getAI(app, { backend: new GoogleAIBackend() });
export const aiModel = getGenerativeModel(ai, { model: "gemini-2.5-flash" });