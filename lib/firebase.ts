// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore  } from "firebase/firestore";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBL9clnbJOmOjF-4KLcyhYiNK0qVaHwSw4",
  authDomain: "crack-origins.firebaseapp.com",
  projectId: "crack-origins",
  storageBucket: "crack-origins.firebasestorage.app",
  messagingSenderId: "178075327686",
  appId: "1:178075327686:web:9e64074b6b70c9f1f6cbc7",
  measurementId: "G-XHTJLCKKCY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const fireStore = getFirestore();
export const auth = getAuth(app);
export const rtdb = getDatabase(app);