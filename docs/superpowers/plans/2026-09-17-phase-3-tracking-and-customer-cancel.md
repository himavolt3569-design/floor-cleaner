# Phase 3: Accountless order tracking and customer cancellation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer see their orders and cancel one, with no account, no password and no secret in a URL — and give the `cancellation_requested` path built in phase 2 something that actually creates it.

**Architecture:** An httpOnly `__tmg_customer` cookie is the only thread between a browser and its orders; `createOrder` stamps it onto the order as `customerKey`. Everything the customer is allowed to see is built by one pure projection module, so the fields that must never leave the server — the fraud `meta` block, the customer key, partner attribution, admin note text — are excluded in one reviewable place rather than at each call site. A lost cookie falls back to a stateless lookup proving order number plus mobile, which returns the order in the response and leaves nothing behind. Cancelling goes through `applyOrderTransition` from phase 2, so the customer path cannot skip restocking or the audit trail.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19, TypeScript strict, Zod, Firebase Admin SDK, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-16-order-lifecycle-design.md` (section 3, and the customer half of section 5)

## Global Constraints

- Money is always an integer number of paisa in a field named `*Minor`.
- `applyOrderTransition` remains the only writer of `orderStatus`. The customer cancel route calls it; it does not write the field itself.
- Nothing the customer receives may include: the order's `meta` block (IP, user agent), `customerKey`, `salesPartnerId`, `courierPartnerId`, `externalReference`, `paymentProofUrl`, or the free-text `message` of any audit event. Admin notes are written for staff and must never be replayed to a customer.
- No secret goes in a URL or a query string, ever.
- A lookup that fails and a lookup for an order that does not exist must be indistinguishable to the caller.
- Pure modules take plain data and return plain data: no `server-only`, no Firestore.
- This is not the Next.js in your training data. Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code. Middleware lives in `src/proxy.ts`.
- Two Claude sessions share this working directory. Commit after every task so a branch switch elsewhere cannot strand the work.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` at the end.

---

### Task 1: The customer key and the cookie

**Files:**
- Create: `src/lib/commerce/customer-key.ts`
- Create: `src/lib/commerce/customer-key.test.ts`
- Modify: `src/lib/commerce/orders.ts` (accept and store `customerKey`)
- Modify: `src/app/api/orders/route.ts` (read or mint the cookie, set it on the response)

**Interfaces:**
- Produces:
  - `CUSTOMER_COOKIE = "__tmg_customer"`
  - `CUSTOMER_COOKIE_MAX_AGE` (seconds, 180 days)
  - `newCustomerKey(): string` — 32 random bytes, base64url
  - `isCustomerKey(value: unknown): value is string` — shape check before trusting a cookie
  - `customerCookieOptions(isProduction: boolean)` — the exact cookie flags
- `createOrder(input, meta)` gains `meta.customerKey: string`, stored on the order as `customerKey`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/commerce/customer-key.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  isCustomerKey,
  newCustomerKey,
} from "./customer-key";

describe("newCustomerKey", () => {
  it("is long enough not to be guessed", () => {
    expect(newCustomerKey().length).toBeGreaterThanOrEqual(42);
  });

  it("is url safe", () => {
    expect(newCustomerKey()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats", () => {
    const keys = new Set(Array.from({ length: 500 }, newCustomerKey));
    expect(keys.size).toBe(500);
  });
});

describe("isCustomerKey", () => {
  it("accepts a freshly minted key", () => {
    expect(isCustomerKey(newCustomerKey())).toBe(true);
  });

  it("rejects anything that is not a plausible key", () => {
    expect(isCustomerKey("")).toBe(false);
    expect(isCustomerKey("short")).toBe(false);
    expect(isCustomerKey(null)).toBe(false);
    expect(isCustomerKey(12345)).toBe(false);
    expect(isCustomerKey("has spaces and punctuation!!")).toBe(false);
    expect(isCustomerKey("a".repeat(500))).toBe(false);
  });
});

describe("customerCookieOptions", () => {
  it("is named consistently", () => {
    expect(CUSTOMER_COOKIE).toBe("__tmg_customer");
  });

  it("cannot be read by scripts and is secure in production", () => {
    const options = customerCookieOptions(true);
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("drops secure outside production so local http still works", () => {
    expect(customerCookieOptions(false).secure).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/commerce/customer-key.test.ts`
Expected: FAIL, cannot resolve `./customer-key`.

- [ ] **Step 3: Write the module**

Create `src/lib/commerce/customer-key.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/commerce/customer-key.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Stamp the key onto new orders**

In `src/lib/commerce/orders.ts`, widen the `meta` parameter of `createOrder`:

```ts
  meta: { ip: string; userAgent: string | null; customerKey: string },
```

Then, in the `tx.set(orderRef, {...})` call, replace the line `customerId: null,` with:

```ts
      customerId: null,
      // The browser that placed this order, so it can find it again without
      // an account. Never returned to any client.
      customerKey: meta.customerKey,
      deliveryAttempts: 0,
      lastFailureReason: null,
      lastFailureNote: null,
      cancellation: null,
      stockRestoredAt: null,
```

Setting the phase 2 fields at creation means every new order has them, so nothing downstream has to guess a default.

- [ ] **Step 6: Read or mint the cookie in the order route**

In `src/app/api/orders/route.ts`, add the imports:

```ts
import { cookies } from "next/headers";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  isCustomerKey,
  newCustomerKey,
} from "@/lib/commerce/customer-key";
```

Immediately before `const userAgent = ...`, add:

```ts
    // One key per browser, reused for every later order so the customer sees
    // their whole history. A malformed cookie is replaced rather than trusted.
    const existing = (await cookies()).get(CUSTOMER_COOKIE)?.value;
    const customerKey = isCustomerKey(existing) ? existing : newCustomerKey();
```

Change the `createOrder` call to pass it:

```ts
    const order = await createOrder(parsed.data, { ip, userAgent, customerKey });
```

Then replace the success `return` with one that carries the cookie:

```ts
    const response = NextResponse.json({ ok: true, order }, { headers: noStore });
    response.cookies.set(
      CUSTOMER_COOKIE,
      customerKey,
      customerCookieOptions(process.env.NODE_ENV === "production"),
    );
    return response;
```

The replay branch above it returns without setting a cookie, which is correct: a replay means the browser already has one.

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/commerce/customer-key.ts src/lib/commerce/customer-key.test.ts src/lib/commerce/orders.ts src/app/api/orders/route.ts
git commit -m "feat: give each browser a customer key so orders can be found again" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: What a customer is allowed to see

**Files:**
- Create: `src/lib/commerce/tracking-view.ts`
- Create: `src/lib/commerce/tracking-view.test.ts`
- Modify: `src/lib/commerce/apply-transition.ts` (record the new status on the event)

**Interfaces:**
- Produces:
  - `interface TrackedOrder` and `interface TrackedEvent { at: string; label: string }`
  - `projectOrder(raw: Record<string, unknown>): TrackedOrder` — the allowlist
  - `customerTimeline(events: { type: string; status?: string; createdAt: string }[]): TrackedEvent[]`
  - `cancelAbility(status: OrderStatus): "cancel" | "request" | "none"`
  - `CUSTOMER_STATUS_LABEL: Record<OrderStatus, string>`
- Consumed by Tasks 3, 4, 5 and 6.

This is the security boundary of the whole phase. It is an allowlist: fields are copied in by name, never spread from the source document, so a field added to `orders` later cannot leak by accident.

- [ ] **Step 1: Write the failing test**

Create `src/lib/commerce/tracking-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  cancelAbility,
  customerTimeline,
  projectOrder,
} from "./tracking-view";

const raw = {
  id: "abc123",
  orderNumber: "TMG-2609-0042",
  orderStatus: "out_for_delivery",
  paymentStatus: "unpaid",
  paymentMethodName: "Cash on delivery",
  deliveryMethodName: "Kathmandu Valley delivery",
  deliveryEstimate: "1 to 2 days",
  subtotalMinor: 150_000,
  deliveryFeeMinor: 10_000,
  discountMinor: 0,
  grandTotalMinor: 160_000,
  createdAt: "2026-09-16T10:00:00.000Z",
  deliveryAttempts: 1,
  cancellation: { state: "none", requestedBy: null, reason: null },
  items: [
    {
      name: "TMG Cleaner",
      variantLabel: "1 Litre",
      quantity: 2,
      lineTotalMinor: 150_000,
      sku: "TMG-1L",
    },
  ],
  deliveryAddress: {
    fullName: "Asha Shrestha",
    mobile: "9812345678",
    district: "Kathmandu",
    province: "Bagmati",
    municipality: "Kathmandu",
    area: "Thamel",
  },
  // None of the following may ever reach a customer.
  customerKey: "SECRET_BROWSER_KEY",
  meta: { ip: "203.0.113.9", userAgent: "Mozilla/5.0" },
  salesPartnerId: "partner-1",
  courierPartnerId: "courier-9",
  externalReference: "EXT-123",
  paymentProofUrl: "orders/abc123/proof.jpg",
  lastFailureNote: "Rang the bell, nobody answered, staff note",
};

describe("projectOrder", () => {
  it("keeps what the customer needs", () => {
    const view = projectOrder(raw);

    expect(view.orderNumber).toBe("TMG-2609-0042");
    expect(view.orderStatus).toBe("out_for_delivery");
    expect(view.grandTotalMinor).toBe(160_000);
    expect(view.items).toHaveLength(1);
    expect(view.items[0]).toEqual({
      name: "TMG Cleaner",
      variantLabel: "1 Litre",
      quantity: 2,
      lineTotalMinor: 150_000,
    });
    expect(view.deliveryAddress.fullName).toBe("Asha Shrestha");
  });

  it("drops every internal field", () => {
    const serialised = JSON.stringify(projectOrder(raw));

    expect(serialised).not.toContain("SECRET_BROWSER_KEY");
    expect(serialised).not.toContain("203.0.113.9");
    expect(serialised).not.toContain("Mozilla");
    expect(serialised).not.toContain("partner-1");
    expect(serialised).not.toContain("courier-9");
    expect(serialised).not.toContain("EXT-123");
    expect(serialised).not.toContain("proof.jpg");
    expect(serialised).not.toContain("staff note");
  });

  it("does not carry a sku through", () => {
    expect(JSON.stringify(projectOrder(raw))).not.toContain("TMG-1L");
  });

  it("survives an order that is missing the phase 2 fields", () => {
    const view = projectOrder({
      id: "x",
      orderNumber: "TMG-2609-0001",
      orderStatus: "pending",
      paymentStatus: "unpaid",
      items: [],
      deliveryAddress: {},
      createdAt: "2026-09-16T10:00:00.000Z",
    });

    expect(view.deliveryAttempts).toBe(0);
    expect(view.cancellationState).toBe("none");
    expect(view.items).toEqual([]);
  });
});

describe("customerTimeline", () => {
  it("labels each step without replaying staff text", () => {
    const timeline = customerTimeline([
      { type: "order_created", createdAt: "2026-09-16T10:00:00.000Z" },
      {
        type: "status_changed",
        status: "packed",
        createdAt: "2026-09-16T12:00:00.000Z",
      },
      { type: "delivery_failed", createdAt: "2026-09-16T15:00:00.000Z" },
    ]);

    expect(timeline.map((e) => e.label)).toEqual([
      "Order placed",
      "Packed",
      "Delivery attempt failed",
    ]);
  });

  it("drops events the customer has no business seeing", () => {
    const timeline = customerTimeline([
      { type: "partner_assignment", createdAt: "2026-09-16T10:00:00.000Z" },
      { type: "partner_entries_recorded", createdAt: "2026-09-16T11:00:00.000Z" },
      { type: "order_created", createdAt: "2026-09-16T09:00:00.000Z" },
    ]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].label).toBe("Order placed");
  });

  it("drops a status change whose status was not recorded", () => {
    expect(
      customerTimeline([
        { type: "status_changed", createdAt: "2026-09-16T10:00:00.000Z" },
      ]),
    ).toEqual([]);
  });
});

describe("cancelAbility", () => {
  it("lets the customer cancel outright before dispatch", () => {
    expect(cancelAbility("pending")).toBe("cancel");
    expect(cancelAbility("confirmed")).toBe("cancel");
    expect(cancelAbility("processing")).toBe("cancel");
    expect(cancelAbility("packed")).toBe("cancel");
  });

  it("downgrades to a request once the courier has it", () => {
    expect(cancelAbility("out_for_delivery")).toBe("request");
    expect(cancelAbility("delivery_failed")).toBe("request");
  });

  it("offers nothing on a finished or already-requested order", () => {
    expect(cancelAbility("delivered")).toBe("none");
    expect(cancelAbility("cancelled")).toBe("none");
    expect(cancelAbility("returned")).toBe("none");
    expect(cancelAbility("cancellation_requested")).toBe("none");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/commerce/tracking-view.test.ts`
Expected: FAIL, cannot resolve `./tracking-view`.

- [ ] **Step 3: Write the projection**

Create `src/lib/commerce/tracking-view.ts`:

```ts
import {
  CUSTOMER_REQUEST_FROM,
  CUSTOMER_SELF_CANCEL,
} from "./order-status";
import type { CancellationState, OrderStatus } from "@/types";

/**
 * Everything, and only everything, a customer may see about their own order.
 *
 * This is an allowlist by construction: every field is copied in by name and
 * the source document is never spread. A field added to `orders` tomorrow
 * cannot leak through here by accident, which is the point.
 *
 * Audit event text is never replayed. Staff write those notes for each other,
 * and a courier's "nobody answered, address looks fake" is not customer copy.
 * The timeline is built from event types and statuses alone.
 */

export interface TrackedItem {
  name: string;
  variantLabel: string;
  quantity: number;
  lineTotalMinor: number;
}

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  statusLabel: string;
  paymentStatus: string;
  paymentMethodName: string;
  deliveryMethodName: string;
  deliveryEstimate: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  createdAt: string;
  deliveryAttempts: number;
  cancellationState: CancellationState;
  items: TrackedItem[];
  deliveryAddress: {
    fullName: string;
    district: string;
    province: string;
    municipality: string;
    area: string;
  };
}

export interface TrackedEvent {
  at: string;
  label: string;
}

export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order received",
  confirmed: "Order confirmed",
  processing: "Being prepared",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivery_failed: "Delivery attempt failed",
  delivered: "Delivered",
  cancellation_requested: "Cancellation requested",
  cancelled: "Cancelled",
  returned: "Returned",
};

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function projectOrder(raw: Record<string, unknown>): TrackedOrder {
  const status = (text(raw.orderStatus) || "pending") as OrderStatus;
  const address = (raw.deliveryAddress ?? {}) as Record<string, unknown>;
  const cancellation = (raw.cancellation ?? null) as { state?: string } | null;
  const items = Array.isArray(raw.items) ? raw.items : [];

  return {
    id: text(raw.id),
    orderNumber: text(raw.orderNumber),
    orderStatus: status,
    statusLabel: CUSTOMER_STATUS_LABEL[status] ?? "Order received",
    paymentStatus: text(raw.paymentStatus) || "unpaid",
    paymentMethodName: text(raw.paymentMethodName),
    deliveryMethodName: text(raw.deliveryMethodName),
    deliveryEstimate: text(raw.deliveryEstimate),
    subtotalMinor: count(raw.subtotalMinor),
    deliveryFeeMinor: count(raw.deliveryFeeMinor),
    discountMinor: count(raw.discountMinor),
    grandTotalMinor: count(raw.grandTotalMinor),
    createdAt: text(raw.createdAt),
    deliveryAttempts: count(raw.deliveryAttempts),
    cancellationState: (cancellation?.state ?? "none") as CancellationState,
    items: items.map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      return {
        name: text(item.name),
        variantLabel: text(item.variantLabel),
        quantity: count(item.quantity),
        lineTotalMinor: count(item.lineTotalMinor),
      };
    }),
    deliveryAddress: {
      fullName: text(address.fullName),
      district: text(address.district),
      province: text(address.province),
      municipality: text(address.municipality),
      area: text(address.area),
    },
  };
}

/** Event types a customer may see, and the words they see instead of the note. */
const EVENT_LABELS: Record<string, string> = {
  order_created: "Order placed",
  payment_status_changed: "Payment updated",
  delivery_failed: "Delivery attempt failed",
  cancellation_requested: "Cancellation requested",
  cancellation_refused: "Cancellation not possible",
  order_cancelled: "Cancelled",
  order_returned: "Returned to us",
};

export function customerTimeline(
  events: { type: string; status?: string; createdAt: string }[],
): TrackedEvent[] {
  const out: TrackedEvent[] = [];

  for (const event of events) {
    if (event.type === "status_changed") {
      // Older events predate the recorded status and cannot be labelled
      // safely, so they are dropped rather than guessed at.
      const label = CUSTOMER_STATUS_LABEL[event.status as OrderStatus];
      if (label) out.push({ at: event.createdAt, label });
      continue;
    }

    const label = EVENT_LABELS[event.type];
    if (label) out.push({ at: event.createdAt, label });
  }

  return out;
}

export function cancelAbility(
  status: OrderStatus,
): "cancel" | "request" | "none" {
  if (CUSTOMER_SELF_CANCEL.includes(status)) return "cancel";
  if (CUSTOMER_REQUEST_FROM.includes(status)) return "request";
  return "none";
}
```

- [ ] **Step 4: Record the status on every event**

The timeline needs the status a `status_changed` event moved to, because the stored message is staff text and is never shown. In `src/lib/commerce/apply-transition.ts`, add one field to the `tx.set(db.collection(COLLECTIONS.orderEvents).doc(), {...})` call, directly after `type: plan.event.type,`:

```ts
      status: plan.status,
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/commerce/tracking-view.ts src/lib/commerce/tracking-view.test.ts src/lib/commerce/apply-transition.ts
git commit -m "feat: define exactly what a customer may see about an order" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Reading a customer's orders

**Files:**
- Create: `src/lib/data/tracking.ts`
- Modify: `firestore.indexes.json`

**Interfaces:**
- Consumes: `projectOrder`, `customerTimeline` from Task 2; `isCustomerKey` from Task 1.
- Produces:
  - `listOrdersForCustomer(customerKey: string): Promise<TrackedOrder[]>`
  - `findOrderForCustomer(orderNumber: string, customerKey: string): Promise<TrackedOrder | null>`
  - `findOrderByNumberAndMobile(orderNumber: string, mobile: string): Promise<TrackedOrder | null>`
  - `timelineForOrder(orderId: string): Promise<TrackedEvent[]>`
  - `orderOwnership(orderNumber: string)` — internal to the cancel route, returns the id, customerKey and mobile only, and is never sent to a client.

- [ ] **Step 1: Write the module**

Create `src/lib/data/tracking.ts`:

```ts
import "server-only";

import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  customerTimeline,
  projectOrder,
  type TrackedEvent,
  type TrackedOrder,
} from "@/lib/commerce/tracking-view";
import { normalizeNepaliMobile } from "@/config/nepal";

/**
 * Customer-facing reads.
 *
 * Every path out of this module goes through `projectOrder`, so nothing that
 * belongs to staff can reach a storefront page. Nothing here trusts an
 * identifier it was handed: an order is returned only when the caller has
 * already proved the customer key or the mobile number on the order itself.
 */

const MAX_ORDERS = 25;

function iso(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : new Date(0).toISOString();
}

function rowToRaw(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): Record<string, unknown> {
  const data = doc.data() ?? {};
  return { ...data, id: doc.id, createdAt: iso(data.createdAt) };
}

export async function listOrdersForCustomer(
  customerKey: string,
): Promise<TrackedOrder[]> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("customerKey", "==", customerKey)
    .orderBy("createdAt", "desc")
    .limit(MAX_ORDERS)
    .get();

  return snap.docs.map((doc) => projectOrder(rowToRaw(doc)));
}

export async function findOrderForCustomer(
  orderNumber: string,
  customerKey: string,
): Promise<TrackedOrder | null> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;
  if (doc.data()?.customerKey !== customerKey) return null;

  return projectOrder(rowToRaw(doc));
}

/**
 * The lost-cookie path. The mobile number is the shared secret, so it is
 * compared in its normalised form and a mismatch is reported to the caller
 * exactly as a missing order is.
 */
export async function findOrderByNumberAndMobile(
  orderNumber: string,
  mobile: string,
): Promise<TrackedOrder | null> {
  const wanted = normalizeNepaliMobile(mobile);
  if (!wanted) return null;

  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;

  const stored = normalizeNepaliMobile(
    String(doc.data()?.deliveryAddress?.mobile ?? ""),
  );
  if (!stored || stored !== wanted) return null;

  return projectOrder(rowToRaw(doc));
}

export async function timelineForOrder(orderId: string): Promise<TrackedEvent[]> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orderEvents)
    .where("orderId", "==", orderId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return customerTimeline(
    snap.docs.map((doc) => {
      const data = doc.data();
      return {
        type: String(data.type ?? ""),
        status: typeof data.status === "string" ? data.status : undefined,
        createdAt: iso(data.createdAt),
      };
    }),
  );
}

/** Ownership facts only, for the cancel route. Never sent to a client. */
export async function orderOwnership(orderNumber: string): Promise<{
  id: string;
  customerKey: string | null;
  mobile: string | null;
} | null> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;

  const data = doc.data() ?? {};
  return {
    id: doc.id,
    customerKey: typeof data.customerKey === "string" ? data.customerKey : null,
    mobile: normalizeNepaliMobile(String(data.deliveryAddress?.mobile ?? "")),
  };
}
```

- [ ] **Step 2: Add the composite index**

`listOrdersForCustomer` filters on `customerKey` and orders by `createdAt`, which Firestore cannot serve without a composite index. In `firestore.indexes.json`, add to the `indexes` array:

```json
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "customerKey", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
```

The index must be deployed with `firebase deploy --only firestore:indexes` before `/track` will list anything in production. Note this in the commit message; it is a deployment step, not a code step.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/tracking.ts firestore.indexes.json
git commit -m "feat: read a customer's own orders and timeline" -m "Needs firebase deploy --only firestore:indexes before /track lists orders in production." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The lookup route

**Files:**
- Create: `src/app/api/track/lookup/route.ts`
- Modify: `src/lib/validation/schemas.ts` (add `trackLookupSchema`)

**Interfaces:**
- Consumes: `findOrderByNumberAndMobile` from Task 3.
- Produces: `POST /api/track/lookup` returning `{ ok: true, order: TrackedOrder }` or `{ ok: false, error }`.

- [ ] **Step 1: Add the schema**

In `src/lib/validation/schemas.ts`, add after `paymentProofSchema`:

```ts
export const trackLookupSchema = z.object({
  orderNumber: trimmed(40)
    .min(1, "Enter your order number")
    .transform((v) => v.toUpperCase()),
  mobile: trimmed(24).min(1, "Enter the mobile number on the order"),
});
```

The order number is uppercased because `formatOrderNumber` writes `TMG-2609-0042` and customers type it in any case.

- [ ] **Step 2: Write the route**

Create `src/app/api/track/lookup/route.ts`:

```ts
import { NextResponse } from "next/server";
import { trackLookupSchema } from "@/lib/validation/schemas";
import { findOrderByNumberAndMobile } from "@/lib/data/tracking";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/**
 * Finds one order for a customer who no longer has their cookie.
 *
 * The mobile number on the order is the shared secret. A wrong number, a
 * malformed number and an order that does not exist all produce the same
 * message, so this cannot be used to discover which order numbers are real.
 * Five attempts an hour per address makes walking the space impractical.
 */
const SAME_ANSWER =
  "We could not find an order with that number and mobile number.";

export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    await rateLimit("track-lookup", await clientIp(), 5, 3600);

    const body = await request.json().catch(() => null);
    const parsed = trackLookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: SAME_ANSWER },
        { status: 400, headers: noStore },
      );
    }

    const order = await findOrderByNumberAndMobile(
      parsed.data.orderNumber,
      parsed.data.mobile,
    );

    if (!order) {
      return NextResponse.json(
        { ok: false, error: SAME_ANSWER },
        { status: 404, headers: noStore },
      );
    }

    return NextResponse.json({ ok: true, order }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/track/lookup/route.ts src/lib/validation/schemas.ts
git commit -m "feat: look up one order by number and mobile" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The cancel route

**Files:**
- Create: `src/app/api/orders/cancel/route.ts`
- Modify: `src/lib/validation/schemas.ts` (add `cancelOrderSchema`)

**Interfaces:**
- Consumes: `orderOwnership` from Task 3, `cancelAbility` from Task 2, `applyOrderTransition` from phase 2, `CUSTOMER_COOKIE`/`isCustomerKey` from Task 1.
- Produces: `POST /api/orders/cancel`.

- [ ] **Step 1: Add the schema**

In `src/lib/validation/schemas.ts`, after `trackLookupSchema`:

```ts
export const cancelOrderSchema = z.object({
  orderNumber: trimmed(40)
    .min(1, "Enter your order number")
    .transform((v) => v.toUpperCase()),
  /** Sent only when the browser has no customer cookie. */
  mobile: trimmed(24).optional(),
  reason: safeText(300).optional(),
});
```

- [ ] **Step 2: Write the route**

Create `src/app/api/orders/cancel/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cancelOrderSchema } from "@/lib/validation/schemas";
import { orderOwnership } from "@/lib/data/tracking";
import { applyOrderTransition } from "@/lib/commerce/apply-transition";
import { cancelAbility } from "@/lib/commerce/tracking-view";
import { CUSTOMER_COOKIE, isCustomerKey } from "@/lib/commerce/customer-key";
import { normalizeNepaliMobile } from "@/config/nepal";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";
import type { OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

/**
 * The customer's own cancel button.
 *
 * Ownership is proved by the customer cookie, or by the mobile number on the
 * order for a browser that lost it. What the request is allowed to do then
 * depends only on where the order is: before dispatch it cancels outright and
 * stock goes back; once a courier holds the parcel it becomes a request for an
 * admin to decide. Both go through applyOrderTransition, so neither can skip
 * restocking or the audit trail.
 */
const NOT_FOUND = "We could not find that order.";

export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    await rateLimit("order-cancel", await clientIp(), 10, 3600);

    const body = await request.json().catch(() => null);
    const parsed = cancelOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND },
        { status: 400, headers: noStore },
      );
    }

    const owner = await orderOwnership(parsed.data.orderNumber);
    if (!owner) {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND },
        { status: 404, headers: noStore },
      );
    }

    const cookieKey = (await cookies()).get(CUSTOMER_COOKIE)?.value;
    const byCookie =
      isCustomerKey(cookieKey) &&
      owner.customerKey !== null &&
      cookieKey === owner.customerKey;

    const supplied = parsed.data.mobile
      ? normalizeNepaliMobile(parsed.data.mobile)
      : null;
    const byMobile = supplied !== null && owner.mobile === supplied;

    if (!byCookie && !byMobile) {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND },
        { status: 404, headers: noStore },
      );
    }

    const snap = await requireDb()
      .collection(COLLECTIONS.orders)
      .doc(owner.id)
      .get();
    const status = (snap.data()?.orderStatus ?? "pending") as OrderStatus;

    const ability = cancelAbility(status);
    if (ability === "none") {
      return NextResponse.json(
        { ok: false, error: "This order can no longer be cancelled online. Please call us." },
        { status: 409, headers: noStore },
      );
    }

    await applyOrderTransition({
      orderId: owner.id,
      to: ability === "cancel" ? "cancelled" : "cancellation_requested",
      actor: "customer",
      actorLabel: "customer",
      reason: parsed.data.reason,
    });

    return NextResponse.json(
      { ok: true, outcome: ability },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 3: Confirm the transition errors surface sensibly**

Read `src/lib/utils/api.ts`. If `errorResponse` does not already recognise `OrderTransitionError`, add a branch that returns its `message` with status 409, matching how `CommerceError` is handled. A customer pressing cancel twice must get "That order is already in this state", not a generic 500.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/cancel/route.ts src/lib/validation/schemas.ts src/lib/utils/api.ts
git commit -m "feat: let a customer cancel, or ask to cancel after dispatch" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: The tracking pages

**Files:**
- Create: `src/app/track/page.tsx`
- Create: `src/app/track/[orderNumber]/page.tsx`
- Create: `src/components/track/OrderCard.tsx`
- Create: `src/components/track/LookupForm.tsx`
- Create: `src/components/track/CancelControl.tsx`
- Modify: `src/app/robots.ts`

**Interfaces:**
- Consumes: everything from Tasks 2, 3, 4 and 5.

- [ ] **Step 1: Build the shared order card**

Create `src/components/track/OrderCard.tsx`, a server-safe presentational component:

```tsx
import Link from "next/link";
import { formatNpr } from "@/lib/utils/money";
import type { TrackedOrder } from "@/lib/commerce/tracking-view";

export function OrderCard({
  order,
  href,
}: {
  order: TrackedOrder;
  href?: string;
}) {
  return (
    <article className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tabular text-[0.9375rem] font-bold text-charcoal">
          {order.orderNumber}
        </p>
        <span className="rounded-[7px] border border-forest/30 bg-forest/10 px-2 py-1 text-[0.6875rem] font-semibold text-forest">
          {order.statusLabel}
        </span>
      </div>

      <p className="mt-2 text-[0.8125rem] text-muted">
        {order.items
          .map((i) => `${i.name} ${i.variantLabel} x${i.quantity}`)
          .join(", ")}
      </p>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.8125rem] text-muted">
          {order.deliveryMethodName}
          {order.deliveryEstimate ? ` . ${order.deliveryEstimate}` : ""}
        </p>
        <p className="tabular text-[0.9375rem] font-semibold text-charcoal">
          {formatNpr(order.grandTotalMinor)}
        </p>
      </div>

      {href && (
        <Link
          href={href}
          className="mt-4 inline-block text-[0.8125rem] font-semibold text-forest underline underline-offset-4"
        >
          See details
        </Link>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Build the lookup form**

Create `src/components/track/LookupForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { OrderCard } from "./OrderCard";
import type { TrackedOrder } from "@/lib/commerce/tracking-view";

export function LookupForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setOrder(null);

    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber, mobile }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "We could not find that order.");
        return;
      }
      setOrder(data.order as TrackedOrder);
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Order number"
          required
          value={orderNumber}
          placeholder="TMG-2609-0042"
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        <Input
          label="Mobile number on the order"
          required
          inputMode="numeric"
          value={mobile}
          placeholder="98XXXXXXXX"
          onChange={(e) => setMobile(e.target.value)}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            <span>{busy ? "Looking..." : "Find my order"}</span>
          </Button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[12px] border border-critical/35 bg-critical/[0.04] p-3.5 text-[0.8125rem] font-medium text-critical"
        >
          {error}
        </p>
      )}

      {order && (
        <div className="mt-5">
          <OrderCard order={order} />
        </div>
      )}
    </div>
  );
}
```

Check `src/components/ui/Field.tsx` for the `Input` component's actual props before writing this; match its existing signature rather than inventing one.

- [ ] **Step 3: Build the list page**

Create `src/app/track/page.tsx`:

```tsx
import { cookies } from "next/headers";
import Link from "next/link";
import { CUSTOMER_COOKIE, isCustomerKey } from "@/lib/commerce/customer-key";
import { listOrdersForCustomer } from "@/lib/data/tracking";
import { OrderCard } from "@/components/track/OrderCard";
import { LookupForm } from "@/components/track/LookupForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your orders",
  description: "Track an order you placed with TMG Cleaner.",
};

export default async function TrackPage() {
  const key = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  const orders = isCustomerKey(key) ? await listOrdersForCustomer(key) : [];

  return (
    <main className="shell py-[var(--spacing-section)]">
      <h1 className="display-sub">Your orders</h1>
      <p className="mt-3 max-w-[48ch] text-[0.9375rem] text-muted">
        Orders placed from this device appear here. There is no account to sign
        in to.
      </p>

      {orders.length > 0 ? (
        <div className="mt-8 grid gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.orderNumber}
              order={order}
              href={`/track/${order.orderNumber}`}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-[16px] border border-dashed border-charcoal/25 bg-paper/60 p-5 text-[0.875rem] text-muted">
          No orders from this device yet. If you ordered from another phone or
          browser, find it below.
        </p>
      )}

      <section className="mt-12 rounded-[16px] border border-charcoal/12 bg-paper p-5 sm:p-6">
        <h2 className="text-[1rem] font-bold text-charcoal">
          Find an order from another device
        </h2>
        <p className="mb-5 mt-2 max-w-[52ch] text-[0.875rem] text-muted">
          Enter the order number from your confirmation and the mobile number
          you gave us.
        </p>
        <LookupForm />
      </section>

      <p className="mt-10 text-[0.8125rem] text-muted">
        <Link href="/" className="font-semibold text-forest underline underline-offset-4">
          Back to the shop
        </Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Build the detail page**

Create `src/app/track/[orderNumber]/page.tsx`. Note this project's `PageProps` convention, already used in `src/app/admin/(dashboard)/orders/page.tsx`:

```tsx
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CUSTOMER_COOKIE, isCustomerKey } from "@/lib/commerce/customer-key";
import { findOrderForCustomer, timelineForOrder } from "@/lib/data/tracking";
import { cancelAbility } from "@/lib/commerce/tracking-view";
import { CancelControl } from "@/components/track/CancelControl";
import { formatNpr } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({
  params,
}: PageProps<"/track/[orderNumber]">) {
  const { orderNumber } = await params;
  const key = (await cookies()).get(CUSTOMER_COOKIE)?.value;

  if (!isCustomerKey(key)) notFound();

  const order = await findOrderForCustomer(
    decodeURIComponent(orderNumber).toUpperCase(),
    key,
  );
  if (!order) notFound();

  const timeline = await timelineForOrder(order.id);
  const ability = cancelAbility(order.orderStatus);

  return (
    <main className="shell py-[var(--spacing-section)]">
      <p className="text-[0.8125rem] text-muted">
        <Link href="/track" className="font-semibold text-forest underline underline-offset-4">
          All your orders
        </Link>
      </p>

      <h1 className="display-sub mt-4">{order.orderNumber}</h1>
      <p className="mt-2 text-[0.9375rem] text-charcoal">{order.statusLabel}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            Progress
          </h2>
          <ol className="mt-4 space-y-3">
            {timeline.map((event) => (
              <li key={`${event.at}-${event.label}`} className="flex gap-3">
                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
                <div>
                  <p className="text-[0.875rem] font-semibold text-charcoal">{event.label}</p>
                  <p className="tabular text-[0.75rem] text-muted">
                    {new Date(event.at).toLocaleString("en-GB")}
                  </p>
                </div>
              </li>
            ))}
            {timeline.length === 0 && (
              <li className="text-[0.875rem] text-muted">
                We will update this as your order moves.
              </li>
            )}
          </ol>

          {order.deliveryAttempts > 0 && (
            <p className="mt-5 text-[0.8125rem] text-muted">
              Delivery attempts so far: {order.deliveryAttempts}. We will call you
              to arrange the next one.
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
              Order
            </h2>
            <ul className="mt-3 space-y-2 text-[0.8125rem]">
              {order.items.map((item) => (
                <li key={`${item.name}-${item.variantLabel}`} className="flex justify-between gap-3">
                  <span className="text-charcoal">
                    {item.name} <span className="text-muted">({item.variantLabel})</span>
                    <span className="tabular text-muted"> x{item.quantity}</span>
                  </span>
                  <span className="tabular shrink-0">{formatNpr(item.lineTotalMinor)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-charcoal/12 pt-3">
              <span className="text-[0.875rem] font-bold text-charcoal">Total</span>
              <span className="tabular text-[0.875rem] font-bold text-charcoal">
                {formatNpr(order.grandTotalMinor)}
              </span>
            </div>
            <p className="mt-3 text-[0.8125rem] text-muted">
              {order.deliveryMethodName}
              {order.deliveryEstimate ? ` . ${order.deliveryEstimate}` : ""}
            </p>
            <p className="mt-1 text-[0.8125rem] text-muted">
              {[order.deliveryAddress.area, order.deliveryAddress.municipality, order.deliveryAddress.district]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>

          <CancelControl
            orderNumber={order.orderNumber}
            ability={ability}
            cancellationState={order.cancellationState}
          />
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Build the cancel control**

Create `src/components/track/CancelControl.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CancellationState } from "@/types";

export function CancelControl({
  orderNumber,
  ability,
  cancellationState,
}: {
  orderNumber: string;
  ability: "cancel" | "request" | "none";
  cancellationState: CancellationState;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();

  if (cancellationState === "requested") {
    return (
      <div className="rounded-[16px] border border-caution/40 bg-caution/[0.06] p-5">
        <p className="text-[0.875rem] font-semibold text-charcoal">
          You asked us to cancel this order
        </p>
        <p className="mt-2 text-[0.8125rem] text-muted">
          The parcel is already with the courier, so someone here is confirming
          it. We will call you either way.
        </p>
      </div>
    );
  }

  if (ability === "none") return null;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "We could not cancel that order.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
      <h2 className="text-[0.875rem] font-bold text-charcoal">
        {ability === "cancel" ? "Cancel this order" : "Need to cancel?"}
      </h2>
      <p className="mt-2 text-[0.8125rem] text-muted">
        {ability === "cancel"
          ? "We have not sent this out yet, so you can cancel it right now."
          : "This order is already with the courier. We can ask them to stop it, and someone here will confirm with you."}
      </p>

      {!open ? (
        <Button size="sm" variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
          <span>{ability === "cancel" ? "Cancel order" : "Request cancellation"}</span>
        </Button>
      ) : (
        <div className="mt-4">
          <label className="block text-[0.75rem] font-semibold text-charcoal">
            Reason, optional
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ordered the wrong size"
              className="mt-1.5 block h-10 w-full rounded-[10px] border border-charcoal/18 bg-paper px-3 text-[0.8125rem] font-normal"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={submit}>
              <span>{busy ? "Sending..." : "Confirm"}</span>
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
              <span>Keep my order</span>
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[0.8125rem] font-medium text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Keep the tracking pages out of search results**

In `src/app/robots.ts`, add `/track` to the disallow list alongside the existing admin and api entries. These pages are per-customer and have no business being crawled or indexed.

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all clean, and `/track` plus `/track/[orderNumber]` appear in the build's route list.

- [ ] **Step 8: Commit**

```bash
git add src/app/track src/components/track src/app/robots.ts
git commit -m "feat: add the customer order tracking pages" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Point customers at it

**Files:**
- Modify: `src/components/checkout/OrderSuccess.tsx`
- Modify: `src/components/layout/SiteFooter.tsx`

- [ ] **Step 1: Link from the confirmation**

In `src/components/checkout/OrderSuccess.tsx`, replace the closing line "Keep your order number. We use it to find your order quickly." with a link to the tracking page, keeping the same muted styling:

```tsx
      <p className="mx-auto mt-6 max-w-[30rem] text-center text-[0.75rem] text-muted">
        Keep your order number. You can follow this order any time at{" "}
        <a
          href="/track"
          className="font-semibold text-charcoal underline underline-offset-4"
        >
          your orders
        </a>
        .
      </p>
```

- [ ] **Step 2: Link from the footer**

Read `src/components/layout/SiteFooter.tsx` and add a "Track an order" link to the existing navigation list, matching how the privacy and terms links are rendered there. Do not restructure the footer; the design directive is that it stays small.

- [ ] **Step 3: Verify in the browser**

Start the preview and walk the real flow:

1. Place an order on the storefront.
2. Follow the "your orders" link from the confirmation. The order must be listed.
3. Open it. The timeline must show "Order placed" and nothing containing staff text.
4. Press Cancel order, confirm, and watch the status become Cancelled.
5. Reload `/track`. The order still lists, now Cancelled, and the cancel control is gone.
6. Open the browser's devtools and confirm `document.cookie` does **not** contain `__tmg_customer`; it is httpOnly.

- [ ] **Step 4: Verify the projection really is sealed**

With an order open, fetch its own page and confirm none of the internal fields appear:

```bash
curl -s http://localhost:PORT/track/ORDER_NUMBER -H "cookie: __tmg_customer=KEY" | grep -iE "customerKey|203\.0|userAgent|courierPartnerId|externalReference" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add src/components/checkout/OrderSuccess.tsx src/components/layout/SiteFooter.tsx
git commit -m "feat: point customers at their order tracking" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Done when

- Placing an order sets an httpOnly `__tmg_customer` cookie that scripts cannot read, and the order carries that key.
- `/track` lists the orders placed from that browser and nothing else.
- A customer with no cookie can find one order with its number and the mobile number on it, and a wrong mobile is indistinguishable from an order that does not exist.
- Cancelling before dispatch cancels immediately and returns stock; after dispatch it creates a `cancellation_requested` order that the admin sees.
- No response, page or URL contains the customer key, the fraud `meta` block, partner attribution, or any admin note text.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` all pass.
