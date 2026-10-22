import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function isFirebaseConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function adminAuth() {
  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n"),
        }),
      });

  return getAuth(app);
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || !isFirebaseConfigured()) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    if (!decoded?.phone_number) return null;
    return { phoneNumber: decoded.phone_number };
  } catch (error) {
    console.error("Failed to verify Firebase ID token:", error.message);
    return null;
  }
}
