"use client";

import Image from "next/image";
import { formatNpr } from "@/lib/utils/money";
import { useLanguage } from "@/lib/store/language";
import type { CartLine } from "@/types";

export function OrderSummary({
  lines,
  subtotalMinor,
  deliveryFeeMinor,
  discountMinor = 0,
  pricing,
}: {
  lines: CartLine[];
  subtotalMinor: number;
  deliveryFeeMinor: number | null;
  discountMinor?: number;
  pricing: boolean;
}) {
  const { lang } = useLanguage();
  const grandTotal = subtotalMinor + (deliveryFeeMinor ?? 0) - discountMinor;

  return (
    <div className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
      <h3 className="eyebrow text-muted">
        {lang === "ne" ? "अर्डर विवरण" : "Order summary"}
      </h3>

      <ul className="mt-4 space-y-3.5">
        {lines.map((line) => (
          <li key={line.variantId} className="flex items-center gap-3">
            <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-[8px] bg-stone">
              <Image src={line.image} alt="" fill sizes="36px" className="object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-semibold text-charcoal">
                {line.name}
              </p>
              <p className="tabular text-[0.75rem] text-muted">
                {line.variantLabel} &times; {line.quantity}
              </p>
            </div>
            <span className="tabular shrink-0 text-[0.8125rem] font-semibold text-charcoal">
              {formatNpr(line.unitPriceMinor * line.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-charcoal/12 pt-4 text-[0.8125rem]">
        <Row
          label={lang === "ne" ? "जम्मा" : "Subtotal"}
          value={formatNpr(subtotalMinor)}
        />
        <Row
          label={lang === "ne" ? "डेलिभरी" : "Delivery"}
          value={
            deliveryFeeMinor === null
              ? lang === "ne"
                ? "विकल्प छान्नुहोस्"
                : "Select an option"
              : deliveryFeeMinor === 0
                ? lang === "ne"
                  ? "निःशुल्क"
                  : "Free"
                : formatNpr(deliveryFeeMinor)
          }
          muted={deliveryFeeMinor === null}
        />
        {discountMinor > 0 && (
          <Row
            label={lang === "ne" ? "छुट" : "Discount"}
            value={`-${formatNpr(discountMinor)}`}
          />
        )}
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-charcoal/12 pt-4">
        <span className="text-[0.875rem] font-bold text-charcoal">
          {lang === "ne" ? "कुल रकम" : "Total"}
        </span>
        <span className="tabular font-display text-[1.65rem] leading-none tracking-[-0.02em] text-charcoal">
          {pricing ? "..." : formatNpr(Math.max(0, grandTotal))}
        </span>
      </div>

      <p className="mt-2 text-[0.6875rem] text-muted">
        {lang === "ne"
          ? "नेपाली रुपैयाँमा मूल्य। अर्डर सुनिश्चित गर्नु अगाडि रकम प्रमाणीकरण गरिन्छ।"
          : "Prices in Nepalese rupees. Totals are confirmed by our server before the order is placed."}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd
        className={
          muted
            ? "text-[0.8125rem] text-faint"
            : "tabular text-[0.8125rem] font-semibold text-charcoal"
        }
      >
        {value}
      </dd>
    </div>
  );
}
