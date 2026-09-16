import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { paymentProofSchema, fieldErrors } from "@/lib/validation/schemas";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  GuardError,
  assertSameOrigin,
  clientIp,
  rateLimit,
} from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/**
 * Records a manual payment claim: a transaction reference and/or an uploaded
 * screenshot.
 *
 * Crucially, this does NOT mark the order paid. It moves the payment to
 * `pending_verification` and leaves a human to confirm it in the admin. A
 * customer pressing "I have paid" is a claim, not proof.
 */
export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    await rateLimit("payment-proof", await clientIp(), 12, 600);

    const body = await request.json().catch(() => null);
    const parsed = paymentProofSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Add a transaction reference or upload a screenshot.",
          fields: fieldErrors(parsed.error),
        },
        { status: 400, headers: noStore },
      );
    }

    const { orderId, orderNumber, reference, proofPath } = parsed.data;

    if (!reference && !proofPath) {
      return NextResponse.json(
        { ok: false, error: "Add a transaction reference or upload a screenshot." },
        { status: 400, headers: noStore },
      );
    }

    const db = requireDb();
    const orderRef = db.collection(COLLECTIONS.orders).doc(orderId);
    const snap = await orderRef.get();

    if (!snap.exists) {
      throw new GuardError("We could not find that order.", 404);
    }

    const order = snap.data() ?? {};

    // The order number acts as a shared secret between us and the customer, so
    // knowing an order id alone is not enough to alter someone else's payment.
    if (order.orderNumber !== orderNumber) {
      throw new GuardError("We could not find that order.", 404);
    }

    // A verified payment is final; a customer cannot reopen it.
    if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") {
      return NextResponse.json(
        { ok: true, alreadySettled: true, paymentStatus: order.paymentStatus },
        { headers: noStore },
      );
    }

    // Only accept an upload path inside this order's own folder.
    if (proofPath && !proofPath.startsWith(`payment-proofs/${orderId}/`)) {
      throw new GuardError("That upload does not belong to this order.", 400);
    }

    await orderRef.update({
      paymentStatus: "pending_verification",
      paymentReference: reference || null,
      paymentProofPath: proofPath || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection(COLLECTIONS.orderEvents).add({
      orderId,
      orderNumber,
      type: "payment_claimed",
      message: reference
        ? `Customer submitted payment reference ${reference}.`
        : "Customer uploaded a payment screenshot.",
      actor: "customer",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { ok: true, paymentStatus: "pending_verification" },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
