import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Server-side Firebase. This module must never reach a client bundle: it holds
 * the service account and bypasses every security rule.
 *
 * Configure with either GOOGLE_APPLICATION_CREDENTIALS (managed environments)
 * or the FIREBASE_* variables below. When neither is present the helpers return
 * null and callers fall back to bundled defaults rather than crashing.
 */

const ADMIN_APP = "tmg-admin";

function readServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) return null;

  // A key pasted into a dashboard field often still carries the quotes it
  // needed in the .env file.
  const unquoted = rawKey.replace(/^\s*["']|["']\s*$/g, "");

  // Platforms that store the key as a single line keep the newlines escaped.
  const privateKey = unquoted.includes("\\n") ? unquoted.replace(/\\n/g, "\n") : unquoted;

  return { projectId, clientEmail, privateKey };
}

let cached: App | null | undefined;

export function getAdminApp(): App | null {
  if (cached !== undefined) return cached;

  const existing = getApps().find((a) => a.name === ADMIN_APP);
  if (existing) {
    cached = existing;
    return cached;
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  const sa = readServiceAccount();

  if (sa) {
    // cert() rejects a malformed private key by throwing, and this is the one
    // call in the module that is not already guarded. Letting it escape takes
    // down every route that touches Firestore, including pages that would have
    // been happy to render from the bundled defaults, so a broken key degrades
    // to the same unconfigured state as an absent one.
    try {
      cached = initializeApp(
        { credential: cert(sa), projectId: sa.projectId, storageBucket },
        ADMIN_APP,
      );
      return cached;
    } catch (error) {
      console.error(
        "[firebase-admin] Service account rejected, serving bundled defaults. " +
          "FIREBASE_PRIVATE_KEY must keep its newlines written as \\n:",
        error,
      );
      cached = null;
      return cached;
    }
  }

  // Application default credentials (Cloud Run, App Hosting, Functions).
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
    try {
      cached = initializeApp({ storageBucket }, ADMIN_APP);
      return cached;
    } catch {
      cached = null;
      return cached;
    }
  }

  cached = null;
  return cached;
}

export const isAdminConfigured = () => getAdminApp() !== null;

export function adminDb(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws once the instance has been used; safe to ignore.
  }
  return db;
}

export function adminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function adminBucket() {
  const app = getAdminApp();
  return app ? getStorage(app).bucket() : null;
}

/** Throwing variants for routes that genuinely cannot proceed without Firebase. */
export function requireDb(): Firestore {
  const db = adminDb();
  if (!db) throw new FirebaseUnavailableError();
  return db;
}

export function requireAuth(): Auth {
  const auth = adminAuth();
  if (!auth) throw new FirebaseUnavailableError();
  return auth;
}

export class FirebaseUnavailableError extends Error {
  constructor() {
    super("Firebase is not configured on the server.");
    this.name = "FirebaseUnavailableError";
  }
}
