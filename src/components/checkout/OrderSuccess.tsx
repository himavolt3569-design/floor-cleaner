"use client";

import { formatNpr } from "@/lib/utils/money";
import { formatNepaliMobile } from "@/config/nepal";
import type { PlacedOrder } from "@/types/checkout";
import type { SiteSettings } from "@/types";

/**
 * Confirmation state.
 *
 * The wording tracks the real payment status. A manual payment awaiting review
 * says "submitted for verification"; it never says the payment succeeded.
 */
export function OrderSuccess({
  order,
  settings,
  proofSubmitted,
}: {
  order: PlacedOrder;
  settings: SiteSettings;
  proofSubmitted: boolean;
}) {
  const payment = describePayment(order, proofSubmitted);

  return (
    <div className="px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-[30rem] text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-forest/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-forest" aria-hidden="true">
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 className="display-sub mt-5">Order received</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          Thank you, {order.customerName.split(" ")[0]}. We have your order and
          will be in touch on your mobile number.
        </p>
      </div>

      <dl className="mx-auto mt-8 max-w-[30rem] divide-y divide-charcoal/12 rounded-[16px] border border-charcoal/12 bg-paper">
        <Row label="Order number" value={order.orderNumber} strong />
        <Row label="Amount" value={formatNpr(order.grandTotalMinor)} strong />
        <Row label="Payment" value={`${order.paymentMethodName}. ${payment.label}`} />
        <Row label="Delivery" value={order.deliveryMethodName} />
        <Row label="Expected" value={order.deliveryEstimate} />
      </dl>

      <div
        className={`mx-auto mt-5 max-w-[30rem] rounded-[14px] border p-4 ${payment.tone}`}
      >
        <p className="text-[0.8125rem] font-semibold">{payment.headline}</p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed opacity-90">
          {payment.detail}
        </p>
      </div>

      <div className="mx-auto mt-7 max-w-[30rem] rounded-[14px] bg-stone/70 p-5 text-center">
        <p className="text-[0.8125rem] text-espresso/80">
          Any questions about this order?
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a
            href={`tel:${settings.contact.phone.replace(/\s/g, "")}`}
            className="text-[0.875rem] font-semibold text-charcoal underline decoration-charcoal/30 underline-offset-4 hover:decoration-charcoal"
          >
            {formatPhone(settings.contact.phone)}
          </a>
          <a
            href={`mailto:${settings.contact.email}`}
            className="text-[0.875rem] font-semibold text-charcoal underline decoration-charcoal/30 underline-offset-4 hover:decoration-charcoal"
          >
            {settings.contact.email}
          </a>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-[30rem] text-center text-[0.75rem] text-muted">
        Keep your order number. We use it to find your order quickly.
      </p>
    </div>
  );
}

function describePayment(order: PlacedOrder, proofSubmitted: boolean) {
  if (order.paymentKind === "cod") {
    return {
      label: "Pay on delivery",
      headline: "Pay when the order arrives",
      detail:
        "Please have the exact amount ready. The courier will call before they arrive.",
      tone: "border-charcoal/12 bg-paper text-charcoal",
    };
  }

  if (order.requiresVerification && proofSubmitted) {
    return {
      label: "Submitted for verification",
      headline: "Payment submitted for verification",
      detail:
        "We have your payment details and will confirm them by hand. Your order moves forward as soon as that is done.",
      tone: "border-caution/35 bg-caution/[0.06] text-caution",
    };
  }

  if (order.requiresVerification) {
    return {
      label: "Awaiting payment",
      headline: "Awaiting your payment",
      detail:
        "Complete the payment using the details shown, then send us the reference so we can confirm it.",
      tone: "border-caution/35 bg-caution/[0.06] text-caution",
    };
  }

  return {
    label: "Awaiting confirmation",
    headline: "Payment is being confirmed",
    detail: "We will update your order as soon as the payment clears.",
    tone: "border-charcoal/12 bg-paper text-charcoal",
  };
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("977") && digits.length === 13) {
    return formatNepaliMobile(digits.slice(3));
  }
  return phone;
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-[0.8125rem] text-muted">{label}</dt>
      <dd
        className={
          strong
            ? "tabular text-[0.9375rem] font-bold text-charcoal"
            : "text-right text-[0.8125rem] text-charcoal"
        }
      >
        {value}
      </dd>
    </div>
  );
}
