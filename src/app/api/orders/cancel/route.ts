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

    // Same answer as a missing order: an attacker learns nothing from the
    // difference between "not yours" and "does not exist".
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
        {
          ok: false,
          error:
            "This order can no longer be cancelled online. Please call us and we will help.",
        },
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

    return NextResponse.json({ ok: true, outcome: ability }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
