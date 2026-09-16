import { NextResponse } from "next/server";
import { quoteRequestSchema, fieldErrors } from "@/lib/validation/schemas";
import {
  calculateTotals,
  deliveryFeeFor,
  eligibleDeliveryMethods,
  loadDeliveryMethods,
  loadPaymentMethods,
  resolveItems,
} from "@/lib/commerce/pricing";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/utils/request-guard";
import { errorResponse, noStore } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/**
 * Prices a cart and returns the delivery and payment options that actually
 * apply to the given address. The browser never computes a total it can send
 * back: it only ever displays what this route returns.
 */
export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    await rateLimit("quote", await clientIp(), 60, 60);

    const body = await request.json().catch(() => null);
    const parsed = quoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Check the items in your cart.", fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }

    const { items, province, district } = parsed.data;

    const resolved = await resolveItems(items);
    const subtotalMinor = resolved.reduce((s, i) => s + i.lineTotalMinor, 0);

    const [allDelivery, allPayment] = await Promise.all([
      loadDeliveryMethods(),
      loadPaymentMethods(),
    ]);

    const delivery = eligibleDeliveryMethods(
      allDelivery,
      subtotalMinor,
      province,
      district,
    ).map((method) => ({
      id: method.id,
      kind: method.kind,
      name: method.name,
      description: method.description,
      estimate: method.estimate,
      feeMinor: deliveryFeeFor(method, subtotalMinor),
      baseFeeMinor: method.feeMinor,
      freeApplied:
        method.freeDeliveryThresholdMinor !== null &&
        subtotalMinor >= (method.freeDeliveryThresholdMinor ?? Infinity),
    }));

    // Gateways without server-side credentials are hidden rather than shown
    // and then failing at the last step.
    const payment = allPayment
      .filter((m) =>
        ["esewa", "khalti", "fonepay"].includes(m.kind) ? m.gatewayConfigured : true,
      )
      .map((m) => ({
        id: m.id,
        kind: m.kind,
        name: m.name,
        description: m.description,
        requiresVerification: m.requiresVerification,
        instructions: m.instructions ?? null,
        accountTitle: m.accountTitle ?? null,
        accountNumber: m.accountNumber ?? null,
        qrImageUrl: m.qrImageUrl ?? null,
      }));

    const totals = calculateTotals(resolved, null, 0);

    return NextResponse.json(
      {
        ok: true,
        items: resolved.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.name,
          variantLabel: i.variantLabel,
          unitPriceMinor: i.unitPriceMinor,
          quantity: i.quantity,
          lineTotalMinor: i.lineTotalMinor,
        })),
        subtotalMinor: totals.subtotalMinor,
        deliveryMethods: delivery,
        paymentMethods: payment,
      },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
