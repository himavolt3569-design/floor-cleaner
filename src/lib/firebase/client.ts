"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import type { Analytics } from "firebase/analytics";

/**
 * Browser-side Firebase.
 *
 * The values below are public by design: Firebase identifies the project with
 * them, it does not authorise anything. Access control lives entirely in the
 * Firestore and Storage rules plus the server routes. App Check is what stops
 * these keys being driven from outside the site.
 *
 * Every getter returns null when the project is not configured, so the
 * storefront still renders from bundled defaults on a fresh checkout.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export { config as firebaseConfig };

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId,
);

let appCheckStarted = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;

  const app = getApps().length
    ? getApp()
    : initializeApp(config as Required<typeof config>);

  void startAppCheck(app);
  return app;
}

/**
 * App Check attests that requests come from this site. Loaded lazily so the
 * reCAPTCHA payload never blocks first paint.
 */
async function startAppCheck(app: FirebaseApp) {
  if (appCheckStarted || typeof window === "undefined") return;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) return;

  appCheckStarted = true;

  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(
    "firebase/app-check"
  );

  // Lets a developer run the app locally against a real project without
  // shipping a debug bypass to production.
  if (process.env.NODE_ENV === "development") {
    (window as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Already initialised, or blocked by the browser. Requests will simply be
    // rejected by App Check enforcement, which is the intended failure mode.
  }
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getBucket(): FirebaseStorage | null {
  const app = getFirebaseApp();
  return app ? getStorage(app) : null;
}

let analyticsInstance: Analytics | null = null;
let analyticsStarted = false;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined" || !isFirebaseConfigured || !config.measurementId) {
    return null;
  }
  if (analyticsInstance) return analyticsInstance;
  if (analyticsStarted) return null;

  analyticsStarted = true;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    const app = getFirebaseApp();
    if (!app) return null;

    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch {
    return null;
  }
}
