import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  CommerceError,
  calculateTotals,
  deliveryFeeFor,
  eligibleDeliveryMethods,
  loadDeliveryMethods,
  loadPaymentMethods,
} from "./pricing";
import { isValidMinor } from "@/lib/utils/money";
import type {
  CreateOrderInput,
} from "@/lib/validation/schemas";
import type {
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from "@/types";

export interface CreatedOrder {
  orderId: string;
  orderNumber: string;
  grandTotalMinor: number;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentKind: string;
  requiresVerification: boolean;
  deliveryMethodName: string;
  deliveryEstimate: string;
  customerName: string;
}

/**
 * Creates an order.
 *
 * Prices, delivery fees and stock are read inside the transaction, so a cart
 * that was priced a minute ago cannot lock in a stale price, and two customers
 * racing for the last bottle cannot both win it.
 */
export async function createOrder(
  input: CreateOrderInput,
  meta: { ip: string; userAgent: string | null },
): Promise<CreatedOrder> {
  const db = requireDb();

  const [deliveryMethods, paymentMethods] = await Promise.all([
    loadDeliveryMethods(),
    loadPaymentMethods(),
  ]);

  const payment = paymentMethods.find(
    (m) => m.id === input.paymentMethodId && m.enabled,
  );
  if (!payment) {
    throw new CommerceError(
      "That payment method is not available. Please choose another.",
      "payment_unavailable",
    );
  }

  // A gateway method that has not been wired up server side must never be
  // selectable: it would leave the customer with no way to actually pay.
  const isGateway = ["esewa", "khalti", "fonepay"].includes(payment.kind);
  if (isGateway && !payment.gatewayConfigured) {
    throw new CommerceError(
      "Online payment is not available right now. Please choose another method.",
      "payment_unavailable",
    );
  }

  const delivery = deliveryMethods.find(
    (m) => m.id === input.deliveryMethodId && m.enabled,
  );
  if (!delivery) {
    throw new CommerceError(
      "That delivery option is not available for your address.",
      "delivery_unavailable",
    );
  }

  const productRefs = input.items.map((item) => ({
    item,
    productRef: db.collection(COLLECTIONS.products).doc(item.productId),
    variantRef: db
      .collection(COLLECTIONS.products)
      .doc(item.productId)
      .collection(COLLECTIONS.variants)
      .doc(item.variantId),
  }));

  const counterRef = db.collection(COLLECTIONS.counters).doc("orders");
  const orderRef = db.collection(COLLECTIONS.orders).doc();

  return db.runTransaction(async (tx) => {
    /* ---------------------------------------------------- reads first */
    const variantSnaps = await Promise.all(
      productRefs.map(({ variantRef }) => tx.get(variantRef)),
    );
    const productSnaps = await Promise.all(
      productRefs.map(({ productRef }) => tx.get(productRef)),
    );
    const counterSnap = await tx.get(counterRef);
    if (delivery.partnerId) {
      const courier = await tx.get(db.collection("partners").doc(delivery.partnerId));
      if (!courier.exists || !courier.data()?.active) throw new CommerceError("This courier is unavailable. Choose another delivery option.", "delivery_unavailable");
    }

    const items: OrderItem[] = [];

    productRefs.forEach(({ item }, i) => {
      const variantSnap = variantSnaps[i];
      const productSnap = productSnaps[i];

      if (!variantSnap.exists || !productSnap.exists) {
        throw new CommerceError(
          "One of the items in your cart is no longer available.",
          "product_unavailable",
        );
      }

      const variant = variantSnap.data() ?? {};
      const product = productSnap.data() ?? {};

      if (product.active === false || variant.active === false) {
        throw new CommerceError(
          `${product.name ?? "An item"} is no longer available.`,
          "product_unavailable",
        );
      }
      if (!isValidMinor(variant.priceMinor)) {
        throw new CommerceError(
          "Pricing for an item in your cart is being updated. Please try again.",
          "product_unavailable",
        );
      }

      const stock = Math.max(0, Math.floor(Number(variant.stock ?? 0)));
      if (stock < item.quantity) {
        throw new CommerceError(
          stock <= 0
            ? `${product.name} (${variant.label}) just sold out.`
            : `Only ${stock} of ${product.name} (${variant.label}) remain.`,
          "out_of_stock",
        );
      }

      const unitPriceMinor = variant.priceMinor as number;
      items.push({
        productId: item.productId,
        variantId: item.variantId,
        name: String(product.name ?? "Product"),
        variantLabel: String(variant.label ?? item.variantId),
        sku: String(variant.sku ?? item.variantId),
        unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor: unitPriceMinor * item.quantity,
      });
    });

    const subtotalMinor = items.reduce((s, i) => s + i.lineTotalMinor, 0);

    // Re-check eligibility with the authoritative subtotal.
    const stillEligible = eligibleDeliveryMethods(
      [delivery],
      subtotalMinor,
      input.address.province,
      input.address.district,
    );
    if (!stillEligible.length) {
      throw new CommerceError(
        "That delivery option is not available for your address.",
        "delivery_unavailable",
      );
    }

    const totals = calculateTotals(
      items.map((i) => ({ ...i, stock: 0 })),
      delivery,
      0,
    );

    /* -------------------------------------------------------- writes */
    const nextSequence = Number(counterSnap.data()?.value ?? 0) + 1;
    const orderNumber = formatOrderNumber(nextSequence);

    productRefs.forEach(({ variantRef, item }) => {
      tx.update(variantRef, {
        stock: FieldValue.increment(-item.quantity),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const paymentStatus: PaymentStatus =
      payment.kind === "cod" ? "unpaid" : "pending";

    tx.set(orderRef, {
      orderNumber,
      customerId: null,
      customerSnapshot: {
        fullName: input.address.fullName,
        mobile: input.address.mobile,
        email: input.address.email || null,
      },
      items,
      subtotalMinor: totals.subtotalMinor,
      deliveryFeeMinor: totals.deliveryFeeMinor,
      discountMinor: totals.discountMinor,
      grandTotalMinor: totals.grandTotalMinor,
      currency: "NPR",
      paymentMethodId: payment.id,
      paymentMethodName: payment.name,
      paymentKind: payment.kind,
      paymentStatus,
      paymentReference: null,
      paymentProofUrl: null,
      deliveryMethodId: delivery.id,
      salesPartnerId: null,
      courierPartnerId: delivery.partnerId ?? null,
      externalReference: "",
      trackingNumber: "",
      deliveryMethodName: delivery.name,
      deliveryEstimate: delivery.estimate,
      deliveryAddress: input.address,
      orderStatus: "pending" satisfies OrderStatus,
      customerNotes: input.address.notes || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      // Retained for fraud triage only; never surfaced in the storefront.
      meta: { ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) ?? null },
    });

    tx.set(counterRef, { value: nextSequence }, { merge: true });

    tx.set(db.collection(COLLECTIONS.orderEvents).doc(), {
      orderId: orderRef.id,
      orderNumber,
      type: "order_created",
      message: `Order placed using ${payment.name}.`,
      actor: "customer",
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      orderId: orderRef.id,
      orderNumber,
      subtotalMinor: totals.subtotalMinor,
      deliveryFeeMinor: totals.deliveryFeeMinor,
      discountMinor: totals.discountMinor,
      grandTotalMinor: totals.grandTotalMinor,
      paymentStatus,
      orderStatus: "pending" as OrderStatus,
      paymentMethodId: payment.id,
      paymentMethodName: payment.name,
      paymentKind: payment.kind,
      requiresVerification: Boolean(payment.requiresVerification),
      deliveryMethodName: delivery.name,
      deliveryEstimate: delivery.estimate,
      customerName: input.address.fullName,
    };
  });
}

/** TMG-2609-0042 */
function formatOrderNumber(sequence: number): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `TMG-${yy}${mm}-${String(sequence).padStart(4, "0")}`;
}

export { deliveryFeeFor };
