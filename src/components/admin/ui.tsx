"use client";

import { cn } from "@/lib/utils/cn";
import type { OrderStatus, PaymentStatus } from "@/types";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2rem] leading-none tracking-[-0.025em] text-charcoal">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[48ch] text-[0.875rem] text-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[16px] border border-charcoal/12 bg-paper", className)}>
      {title && (
        <h2 className="border-b border-charcoal/12 px-5 py-3.5 text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-muted">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] border border-charcoal/12 bg-paper px-5 py-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="tabular mt-2 font-display text-[1.875rem] leading-none tracking-[-0.02em] text-charcoal">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[0.75rem] text-muted">{hint}</p>}
    </div>
  );
}

/* Status chips pair a word with a shape, never colour alone. */

const ORDER_TONE: Record<OrderStatus, string> = {
  pending: "border-caution/40 bg-caution/10 text-caution",
  confirmed: "border-forest/30 bg-forest/10 text-forest",
  processing: "border-forest/30 bg-forest/10 text-forest",
  packed: "border-forest/30 bg-forest/10 text-forest",
  out_for_delivery: "border-brass/40 bg-brass/10 text-brass-ink",
  delivery_failed: "border-critical/40 bg-critical/10 text-critical",
  delivered: "border-positive/35 bg-positive/10 text-positive",
  cancellation_requested: "border-caution/45 bg-caution/14 text-caution",
  cancelled: "border-critical/35 bg-critical/8 text-critical",
  returned: "border-charcoal/20 bg-charcoal/[0.05] text-muted",
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  unpaid: "border-charcoal/20 bg-charcoal/[0.05] text-muted",
  pending: "border-caution/40 bg-caution/10 text-caution",
  pending_verification: "border-caution/45 bg-caution/14 text-caution",
  paid: "border-positive/35 bg-positive/10 text-positive",
  failed: "border-critical/35 bg-critical/8 text-critical",
  refunded: "border-charcoal/20 bg-charcoal/[0.05] text-muted",
};

export const ORDER_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivery_failed: "Delivery failed",
  delivered: "Delivered",
  cancellation_requested: "Cancellation requested",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Awaiting payment",
  pending_verification: "Needs verification",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export function StatusChip({
  kind,
  status,
}: {
  kind: "order" | "payment";
  status: string;
}) {
  const tone =
    kind === "order"
      ? (ORDER_TONE[status as OrderStatus] ?? ORDER_TONE.pending)
      : (PAYMENT_TONE[status as PaymentStatus] ?? PAYMENT_TONE.unpaid);
  const label =
    kind === "order"
      ? (ORDER_LABEL[status as OrderStatus] ?? status)
      : (PAYMENT_LABEL[status as PaymentStatus] ?? status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[7px] border px-2 py-1 text-[0.6875rem] font-semibold",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error" | "success";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-charcoal/15 bg-charcoal/[0.03] text-charcoal",
    warn: "border-caution/35 bg-caution/[0.06] text-caution",
    error: "border-critical/35 bg-critical/[0.04] text-critical",
    success: "border-positive/35 bg-positive/[0.06] text-positive",
  } as const;

  return (
    <p className={cn("rounded-[12px] border p-3.5 text-[0.8125rem] font-medium", tones[tone])}>
      {children}
    </p>
  );
}
