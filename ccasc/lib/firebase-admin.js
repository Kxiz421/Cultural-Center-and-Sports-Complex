export function isFirebaseConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

let adminAuthPromise = null;

async function getAdminAuth() {
  if (!adminAuthPromise) {
    adminAuthPromise = (async () => {
      const [{ cert, getApp, getApps, initializeApp }, { getAuth }] =
        await Promise.all([
          import("firebase-admin/app"),
          import("firebase-admin/auth"),
        ]);

      const app = getApps().length
        ? getApp()
        : initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: String(process.env.FIREBASE_PRIVATE_KEY).replace(
                /\\n/g,
                "\n",
              ),
            }),
          });

      return getAuth(app);
    })().catch((error) => {
      adminAuthPromise = null;
      throw error;
    });
  }

  return adminAuthPromise;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || !isFirebaseConfigured()) {
    return { ok: false, reason: "invalid" };
  }

  let auth;
  try {
    auth = await getAdminAuth();
  } catch (error) {
    console.error("[firebase-admin] SDK failed to load:", error?.message);
    return { ok: false, reason: "unavailable" };
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    if (!decoded?.phone_number) return { ok: false, reason: "invalid" };
    return { ok: true, phoneNumber: decoded.phone_number };
  } catch (error) {
    console.error("[firebase-admin] token rejected:", error?.message);
    return { ok: false, reason: "invalid" };
  }
}
