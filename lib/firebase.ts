import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// During build time (static generation), environment variables might not be fully available
// or Firebase initialization might happen in a restricted environment.
// Initialize with a dummy config if apiKey is missing to prevent build crashes.
const isVaidConfig = !!firebaseConfig.apiKey;
const app = (getApps().length > 0) 
  ? getApp() 
  : initializeApp(isVaidConfig ? firebaseConfig : { apiKey: "BUILD_TIME_PLACEHOLDER", projectId: "placeholder" });

export const fireStore = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);