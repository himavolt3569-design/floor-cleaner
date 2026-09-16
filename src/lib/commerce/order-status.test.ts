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
