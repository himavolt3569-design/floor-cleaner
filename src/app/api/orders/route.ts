import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  isCustomerKey,
  newCustomerKey,
} from "@/lib/commerce/customer-key";
import { createOrderSchema, fieldErrors } from "@/lib/validation/schemas";
import { createOrder, type CreatedOrder } from "@/lib/commerce/orders";
import {
  assertSameOrigin,
  claimIdempotency,
  clientIp,
  completeIdempotency,
  rateLimit,
  releaseIdempotency,
} from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/**
 * Creates an order.
 *
 * The request carries ids and an address, never prices. Totals, stock and the
 * order number are all decided here. An idempotency key makes a retried or
 * double-tapped submit return the original order instead of creating a second.
 */
export async function POST(request: Request) {
  let idempotencyKey: string | null = null;

  try {
    await assertSameOrigin();

    const ip = await clientIp();
    // Deliberately tight: a genuine customer places one order at a time.
    await rateLimit("order", ip, 8, 600);

    const body = await request.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please check the highlighted fields.",
          fields: fieldErrors(parsed.error),
        },
        { status: 400, headers: noStore },
      );
    }

    idempotencyKey = parsed.data.idempotencyKey;

    const replay = await claimIdempotency<CreatedOrder>(idempotencyKey);
    if (replay) {
      return NextResponse.json(
        { ok: true, order: replay.value, replayed: true },
        { headers: noStore },
      );
    }

    // One key per browser, reused for every later order so the customer sees
    // their whole history. A malformed cookie is replaced rather than trusted.
    const existing = (await cookies()).get(CUSTOMER_COOKIE)?.value;
    const customerKey = isCustomerKey(existing) ? existing : newCustomerKey();

    const userAgent = (await headers()).get("user-agent");
    const order = await createOrder(parsed.data, { ip, userAgent, customerKey });

    await completeIdempotency(idempotencyKey, order);

    const response = NextResponse.json({ ok: true, order }, { headers: noStore });
    response.cookies.set(
      CUSTOMER_COOKIE,
      customerKey,
      customerCookieOptions(process.env.NODE_ENV === "production"),
    );
    return response;
  } catch (error) {
    // Free the key so the customer can correct the problem and retry.
    if (idempotencyKey) await releaseIdempotency(idempotencyKey);
    return errorResponse(error);
  }
}
