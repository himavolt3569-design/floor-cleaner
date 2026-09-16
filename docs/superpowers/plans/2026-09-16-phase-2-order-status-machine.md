# Phase 2: Order status machine, stock restoration and delivery failures

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the order lifecycle a real state machine that cannot lose stock, cannot skip its audit trail, and records why a delivery failed — closing the live bug where cancelling an order keeps its stock decrement forever.

**Architecture:** Three modules with one responsibility each. `order-status.ts` is the transition table and nothing else. `order-transition.ts` turns an order plus a requested move into a plan of changes, purely, so every rule that matters — restock exactly once, refuse to cancel reconciled money, bump the attempt counter, flip a paid order to refunded — is unit tested without a database. `apply-transition.ts` is the only module that writes: it reads the order in a transaction, asks the planner what to do, and does it. Every actor, admin now and the customer in phase 3, goes through that one function.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19, TypeScript strict, Zod, Firebase Admin SDK, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-16-order-lifecycle-design.md` (section 1, and the admin half of section 6)

## Global Constraints

- Money is always an integer number of paisa in a field named `*Minor`.
- `applyOrderTransition` must become the only writer of `orderStatus` in the codebase. No other module may set that field.
- Every admin mutation re-verifies the session and the `superAdmin` claim before touching anything, and records an `orderEvents` document.
- Pure modules (`order-status.ts`, `order-transition.ts`) must not import `server-only`, `firebase-admin`, or anything that reaches Firestore. They take plain data and return plain data.
- Firestore transactions must perform every read before the first write.
- This is not the Next.js in your training data. Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code.
- Verification commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## A note on verification limits

The admin area sits behind a Firebase session cookie and a `superAdmin` claim, so an agent cannot sign in to click through it. Tasks 1 and 2 are covered by unit tests. Tasks 3 to 5 are verified by typecheck, lint, and a code read of the transaction; the end-to-end click-through — cancel an order, watch stock go back up — is listed at the end of this plan as a short manual pass for the person who owns the admin account. Do not claim those tasks are verified end to end.

---

### Task 1: Extend the order domain and write the transition table

**Files:**
- Modify: `src/types/index.ts:9-17` (the `OrderStatus` union), and the `Order` interface
- Create: `src/lib/commerce/order-status.ts`
- Create: `src/lib/commerce/order-status.test.ts`
- Modify: `src/components/admin/ui.tsx:75-83` (`ORDER_TONE`), `:94-102` (`ORDER_LABEL`)
- Modify: `src/lib/data/admin.ts` (map the new fields in `listOrders`)
- Modify: `src/app/admin/actions.ts:59-66` (`ORDER_STATUSES`)

**Interfaces:**
- Produces, from `src/lib/commerce/order-status.ts`:
  - `type TransitionActor = "admin" | "customer" | "system"`
  - `ORDER_STATUSES: readonly OrderStatus[]`
  - `canTransition(from: OrderStatus, to: OrderStatus, actor: TransitionActor): boolean`
  - `isTerminal(status: OrderStatus): boolean`
  - `RESTOCK_ON: OrderStatus[]`, `CUSTOMER_SELF_CANCEL: OrderStatus[]`, `CUSTOMER_REQUEST_FROM: OrderStatus[]`
- Produces, from `src/types/index.ts`: the widened `OrderStatus`, plus `DeliveryFailureReason`, `CancellationState` and `OrderCancellation`.
- Consumed by Task 2 (`planTransition`) and Task 3 (`applyOrderTransition`).

- [ ] **Step 1: Widen the order status union and add the new domain types**

In `src/types/index.ts`, replace the `OrderStatus` union with:

```ts
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "out_for_delivery"
  | "delivery_failed"
  | "delivered"
  | "cancellation_requested"
  | "cancelled"
  | "returned";

/** Why a courier could not hand the parcel over. Fixed list plus a free note. */
export type DeliveryFailureReason =
  | "customer_unreachable"
  | "address_not_found"
  | "customer_refused"
  | "payment_not_ready"
  | "rescheduled_by_customer"
  | "area_not_serviced"
  | "damaged_in_transit"
  | "other";

export type CancellationState = "none" | "requested" | "approved" | "refused";

export interface OrderCancellation {
  state: CancellationState;
  /** Who asked. An admin cancelling outright is recorded as "admin". */
  requestedBy: "customer" | "admin" | null;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
}
```

Then add these fields to the `Order` interface, directly after `orderStatus`:

```ts
  /** Number of times a courier has attempted delivery. */
  deliveryAttempts: number;
  lastFailureReason: DeliveryFailureReason | null;
  lastFailureNote: string | null;
  cancellation: OrderCancellation | null;
  /** Set once, when stock has been returned. Guards against double restocking. */
  stockRestoredAt: string | null;
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/commerce/order-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  RESTOCK_ON,
  canTransition,
  isTerminal,
} from "./order-status";
import type { OrderStatus } from "@/types";

describe("canTransition, as an admin", () => {
  it("walks the normal fulfilment path", () => {
    expect(canTransition("pending", "confirmed", "admin")).toBe(true);
    expect(canTransition("confirmed", "packed", "admin")).toBe(true);
    expect(canTransition("packed", "out_for_delivery", "admin")).toBe(true);
    expect(canTransition("out_for_delivery", "delivered", "admin")).toBe(true);
  });

  it("refuses to skip from pending straight to delivered", () => {
    expect(canTransition("pending", "delivered", "admin")).toBe(false);
  });

  it("refuses to move backwards", () => {
    expect(canTransition("packed", "pending", "admin")).toBe(false);
  });

  it("allows a failed delivery to be retried or returned", () => {
    expect(canTransition("out_for_delivery", "delivery_failed", "admin")).toBe(true);
    expect(canTransition("delivery_failed", "out_for_delivery", "admin")).toBe(true);
    expect(canTransition("delivery_failed", "returned", "admin")).toBe(true);
  });

  it("decides a cancellation request either way", () => {
    expect(canTransition("cancellation_requested", "cancelled", "admin")).toBe(true);
    expect(canTransition("cancellation_requested", "out_for_delivery", "admin")).toBe(true);
  });

  it("treats delivered, cancelled and returned as final", () => {
    expect(canTransition("delivered", "cancelled", "admin")).toBe(false);
    expect(canTransition("cancelled", "pending", "admin")).toBe(false);
    expect(canTransition("returned", "delivered", "admin")).toBe(false);
  });
});

describe("canTransition, as a customer", () => {
  it("cancels outright before the parcel is dispatched", () => {
    for (const from of ["pending", "confirmed", "processing", "packed"] as OrderStatus[]) {
      expect(canTransition(from, "cancelled", "customer")).toBe(true);
    }
  });

  it("cannot cancel outright once the parcel is with the courier", () => {
    expect(canTransition("out_for_delivery", "cancelled", "customer")).toBe(false);
    expect(canTransition("delivery_failed", "cancelled", "customer")).toBe(false);
  });

  it("can only request a cancellation after dispatch", () => {
    expect(canTransition("out_for_delivery", "cancellation_requested", "customer")).toBe(true);
    expect(canTransition("delivery_failed", "cancellation_requested", "customer")).toBe(true);
    expect(canTransition("pending", "cancellation_requested", "customer")).toBe(false);
  });

  it("cannot drive fulfilment", () => {
    expect(canTransition("packed", "out_for_delivery", "customer")).toBe(false);
    expect(canTransition("out_for_delivery", "delivered", "customer")).toBe(false);
    expect(canTransition("cancellation_requested", "cancelled", "customer")).toBe(false);
  });
});

describe("the table itself", () => {
  it("covers every status", () => {
    expect(ORDER_STATUSES).toHaveLength(10);
    for (const status of ORDER_STATUSES) {
      expect(() => canTransition(status, "cancelled", "admin")).not.toThrow();
    }
  });

  it("restores stock only for cancelled and returned", () => {
    expect(RESTOCK_ON).toEqual(["cancelled", "returned"]);
  });

  it("agrees with isTerminal", () => {
    expect(isTerminal("delivered")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("returned")).toBe(true);
    expect(isTerminal("pending")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test src/lib/commerce/order-status.test.ts`
Expected: FAIL, cannot resolve `./order-status`.

- [ ] **Step 4: Write the transition table**

Create `src/lib/commerce/order-status.ts`:

```ts
import type { OrderStatus } from "@/types";

/**
 * The order lifecycle, as one table.
 *
 * Admin actions, the customer's own cancel button and a courier failure all
 * consult this, so there is exactly one answer to "can this order move there",
 * and no path that quietly invents its own rules.
 *
 * Pure by design: no Firestore, no session, just the shape of the lifecycle.
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivery_failed",
  "delivered",
  "cancellation_requested",
  "cancelled",
  "returned",
] as const satisfies readonly OrderStatus[];

export type TransitionActor = "admin" | "customer" | "system";

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "packed", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "delivery_failed", "cancellation_requested"],
  delivery_failed: [
    "out_for_delivery",
    "returned",
    "cancellation_requested",
    "cancelled",
  ],
  // Refusing a request puts the parcel back on the road; the courier may also
  // have delivered it while the request was being considered.
  cancellation_requested: ["cancelled", "out_for_delivery", "delivered"],
  delivered: [],
  cancelled: [],
  returned: [],
};

/** Entering one of these returns the reserved stock to the shelf. */
export const RESTOCK_ON: OrderStatus[] = ["cancelled", "returned"];

/** A customer may cancel outright only while we still hold the parcel. */
export const CUSTOMER_SELF_CANCEL: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
];

/** Once a courier holds it, the customer may only ask. */
export const CUSTOMER_REQUEST_FROM: OrderStatus[] = [
  "out_for_delivery",
  "delivery_failed",
];

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED[status].length === 0;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): boolean {
  if (!ALLOWED[from]?.includes(to)) return false;

  if (actor === "admin") return true;

  if (actor === "customer") {
    if (to === "cancelled") return CUSTOMER_SELF_CANCEL.includes(from);
    if (to === "cancellation_requested") return CUSTOMER_REQUEST_FROM.includes(from);
    return false;
  }

  // "system" has no automatic status moves yet. Auto-assignment in phase 5
  // attributes a courier; it does not advance the lifecycle.
  return false;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test src/lib/commerce/order-status.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 6: Teach the admin UI the three new statuses**

Widening `OrderStatus` breaks two exhaustive `Record<OrderStatus, string>` maps, which is the point — typecheck will not pass until both know the new states.

In `src/components/admin/ui.tsx`, add to `ORDER_TONE`, after the `out_for_delivery` line:

```ts
  delivery_failed: "border-critical/40 bg-critical/10 text-critical",
```

and after the `delivered` line:

```ts
  cancellation_requested: "border-caution/45 bg-caution/14 text-caution",
```

and after the `cancelled` line:

```ts
  returned: "border-charcoal/20 bg-charcoal/[0.05] text-muted",
```

In `ORDER_LABEL`, add the matching entries in the same positions:

```ts
  delivery_failed: "Delivery failed",
  cancellation_requested: "Cancellation requested",
  returned: "Returned",
```

- [ ] **Step 7: Accept the new statuses in the admin action schema**

In `src/app/admin/actions.ts`, replace the `ORDER_STATUSES` constant with an import from the new module, so the list cannot drift. Delete the local `const ORDER_STATUSES = [...] as const;` block and add to the imports at the top of the file:

```ts
import { ORDER_STATUSES } from "@/lib/commerce/order-status";
```

The existing `z.enum(ORDER_STATUSES)` call keeps working because the exported constant is a readonly tuple.

- [ ] **Step 8: Map the new fields when reading orders**

In `src/lib/data/admin.ts`, inside the object returned by `listOrders`, add after the `orderStatus` line:

```ts
      deliveryAttempts: Number(d.deliveryAttempts ?? 0),
      lastFailureReason: d.lastFailureReason ?? null,
      lastFailureNote: d.lastFailureNote ?? null,
      cancellation: d.cancellation ?? null,
      stockRestoredAt: d.stockRestoredAt ? toIso(d.stockRestoredAt) : null,
```

Existing orders have none of these fields, which is why every one has a default.

- [ ] **Step 9: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean. If typecheck complains about a missing key in a `Record<OrderStatus, ...>`, a map was missed in step 6.

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/lib/commerce/order-status.ts src/lib/commerce/order-status.test.ts src/components/admin/ui.tsx src/lib/data/admin.ts src/app/admin/actions.ts
git commit -m "feat: add the order transition table and the new lifecycle states" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The transition planner

**Files:**
- Create: `src/lib/commerce/order-transition.ts`
- Create: `src/lib/commerce/order-transition.test.ts`

**Interfaces:**
- Consumes: `canTransition`, `RESTOCK_ON` from Task 1.
- Produces:
  - `class OrderTransitionError extends Error` with `readonly code: "illegal" | "unchanged" | "reconciled" | "missing_reason"`
  - `interface TransitionOrder { orderStatus; paymentStatus; stockRestoredAt: string | null; deliveryAttempts: number; items: { productId; variantId; quantity }[]; hasPartnerLedger: boolean }`
  - `interface TransitionRequest { to: OrderStatus; actor: TransitionActor; actorLabel: string; reason?: string; failureReason?: DeliveryFailureReason }`
  - `interface TransitionPlan { status; restockItems; markStockRestored: boolean; paymentStatus: PaymentStatus | null; deliveryAttempts: number | null; failure: { reason; note } | null; cancellation: Partial<OrderCancellation> | null; event: { type: string; message: string } }`
  - `planTransition(order: TransitionOrder, request: TransitionRequest): TransitionPlan`
- Consumed by Task 3.

A `null` on `paymentStatus`, `deliveryAttempts`, `failure` or `cancellation` means "leave this field alone".

- [ ] **Step 1: Write the failing test**

Create `src/lib/commerce/order-transition.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { OrderTransitionError, planTransition } from "./order-transition";
import type { TransitionOrder } from "./order-transition";

function order(over: Partial<TransitionOrder> = {}): TransitionOrder {
  return {
    orderStatus: "pending",
    paymentStatus: "unpaid",
    stockRestoredAt: null,
    deliveryAttempts: 0,
    items: [
      { productId: "p1", variantId: "v1", quantity: 2 },
      { productId: "p1", variantId: "v2", quantity: 1 },
    ],
    hasPartnerLedger: false,
    ...over,
  };
}

describe("refusals", () => {
  it("refuses an illegal move", () => {
    expect(() =>
      planTransition(order(), { to: "delivered", actor: "admin", actorLabel: "a@b.c" }),
    ).toThrowError(OrderTransitionError);
  });

  it("refuses a move to the status the order is already in", () => {
    try {
      planTransition(order({ orderStatus: "packed" }), {
        to: "packed",
        actor: "admin",
        actorLabel: "a@b.c",
      });
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as OrderTransitionError).code).toBe("unchanged");
    }
  });

  it("refuses to cancel an order whose money is already reconciled", () => {
    try {
      planTransition(order({ hasPartnerLedger: true }), {
        to: "cancelled",
        actor: "admin",
        actorLabel: "a@b.c",
      });
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as OrderTransitionError).code).toBe("reconciled");
    }
  });

  it("refuses to record a failed delivery without a reason", () => {
    try {
      planTransition(order({ orderStatus: "out_for_delivery" }), {
        to: "delivery_failed",
        actor: "admin",
        actorLabel: "a@b.c",
      });
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as OrderTransitionError).code).toBe("missing_reason");
    }
  });

  it("refuses a customer cancelling a dispatched order", () => {
    expect(() =>
      planTransition(order({ orderStatus: "out_for_delivery" }), {
        to: "cancelled",
        actor: "customer",
        actorLabel: "customer",
      }),
    ).toThrowError(OrderTransitionError);
  });
});

describe("restocking", () => {
  it("returns every line to stock when cancelling", () => {
    const plan = planTransition(order(), {
      to: "cancelled",
      actor: "admin",
      actorLabel: "a@b.c",
    });

    expect(plan.restockItems).toEqual([
      { productId: "p1", variantId: "v1", quantity: 2 },
      { productId: "p1", variantId: "v2", quantity: 1 },
    ]);
    expect(plan.markStockRestored).toBe(true);
  });

  it("returns stock when a parcel comes back", () => {
    const plan = planTransition(
      order({ orderStatus: "delivery_failed", deliveryAttempts: 1 }),
      { to: "returned", actor: "admin", actorLabel: "a@b.c" },
    );

    expect(plan.restockItems).toHaveLength(2);
    expect(plan.markStockRestored).toBe(true);
  });

  it("never restocks twice", () => {
    const plan = planTransition(
      order({ orderStatus: "delivery_failed", stockRestoredAt: "2026-09-16T10:00:00.000Z" }),
      { to: "returned", actor: "admin", actorLabel: "a@b.c" },
    );

    expect(plan.restockItems).toEqual([]);
    expect(plan.markStockRestored).toBe(false);
  });

  it("does not touch stock on an ordinary fulfilment move", () => {
    const plan = planTransition(order(), {
      to: "confirmed",
      actor: "admin",
      actorLabel: "a@b.c",
    });

    expect(plan.restockItems).toEqual([]);
    expect(plan.markStockRestored).toBe(false);
  });
});

describe("money", () => {
  it("marks a paid order refunded when it is cancelled", () => {
    const plan = planTransition(order({ paymentStatus: "paid" }), {
      to: "cancelled",
      actor: "admin",
      actorLabel: "a@b.c",
    });

    expect(plan.paymentStatus).toBe("refunded");
  });

  it("leaves an unpaid order's payment status alone", () => {
    const plan = planTransition(order({ paymentStatus: "unpaid" }), {
      to: "cancelled",
      actor: "admin",
      actorLabel: "a@b.c",
    });

    expect(plan.paymentStatus).toBeNull();
  });
});

describe("delivery failures", () => {
  it("records the reason and counts the attempt", () => {
    const plan = planTransition(
      order({ orderStatus: "out_for_delivery", deliveryAttempts: 1 }),
      {
        to: "delivery_failed",
        actor: "admin",
        actorLabel: "a@b.c",
        failureReason: "customer_unreachable",
        reason: "Phone switched off twice",
      },
    );

    expect(plan.deliveryAttempts).toBe(2);
    expect(plan.failure).toEqual({
      reason: "customer_unreachable",
      note: "Phone switched off twice",
    });
    expect(plan.event.type).toBe("delivery_failed");
  });
});

describe("cancellation requests", () => {
  it("records who asked and why", () => {
    const plan = planTransition(order({ orderStatus: "out_for_delivery" }), {
      to: "cancellation_requested",
      actor: "customer",
      actorLabel: "customer",
      reason: "Ordered the wrong size",
    });

    expect(plan.cancellation).toMatchObject({
      state: "requested",
      requestedBy: "customer",
      reason: "Ordered the wrong size",
    });
  });

  it("marks the request approved when an admin cancels", () => {
    const plan = planTransition(order({ orderStatus: "cancellation_requested" }), {
      to: "cancelled",
      actor: "admin",
      actorLabel: "a@b.c",
    });

    expect(plan.cancellation).toMatchObject({ state: "approved" });
    expect(plan.restockItems).toHaveLength(2);
  });

  it("marks the request refused when the parcel goes back out", () => {
    const plan = planTransition(order({ orderStatus: "cancellation_requested" }), {
      to: "out_for_delivery",
      actor: "admin",
      actorLabel: "a@b.c",
      reason: "Already at the door",
    });

    expect(plan.cancellation).toMatchObject({ state: "refused" });
    expect(plan.restockItems).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/commerce/order-transition.test.ts`
Expected: FAIL, cannot resolve `./order-transition`.

- [ ] **Step 3: Write the planner**

Create `src/lib/commerce/order-transition.ts`:

```ts
import { RESTOCK_ON, canTransition, type TransitionActor } from "./order-status";
import type {
  DeliveryFailureReason,
  OrderCancellation,
  OrderStatus,
  PaymentStatus,
} from "@/types";

/**
 * Decides what a status change means, without touching the database.
 *
 * Keeping this pure is what makes the rules that matter testable: stock comes
 * back exactly once, money that a partner has already reconciled blocks a
 * cancellation, a failed delivery must say why, and a paid order that is
 * cancelled lands in "refunded" for a human to settle.
 *
 * A null on paymentStatus, deliveryAttempts, failure or cancellation means
 * "leave that field as it is".
 */

export class OrderTransitionError extends Error {
  constructor(
    message: string,
    readonly code: "illegal" | "unchanged" | "reconciled" | "missing_reason",
  ) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

export interface TransitionOrder {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  stockRestoredAt: string | null;
  deliveryAttempts: number;
  items: { productId: string; variantId: string; quantity: number }[];
  /** True when a partner ledger entry already references this order. */
  hasPartnerLedger: boolean;
}

export interface TransitionRequest {
  to: OrderStatus;
  actor: TransitionActor;
  /** Email or "customer": recorded on the audit event, never shown publicly. */
  actorLabel: string;
  reason?: string;
  failureReason?: DeliveryFailureReason;
}

export interface TransitionPlan {
  status: OrderStatus;
  restockItems: { productId: string; variantId: string; quantity: number }[];
  markStockRestored: boolean;
  paymentStatus: PaymentStatus | null;
  deliveryAttempts: number | null;
  failure: { reason: DeliveryFailureReason; note: string } | null;
  cancellation: Partial<OrderCancellation> | null;
  event: { type: string; message: string };
}

export function planTransition(
  order: TransitionOrder,
  request: TransitionRequest,
): TransitionPlan {
  const { to, actor, reason } = request;
  const from = order.orderStatus;

  if (from === to) {
    throw new OrderTransitionError(
      "That order is already in this state.",
      "unchanged",
    );
  }

  if (!canTransition(from, to, actor)) {
    throw new OrderTransitionError(
      "That order cannot move to this state.",
      "illegal",
    );
  }

  if (to === "delivery_failed" && !request.failureReason) {
    throw new OrderTransitionError(
      "Choose a reason for the failed delivery.",
      "missing_reason",
    );
  }

  const restores = RESTOCK_ON.includes(to);

  // Money a partner has already accounted for cannot be unwound by flipping a
  // status. The ledger entry has to be reversed first, deliberately.
  if (restores && order.hasPartnerLedger) {
    throw new OrderTransitionError(
      "This order has partner money recorded against it. Reverse those entries first.",
      "reconciled",
    );
  }

  const restockItems =
    restores && !order.stockRestoredAt ? order.items.map((i) => ({ ...i })) : [];

  return {
    status: to,
    restockItems,
    markStockRestored: restockItems.length > 0,
    paymentStatus: restores && order.paymentStatus === "paid" ? "refunded" : null,
    deliveryAttempts:
      to === "delivery_failed" ? order.deliveryAttempts + 1 : null,
    failure:
      to === "delivery_failed" && request.failureReason
        ? { reason: request.failureReason, note: reason ?? "" }
        : null,
    cancellation: cancellationFor(from, to, actor, reason ?? null),
    event: eventFor(from, to, reason ?? null, request.failureReason ?? null),
  };
}

function cancellationFor(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
  reason: string | null,
): Partial<OrderCancellation> | null {
  if (to === "cancellation_requested") {
    return {
      state: "requested",
      requestedBy: actor === "customer" ? "customer" : "admin",
      reason,
    };
  }
  if (from === "cancellation_requested") {
    return { state: to === "cancelled" ? "approved" : "refused", reason };
  }
  if (to === "cancelled") {
    return {
      state: "approved",
      requestedBy: actor === "customer" ? "customer" : "admin",
      reason,
    };
  }
  return null;
}

function eventFor(
  from: OrderStatus,
  to: OrderStatus,
  reason: string | null,
  failureReason: DeliveryFailureReason | null,
): { type: string; message: string } {
  const tail = reason ? ` ${reason}` : "";

  if (to === "delivery_failed") {
    return {
      type: "delivery_failed",
      message: `Delivery attempt failed: ${failureReason}.${tail}`,
    };
  }
  if (to === "cancellation_requested") {
    return {
      type: "cancellation_requested",
      message: `Cancellation requested.${tail}`,
    };
  }
  if (to === "cancelled") {
    return { type: "order_cancelled", message: `Order cancelled.${tail}` };
  }
  if (to === "returned") {
    return { type: "order_returned", message: `Parcel returned to us.${tail}` };
  }
  if (from === "cancellation_requested") {
    return {
      type: "cancellation_refused",
      message: `Cancellation refused, order continues as ${to}.${tail}`,
    };
  }
  return { type: "status_changed", message: `Order marked ${to}.${tail}` };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/commerce/order-transition.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Verify the whole suite and the build**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all clean, 45 tests total across four files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/commerce/order-transition.ts src/lib/commerce/order-transition.test.ts
git commit -m "feat: plan order transitions, including restocking exactly once" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Apply transitions, and route every admin status change through them

**Files:**
- Create: `src/lib/commerce/apply-transition.ts`
- Modify: `src/app/admin/actions.ts:78-99` (`updateOrderStatus`), and add `cancelOrder`

**Interfaces:**
- Consumes: `planTransition`, `OrderTransitionError`, `TransitionOrder` from Task 2.
- Produces: `applyOrderTransition(input: { orderId: string; to: OrderStatus; actor: TransitionActor; actorLabel: string; reason?: string; failureReason?: DeliveryFailureReason }): Promise<void>`, consumed by Tasks 4 and 5 and by the customer cancel route in phase 3.
- Produces: `cancelOrder(orderId: string, reason: string): Promise<ActionResult>` in the admin actions module, consumed by Task 4's UI.

- [ ] **Step 1: Write the applier**

Create `src/lib/commerce/apply-transition.ts`:

```ts
import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { OrderTransitionError, planTransition } from "./order-transition";
import type { TransitionActor } from "./order-status";
import type { DeliveryFailureReason, OrderStatus } from "@/types";

/**
 * The only writer of `orderStatus` in this application.
 *
 * Reads the order, asks the pure planner what the move means, then performs
 * every consequence in one transaction: the status itself, returning stock to
 * the shelf, the payment status when a paid order is cancelled, and the audit
 * event. Because admin, customer and courier paths all come through here, none
 * of them can skip the restock or the audit trail.
 */

export interface ApplyTransitionInput {
  orderId: string;
  to: OrderStatus;
  actor: TransitionActor;
  actorLabel: string;
  reason?: string;
  failureReason?: DeliveryFailureReason;
}

export async function applyOrderTransition(
  input: ApplyTransitionInput,
): Promise<void> {
  const db = requireDb();
  const orderRef = db.collection(COLLECTIONS.orders).doc(input.orderId);

  // A partner ledger entry against this order means the money is already
  // reconciled; the planner refuses to restock in that case.
  const ledgerQuery = db
    .collection("partnerEntries")
    .where("orderId", "==", input.orderId)
    .limit(1);

  await db.runTransaction(async (tx) => {
    /* ------------------------------------------------- reads before writes */
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new OrderTransitionError("Order not found.", "illegal");
    }
    const ledger = await tx.get(ledgerQuery);

    const data = snap.data() ?? {};

    const plan = planTransition(
      {
        orderStatus: (data.orderStatus ?? "pending") as OrderStatus,
        paymentStatus: data.paymentStatus ?? "unpaid",
        stockRestoredAt: data.stockRestoredAt ? String(data.stockRestoredAt) : null,
        deliveryAttempts: Number(data.deliveryAttempts ?? 0),
        items: (data.items ?? []).map(
          (i: { productId: string; variantId: string; quantity: number }) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: Number(i.quantity ?? 0),
          }),
        ),
        hasPartnerLedger: !ledger.empty,
      },
      {
        to: input.to,
        actor: input.actor,
        actorLabel: input.actorLabel,
        reason: input.reason,
        failureReason: input.failureReason,
      },
    );

    /* ------------------------------------------------------------- writes */
    const update: Record<string, unknown> = {
      orderStatus: plan.status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (plan.markStockRestored) update.stockRestoredAt = new Date().toISOString();
    if (plan.paymentStatus) update.paymentStatus = plan.paymentStatus;
    if (plan.deliveryAttempts !== null) update.deliveryAttempts = plan.deliveryAttempts;
    if (plan.failure) {
      update.lastFailureReason = plan.failure.reason;
      update.lastFailureNote = plan.failure.note;
    }
    if (plan.cancellation) {
      update.cancellation = {
        state: plan.cancellation.state ?? "none",
        requestedBy: plan.cancellation.requestedBy ?? null,
        reason: plan.cancellation.reason ?? null,
        decidedBy: input.actor === "admin" ? input.actorLabel : null,
        decidedAt: input.actor === "admin" ? new Date().toISOString() : null,
      };
    }

    tx.update(orderRef, update);

    for (const item of plan.restockItems) {
      const variantRef = db
        .collection(COLLECTIONS.products)
        .doc(item.productId)
        .collection(COLLECTIONS.variants)
        .doc(item.variantId);

      tx.update(variantRef, {
        stock: FieldValue.increment(item.quantity),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(db.collection(COLLECTIONS.orderEvents).doc(), {
      orderId: input.orderId,
      orderNumber: data.orderNumber ?? null,
      type: plan.event.type,
      message: plan.event.message,
      actor: input.actorLabel,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
```

- [ ] **Step 2: Route the admin status action through it**

In `src/app/admin/actions.ts`, add to the imports:

```ts
import { applyOrderTransition } from "@/lib/commerce/apply-transition";
import { OrderTransitionError } from "@/lib/commerce/order-transition";
```

Replace the whole body of `updateOrderStatus` with:

```ts
export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z.enum(ORDER_STATUSES).safeParse(status);
    if (!parsed.success) return { ok: false, error: "Unknown order status." };

    await applyOrderTransition({
      orderId,
      to: parsed.data,
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
```

The old body wrote `orderStatus` directly and called `audit(...)`; both are now the applier's job.

- [ ] **Step 3: Surface the planner's refusals to the admin**

A refusal like "this order has partner money recorded against it" is useful and must not be flattened into the generic message. In `src/app/admin/actions.ts`, add this as the first check inside `fail`:

```ts
function fail(error: unknown): ActionResult {
  if (error instanceof OrderTransitionError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof NotAuthorisedError) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  console.error("[admin action]", error);
  return { ok: false, error: "That did not save. Please try again." };
}
```

- [ ] **Step 4: Add an admin cancel that carries a reason**

Still in `src/app/admin/actions.ts`, add this directly after `updateOrderStatus`:

```ts
/**
 * Cancelling is not just a status: it returns stock, and a paid order becomes
 * refunded for manual settlement. Both happen inside applyOrderTransition.
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z.string().trim().max(500).safeParse(reason);
    if (!parsed.success) return { ok: false, error: "That reason is too long." };

    await applyOrderTransition({
      orderId,
      to: "cancelled",
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
      reason: parsed.data,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
```

- [ ] **Step 5: Route the payment confirmation nudge through the applier too**

`setPaymentStatus` currently advances a pending order to `confirmed` by writing `orderStatus` inside its own transaction. That is a second writer, so the "only writer" rule would be false the moment it runs. Move the advance out of the write and into the machine.

In `src/app/admin/actions.ts`, replace the transaction inside `setPaymentStatus` with:

```ts
    const shouldConfirm = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Order not found");

      tx.update(ref, {
        paymentStatus: parsed.data,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Confirming payment on a still-pending order also moves it forward, but
      // that move belongs to the transition machine, not to this write.
      return parsed.data === "paid" && snap.data()?.orderStatus === "pending";
    });

    if (shouldConfirm) {
      await applyOrderTransition({
        orderId,
        to: "confirmed",
        actor: "admin",
        actorLabel: admin.email ?? admin.uid,
        reason: "Payment confirmed.",
      });
    }
```

The existing `audit(...)` call below it stays: it records the payment change, while the applier records the status change.

- [ ] **Step 6: Confirm nothing else writes the status**

Run: `grep -rn "orderStatus" src --include=*.ts --include=*.tsx | grep -v "\.test\.ts"`

Expected: assignments appear only in `src/lib/commerce/apply-transition.ts` and in `src/lib/commerce/orders.ts`, where order creation sets the initial `pending`. Every other hit must be a read, a type declaration, or a comparison. If any other assignment survives, route it through `applyOrderTransition` before moving on.

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/commerce/apply-transition.ts src/app/admin/actions.ts
git commit -m "feat: restore stock when an order is cancelled or returned" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Delivery failures in the admin

**Files:**
- Modify: `src/app/admin/actions.ts` (add `recordDeliveryFailure`)
- Modify: `src/components/admin/OrdersTable.tsx:12-19` (the `FLOW` list), `:200-234` (the fulfilment block)
- Modify: `src/app/admin/(dashboard)/orders/page.tsx:8-19` (the filter list)

**Interfaces:**
- Consumes: `applyOrderTransition` from Task 3, `cancelOrder` from Task 3.
- Produces: `recordDeliveryFailure(orderId: string, reason: string, note: string): Promise<ActionResult>`.
- Produces: `DELIVERY_FAILURE_LABEL: Record<DeliveryFailureReason, string>` exported from `src/components/admin/ui.tsx`, consumed by the table.

- [ ] **Step 1: Add the action**

In `src/app/admin/actions.ts`, add after `cancelOrder`:

```ts
const FAILURE_REASONS = [
  "customer_unreachable",
  "address_not_found",
  "customer_refused",
  "payment_not_ready",
  "rescheduled_by_customer",
  "area_not_serviced",
  "damaged_in_transit",
  "other",
] as const;

/** Records a courier's failed attempt, with why, and counts the attempt. */
export async function recordDeliveryFailure(
  orderId: string,
  reason: string,
  note: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z
      .object({
        reason: z.enum(FAILURE_REASONS),
        note: z.string().trim().max(500),
      })
      .safeParse({ reason, note });

    if (!parsed.success) return { ok: false, error: "Choose a failure reason." };

    await applyOrderTransition({
      orderId,
      to: "delivery_failed",
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
      failureReason: parsed.data.reason,
      reason: parsed.data.note,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
```

- [ ] **Step 2: Add the reason labels**

In `src/components/admin/ui.tsx`, add after `ORDER_LABEL`:

```ts
export const DELIVERY_FAILURE_LABEL: Record<DeliveryFailureReason, string> = {
  customer_unreachable: "Customer unreachable",
  address_not_found: "Address not found",
  customer_refused: "Customer refused the parcel",
  payment_not_ready: "Customer could not pay",
  rescheduled_by_customer: "Customer asked to reschedule",
  area_not_serviced: "Area not serviced",
  damaged_in_transit: "Damaged in transit",
  other: "Other",
};
```

and extend the type import at the top of that file to `import type { DeliveryFailureReason, OrderStatus, PaymentStatus } from "@/types";`.

- [ ] **Step 3: Replace the fulfilment controls**

In `src/components/admin/OrdersTable.tsx`, change the imports to:

```ts
import {
  cancelOrder,
  recordDeliveryFailure,
  setPaymentStatus,
  updateOrderStatus,
} from "@/app/admin/actions";
import { DELIVERY_FAILURE_LABEL, Notice, ORDER_LABEL, StatusChip } from "./ui";
import type { DeliveryFailureReason, Order, OrderStatus } from "@/types";
```

Add this state beside the existing `openId` state:

```ts
  const [failureFor, setFailureFor] = useState<string | null>(null);
  const [failureReason, setFailureReason] =
    useState<DeliveryFailureReason>("customer_unreachable");
  const [failureNote, setFailureNote] = useState("");
  const [cancelFor, setCancelFor] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
```

Then replace the whole fulfilment block — the `<div className="mt-6 border-t border-charcoal/12 pt-5">` element and its contents — with:

```tsx
                <div className="mt-6 border-t border-charcoal/12 pt-5">
                  <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                    Order status
                  </h3>

                  {order.cancellation?.state === "requested" && (
                    <div className="mb-4">
                      <Notice tone="warn">
                        The customer asked to cancel this order.
                        {order.cancellation.reason
                          ? ` Reason given: ${order.cancellation.reason}`
                          : ""}
                      </Notice>
                    </div>
                  )}

                  {order.lastFailureReason && (
                    <p className="mb-3 text-[0.75rem] text-critical">
                      Attempt {order.deliveryAttempts} failed:{" "}
                      {DELIVERY_FAILURE_LABEL[order.lastFailureReason]}
                      {order.lastFailureNote ? ` . ${order.lastFailureNote}` : ""}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {FLOW.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={pending || order.orderStatus === status}
                        onClick={() => run(() => updateOrderStatus(order.id, status))}
                        className={`rounded-[9px] border px-3 py-1.5 text-[0.75rem] font-semibold transition-colors ${
                          order.orderStatus === status
                            ? "border-forest bg-forest text-paper"
                            : "border-charcoal/18 bg-paper text-charcoal hover:border-charcoal/40"
                        } disabled:cursor-not-allowed`}
                      >
                        {ORDER_LABEL[status]}
                      </button>
                    ))}

                    {order.orderStatus === "out_for_delivery" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setCancelFor(null);
                          setFailureFor(failureFor === order.id ? null : order.id);
                        }}
                        className="rounded-[9px] border border-caution/45 px-3 py-1.5 text-[0.75rem] font-semibold text-caution transition-colors hover:bg-caution/[0.08] disabled:cursor-not-allowed"
                      >
                        Delivery failed
                      </button>
                    )}

                    {order.orderStatus === "delivery_failed" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() => updateOrderStatus(order.id, "returned"))
                        }
                        className="rounded-[9px] border border-charcoal/25 px-3 py-1.5 text-[0.75rem] font-semibold text-charcoal transition-colors hover:border-charcoal/45 disabled:cursor-not-allowed"
                      >
                        Returned to us
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={pending || order.orderStatus === "cancelled"}
                      onClick={() => {
                        setFailureFor(null);
                        setCancelFor(cancelFor === order.id ? null : order.id);
                      }}
                      className="rounded-[9px] border border-critical/35 px-3 py-1.5 text-[0.75rem] font-semibold text-critical transition-colors hover:bg-critical/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>

                  {failureFor === order.id && (
                    <div className="mt-4 rounded-[12px] border border-caution/35 bg-caution/[0.04] p-4">
                      <label className="block text-[0.75rem] font-semibold text-charcoal">
                        Why did the delivery fail?
                        <select
                          value={failureReason}
                          onChange={(e) =>
                            setFailureReason(e.target.value as DeliveryFailureReason)
                          }
                          className="mt-1.5 block h-10 w-full max-w-[24rem] rounded-[10px] border border-charcoal/18 bg-paper px-3 text-[0.8125rem] font-normal"
                        >
                          {(
                            Object.keys(DELIVERY_FAILURE_LABEL) as DeliveryFailureReason[]
                          ).map((reason) => (
                            <option key={reason} value={reason}>
                              {DELIVERY_FAILURE_LABEL[reason]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mt-3 block text-[0.75rem] font-semibold text-charcoal">
                        Note, optional
                        <input
                          value={failureNote}
                          onChange={(e) => setFailureNote(e.target.value)}
                          placeholder="What the courier reported"
                          className="mt-1.5 block h-10 w-full rounded-[10px] border border-charcoal/18 bg-paper px-3 text-[0.8125rem] font-normal"
                        />
                      </label>
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const result = await recordDeliveryFailure(
                              order.id,
                              failureReason,
                              failureNote,
                            );
                            if (result.ok) {
                              setFailureFor(null);
                              setFailureNote("");
                            }
                            return result;
                          })
                        }
                      >
                        <span>Record failed delivery</span>
                      </Button>
                    </div>
                  )}

                  {cancelFor === order.id && (
                    <div className="mt-4 rounded-[12px] border border-critical/35 bg-critical/[0.04] p-4">
                      <p className="text-[0.75rem] font-semibold text-charcoal">
                        Cancelling returns every item to stock. A paid order is marked
                        refunded for you to settle by hand.
                      </p>
                      <input
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Reason, kept on the order record"
                        className="mt-3 block h-10 w-full rounded-[10px] border border-charcoal/18 bg-paper px-3 text-[0.8125rem]"
                      />
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const result = await cancelOrder(order.id, cancelReason);
                            if (result.ok) {
                              setCancelFor(null);
                              setCancelReason("");
                            }
                            return result;
                          })
                        }
                      >
                        <span>Cancel this order</span>
                      </Button>
                    </div>
                  )}

                  <p className="mt-3 text-[0.75rem] text-muted">
                    Placed {new Date(order.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
```

- [ ] **Step 4: Add the new filters**

In `src/app/admin/(dashboard)/orders/page.tsx`, add three entries to `FILTERS`, before the `Cancelled` line:

```ts
  { label: "Delivery failed", order: "delivery_failed", payment: undefined },
  { label: "Cancellation requested", order: "cancellation_requested", payment: undefined },
  { label: "Returned", order: "returned", payment: undefined },
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/actions.ts src/components/admin/ui.tsx src/components/admin/OrdersTable.tsx "src/app/admin/(dashboard)/orders/page.tsx"
git commit -m "feat: record why a delivery failed and cancel with a reason" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Deciding a cancellation request

**Files:**
- Modify: `src/app/admin/actions.ts` (add `decideCancellationRequest`)
- Modify: `src/components/admin/OrdersTable.tsx` (approve and refuse controls)

**Interfaces:**
- Consumes: `applyOrderTransition` from Task 3.
- Produces: `decideCancellationRequest(orderId: string, decision: "approve" | "refuse", note: string): Promise<ActionResult>`.

Nothing creates a `cancellation_requested` order until phase 3 adds the customer's button, so this task's controls cannot be exercised end to end yet. Its logic is covered by the planner tests written in Task 2.

- [ ] **Step 1: Add the action**

In `src/app/admin/actions.ts`, add after `recordDeliveryFailure`:

```ts
/**
 * Approving cancels and restocks. Refusing puts the parcel back on the road,
 * which is why the order returns to out_for_delivery rather than its old state.
 */
export async function decideCancellationRequest(
  orderId: string,
  decision: "approve" | "refuse",
  note: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z
      .object({
        decision: z.enum(["approve", "refuse"]),
        note: z.string().trim().max(500),
      })
      .safeParse({ decision, note });

    if (!parsed.success) return { ok: false, error: "Choose approve or refuse." };

    await applyOrderTransition({
      orderId,
      to: parsed.data.decision === "approve" ? "cancelled" : "out_for_delivery",
      actor: "admin",
      actorLabel: admin.email ?? admin.uid,
      reason: parsed.data.note,
    });

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
```

- [ ] **Step 2: Add the controls to the request notice**

In `src/components/admin/OrdersTable.tsx`, add `decideCancellationRequest` to the import list from `@/app/admin/actions`, then replace the cancellation notice block from Task 4 with:

```tsx
                  {order.cancellation?.state === "requested" && (
                    <div className="mb-4 rounded-[12px] border border-caution/45 bg-caution/[0.06] p-4">
                      <p className="text-[0.8125rem] font-semibold text-charcoal">
                        The customer asked to cancel this order.
                        {order.cancellation.reason
                          ? ` Reason given: ${order.cancellation.reason}`
                          : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              decideCancellationRequest(order.id, "approve", ""),
                            )
                          }
                        >
                          <span>Approve and refund stock</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              decideCancellationRequest(order.id, "refuse", ""),
                            )
                          }
                        >
                          <span>Refuse, continue delivery</span>
                        </Button>
                      </div>
                    </div>
                  )}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/actions.ts src/components/admin/OrdersTable.tsx
git commit -m "feat: approve or refuse a customer cancellation request" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Manual pass for the admin account holder

An agent cannot sign in to the admin, so these need a human with the super admin account. Do them against a test order, not a real customer's.

1. Note a variant's stock in Store control center, Products and images.
2. Place an order on the storefront for 2 of that variant. Confirm stock dropped by 2.
3. In Orders, open that order, press Cancel, give a reason, confirm.
4. Reload Products and images: stock must be back to its original number, exactly once. Press Cancel again on the same order; it must refuse with "That order is already in this state."
5. On another order, walk it to Out for delivery, press Delivery failed, pick a reason, record it. The order shows "Attempt 1 failed" and appears under the Delivery failed filter.
6. Press Returned to us on that order and confirm stock returns.

## Done when

- Cancelling or returning an order puts every line back into stock, exactly once, and never twice.
- An order with partner ledger entries refuses to cancel, and says why.
- A failed delivery records a reason, a note and an attempt number.
- Cancelling a paid order leaves its payment status as refunded for manual settlement.
- `orderStatus` is written in exactly two places: order creation and `applyOrderTransition`.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` all pass.
