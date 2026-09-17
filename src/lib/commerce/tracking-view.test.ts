import { describe, expect, it } from "vitest";
import { cancelAbility, customerTimeline, projectOrder } from "./tracking-view";

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
