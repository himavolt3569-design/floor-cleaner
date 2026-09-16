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
