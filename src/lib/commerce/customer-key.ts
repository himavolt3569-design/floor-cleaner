import { randomBytes } from "node:crypto";

/**
 * The only thread between a browser and the orders it placed.
 *
 * There is no account and no password. This opaque key lives in an httpOnly
 * cookie, is stamped onto each order as `customerKey`, and is never shown to
 * the customer, never put in a URL, and never returned in any response body.
 * Losing it costs history, not access: the order number plus the mobile number
 * still finds a single order.
 */

export const CUSTOMER_COOKIE = "__tmg_customer";

/** Long enough that a returning customer keeps their history for a season. */
export const CUSTOMER_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export function newCustomerKey(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * A cookie is attacker-controlled input. This only checks the shape, so a
 * malformed value is rejected before it is ever used in a query.
 */
export function isCustomerKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 42 &&
    value.length <= 64 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function customerCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    // "lax" rather than "strict": arriving from a link in a message should
    // still show the customer their own orders.
    sameSite: "lax" as const,
    path: "/",
    maxAge: CUSTOMER_COOKIE_MAX_AGE,
  };
}
