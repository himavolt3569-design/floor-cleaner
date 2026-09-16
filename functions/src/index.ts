/**
 * TMG Cleaner - Cloud Functions
 *
 * SCOPE, read this first.
 *
 * The Next.js server is the primary backend for this application. Order
 * creation, pricing, stock and admin actions all live there, in
 * `src/lib/commerce` and `src/app/api`, using the Firebase Admin SDK.
 *
 * These functions exist for the jobs that genuinely need to run inside
 * Firebase rather than in a request from our own site:
 *
 *   1. paymentWebhook  a payment provider calls this URL directly, so it cannot
 *                      be a route protected by our same-origin checks.
 *   2. cleanupExpired  scheduled housekeeping for rate-limit and idempotency
 *                      records, for projects without Firestore TTL policies.
 *   3. onOrderWritten  a hook for notifications (SMS, email) when an order
 *                      changes. Left as a clearly-marked extension point.
 *
 * Deploying these is optional. If you deploy only the Next.js app, the store
 * works: manual payments are verified by hand in the admin, which is the
 * default configuration.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "node:crypto";

if (!getApps().length) initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "asia-south1", maxInstances: 10 });

/** Provider signing secret. Set with: firebase functions:secrets:set PAYMENT_WEBHOOK_SECRET */
const WEBHOOK_SECRET = defineSecret("PAYMENT_WEBHOOK_SECRET");

/* ========================================================================== */
/* 1. Payment webhook                                                          */
/* ========================================================================== */

/**
 * Receives a payment notification from a gateway.
 *
 * Rules this function follows, and that any provider-specific version of it
 * must keep following:
 *
 *   - The signature is verified before anything is read from the body.
 *   - The amount is compared against the order total stored in Firestore.
 *     A webhook claiming "paid" for the wrong amount is rejected.
 *   - Writes are idempotent: a provider retrying the same event must not
 *     double-apply it.
 *   - Nothing in the query string is trusted.
 */
export const paymentWebhook = onRequest(
  { secrets: [WEBHOOK_SECRET], cors: false },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    const signature = String(request.get("x-signature") ?? "");
    const raw = request.rawBody?.toString("utf8") ?? "";

    if (!verifySignature(raw, signature, WEBHOOK_SECRET.value())) {
      console.warn("[paymentWebhook] rejected: bad signature");
      response.status(401).send("Invalid signature");
      return;
    }

    let event: {
      eventId?: string;
      orderNumber?: string;
      status?: string;
      amountMinor?: number;
      reference?: string;
    };

    try {
      event = JSON.parse(raw);
    } catch {
      response.status(400).send("Invalid payload");
      return;
    }

    const { eventId, orderNumber, status, amountMinor, reference } = event;

    if (!eventId || !orderNumber || !status) {
      response.status(400).send("Missing fields");
      return;
    }

    const eventRef = db.collection("paymentTransactions").doc(eventId);

    try {
      await db.runTransaction(async (tx) => {
        // Replay protection: the same provider event is applied at most once.
        const seen = await tx.get(eventRef);
        if (seen.exists) return;

        const orders = await tx.get(
          db.collection("orders").where("orderNumber", "==", orderNumber).limit(1),
        );
        if (orders.empty) throw new Error(`Unknown order ${orderNumber}`);

        const orderDoc = orders.docs[0];
        const order = orderDoc.data();

        // The provider does not get to decide what the order was worth.
        const paid =
          status === "success" &&
          typeof amountMinor === "number" &&
          amountMinor === order.grandTotalMinor;

        tx.set(eventRef, {
          eventId,
          orderId: orderDoc.id,
          orderNumber,
          status,
          amountMinor: amountMinor ?? null,
          reference: reference ?? null,
          appliedAt: FieldValue.serverTimestamp(),
        });

        tx.update(orderDoc.ref, {
          paymentStatus: paid ? "paid" : "failed",
          paymentReference: reference ?? order.paymentReference ?? null,
          ...(paid && order.orderStatus === "pending" ? { orderStatus: "confirmed" } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(db.collection("orderEvents").doc(), {
          orderId: orderDoc.id,
          orderNumber,
          type: "payment_webhook",
          message: paid
            ? `Gateway confirmed payment of ${amountMinor}.`
            : `Gateway reported ${status}${
                amountMinor !== order.grandTotalMinor ? " with a mismatched amount" : ""
              }.`,
          actor: "gateway",
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      response.status(200).send("ok");
    } catch (error) {
      console.error("[paymentWebhook]", error);
      // 500 asks the provider to retry; replay protection makes that safe.
      response.status(500).send("Could not process event");
    }
  },
);

/** Constant-time HMAC comparison. */
function verifySignature(body: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ========================================================================== */
/* 2. Scheduled cleanup                                                        */
/* ========================================================================== */

/**
 * Deletes expired rate-limit windows and idempotency keys.
 *
 * Firestore TTL policies (declared in firestore.indexes.json) do this for free.
 * This exists for projects where TTL has not been enabled.
 */
export const cleanupExpired = onSchedule("every 24 hours", async () => {
  const now = new Date();
  let removed = 0;

  for (const collection of ["rateLimits", "idempotencyKeys"]) {
    const snap = await db
      .collection(collection)
      .where("expiresAt", "<", now)
      .limit(500)
      .get();

    if (snap.empty) continue;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    removed += snap.size;
  }

  console.log(`[cleanupExpired] removed ${removed} documents`);
});

/* ========================================================================== */
/* 3. Order change hook                                                        */
/* ========================================================================== */

/**
 * Fires whenever an order changes. Extension point for notifications: send an
 * SMS when an order is confirmed, alert staff when a manual payment needs
 * checking, push to a delivery partner, and so on.
 *
 * It deliberately only logs today. Wiring a real SMS or email provider needs
 * that provider's credentials, which belong in Firebase secrets.
 */
export const onOrderWritten = onDocumentWritten("orders/{orderId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!after) return;

  const statusChanged = before?.orderStatus !== after.orderStatus;
  const paymentChanged = before?.paymentStatus !== after.paymentStatus;

  if (!statusChanged && !paymentChanged) return;

  console.log(
    `[onOrderWritten] ${after.orderNumber}: ` +
      `order ${before?.orderStatus ?? "new"} -> ${after.orderStatus}, ` +
      `payment ${before?.paymentStatus ?? "new"} -> ${after.paymentStatus}`,
  );

  // Example of where an SMS to after.customerSnapshot.mobile would go.
});
