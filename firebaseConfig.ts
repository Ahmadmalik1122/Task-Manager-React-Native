import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDgN5BrP3fdraWJZjTrhsmUyDJdmJzPVIQ",
  authDomain: "mytaskpro-56448.firebaseapp.com",
  projectId: "mytaskpro-56448",
  storageBucket: "mytaskpro-56448.firebasestorage.app",
  messagingSenderId: "121295285784",
  appId: "1:121295285784:web:5830cf7faad29c586add6d",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

