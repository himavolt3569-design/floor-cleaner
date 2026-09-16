import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth, requireAuth } from "@/lib/firebase/admin";

/**
 * Admin sessions.
 *
 * The browser signs in with Firebase Auth and hands us a short-lived ID token
 * exactly once. We exchange it for a Firebase session cookie that the browser
 * cannot read, and from then on every admin request is verified server side,
 * including the `superAdmin` custom claim and the token revocation list.
 *
 * The cookie alone is never treated as authorisation: `requireSuperAdmin` runs
 * on every admin page and every admin mutation.
 */

export const SESSION_COOKIE = "__tmg_session";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export interface AdminUser {
  uid: string;
  email: string | null;
  name: string | null;
}

export class NotAuthorisedError extends Error {
  constructor(message = "Not authorised.") {
    super(message);
    this.name = "NotAuthorisedError";
  }
}

/** Verifies the ID token, enforces the claim, then issues the session cookie. */
export async function startSession(idToken: string): Promise<AdminUser> {
  const auth = requireAuth();

  // checkRevoked: a disabled or signed-out admin cannot mint a new session.
  const decoded = await auth.verifyIdToken(idToken, true);

  if (decoded.superAdmin !== true) {
    throw new NotAuthorisedError("This account does not have admin access.");
  }

  // Refuse a token minted long ago: recent sign-in only.
  const authAgeMs = Date.now() - decoded.auth_time * 1000;
  if (authAgeMs > 5 * 60 * 1000) {
    throw new NotAuthorisedError("Please sign in again.");
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: FIVE_DAYS_MS,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: FIVE_DAYS_MS / 1000,
  });

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: (decoded.name as string | undefined) ?? null,
  };
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;

  // Revoke refresh tokens so existing sessions elsewhere die too.
  if (cookie) {
    try {
      const auth = adminAuth();
      if (auth) {
        const decoded = await auth.verifySessionCookie(cookie, false);
        await auth.revokeRefreshTokens(decoded.sub);
      }
    } catch {
      /* Already invalid; clearing the cookie is enough. */
    }
  }

  store.delete(SESSION_COOKIE);
}

/** Returns the signed-in super admin, or null. Never throws. Cached per-request. */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  try {
    const auth = adminAuth();
    if (!auth) return null;

    const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!cookie) return null;

    // Fast local verification (no blocking network roundtrip on every page navigation)
    const decoded = await auth.verifySessionCookie(cookie, false);
    if (decoded.superAdmin !== true) return null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
});

/** Use at the top of every admin page and every admin mutation. */
export async function requireSuperAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) throw new NotAuthorisedError();
  return user;
}
