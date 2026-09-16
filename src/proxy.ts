import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge of the application: sets a per-request CSP nonce and the standing
 * security headers, and keeps unauthenticated traffic out of /admin.
 *
 * The admin check here is a cheap gate, not the authorisation boundary. Every
 * admin page and every admin API route independently verifies the Firebase
 * session cookie and the superAdmin claim server side, so a forged cookie gets
 * past this and no further.
 */

const ADMIN_SESSION_COOKIE = "__tmg_session";

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    // strict-dynamic lets the nonced Next.js bootstrap load its own chunks
    // without us having to enumerate them.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`.trim(),
    // Style nonces would have to cover every SSR'd style attribute React emits.
    // Style injection is not an execution vector, so this is the deliberate
    // trade: scripts stay strictly nonced, styles allow inline.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://firebasestorage.googleapis.com https://*.googleapis.com https://*.google-analytics.com https://*.googletagmanager.com`,
    `font-src 'self' data:`,
    // Firestore/Auth/Storage and Analytics endpoints the browser SDK talks to.
    `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`,
    `frame-src 'self' https://*.firebaseapp.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, isDev);

  const { pathname } = request.nextUrl;

  // --- admin gate ---------------------------------------------------------
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasSession = request.cookies.has(ADMIN_SESSION_COOKIE);
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(self), interest-cohort=(), payment=()",
  );
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("x-dns-prefetch-control", "off");

  if (!isDev) {
    response.headers.set(
      "strict-transport-security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // Never let an intermediary cache an authenticated admin view.
  if (pathname.startsWith("/admin")) {
    response.headers.set("cache-control", "no-store, max-age=0, must-revalidate");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals and static assets. Prefetches are
     * excluded so they do not each burn a nonce.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|webp|jpg|jpeg|svg|ico|woff2?)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
