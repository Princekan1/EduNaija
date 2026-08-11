import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// AI Model (Gemini) - text generation: subjects, topics, lessons, quiz questions
const ai = getAI(app, { backend: new GoogleAIBackend() });
export const aiModel = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

// AI Model (Gemini) - image generation: topic illustrations
// Separate model instance because image generation needs a different
// generationConfig (responseModalities) than the text model above.
export const imageModel = getGenerativeModel(ai, {
  model: "gemini-3.1-flash-image",
  generationConfig: { responseModalities: ["IMAGE"] },
});
