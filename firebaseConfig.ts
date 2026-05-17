import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// @ts-ignore
import { getReactNativePersistence, initializeAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDgN5BrP3fdraWJZjTrhsmUyDJdmJzPVIQ",
  authDomain: "mytaskpro-56448.firebaseapp.com",
  projectId: "mytaskpro-56448",
  storageBucket: "mytaskpro-56448.firebasestorage.app",
  messagingSenderId: "121295285784",
  appId: "1:121295285784:web:5830cf7faad29c586add6d",
  measurementId: "G-THCY3KJ4C4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth with Persistence (Taake login yaad rahe)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Database initialize
const db = getFirestore(app);

export { auth, db };

