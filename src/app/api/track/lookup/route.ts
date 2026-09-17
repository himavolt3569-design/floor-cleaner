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
