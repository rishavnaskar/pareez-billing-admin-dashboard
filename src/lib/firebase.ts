import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);

if (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
  const [host, portStr] = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST.split(":");
  const port = Number(portStr || 8080);
  try {
    connectFirestoreEmulator(db, host || "localhost", port);
    // eslint-disable-next-line no-console
    console.info(`Firestore emulator connected at ${host || "localhost"}:${port}`);
  } catch (err) {
    console.warn("Failed to connect Firestore emulator:", err);
  }
}

export default app;
