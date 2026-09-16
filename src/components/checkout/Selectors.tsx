"use client";

import { formatNpr } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import type { QuoteDelivery, QuotePayment } from "@/types/checkout";

/** Shared radio-row look for the delivery and payment choices. */
function OptionRow({
  name,
  checked,
  onSelect,
  title,
  description,
  trailing,
  id,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string | null;
  trailing?: React.ReactNode;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[13px] border p-4 transition-colors duration-200",
        checked
          ? "border-forest bg-forest/[0.05]"
          : "border-charcoal/15 bg-paper hover:border-charcoal/30",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--color-forest)]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-[0.875rem] font-semibold text-charcoal">{title}</span>
          {trailing}
        </span>
        {description && (
          <span className="mt-1 block text-[0.8125rem] leading-relaxed text-muted">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function DeliverySelector({
  methods,
  selectedId,
  onSelect,
  addressReady,
}: {
  methods: QuoteDelivery[];
  selectedId: string;
  onSelect: (id: string) => void;
  addressReady: boolean;
}) {
  if (!addressReady) {
    return (
      <p className="rounded-[13px] border border-dashed border-charcoal/25 bg-paper/60 p-4 text-[0.8125rem] text-muted">
        Choose your province and district to see the delivery options available
        for your area.
      </p>
    );
  }

  if (!methods.length) {
    return (
      <p className="rounded-[13px] border border-critical/35 bg-critical/[0.04] p-4 text-[0.8125rem] text-critical">
        We do not currently deliver to that area. Contact us using the details in
        the footer and we will see what we can arrange.
      </p>
    );
  }

  return (
    <div className="grid gap-2.5">
      {methods.map((method) => (
        <OptionRow
          key={method.id}
          id={`delivery-${method.id}`}
          name="delivery"
          checked={selectedId === method.id}
          onSelect={() => onSelect(method.id)}
          title={method.name}
          description={`${method.description} Estimated ${method.estimate.toLowerCase()}.`}
          trailing={
            <span className="tabular text-[0.875rem] font-semibold text-charcoal">
              {method.feeMinor === 0 ? (
                <>
                  Free
                  {method.freeApplied && method.baseFeeMinor > 0 && (
                    <span className="ml-1.5 font-normal text-muted line-through">
                      {formatNpr(method.baseFeeMinor)}
                    </span>
                  )}
                </>
              ) : (
                formatNpr(method.feeMinor)
              )}
            </span>
          }
        />
      ))}
    </div>
  );
}

export function PaymentSelector({
  methods,
  selectedId,
  onSelect,
}: {
  methods: QuotePayment[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (!methods.length) {
    return (
      <p className="rounded-[13px] border border-critical/35 bg-critical/[0.04] p-4 text-[0.8125rem] text-critical">
        No payment methods are enabled right now. Please contact us to place your
        order.
      </p>
    );
  }

  return (
    <div className="grid gap-2.5">
      {methods.map((method) => (
        <OptionRow
          key={method.id}
          id={`payment-${method.id}`}
          name="payment"
          checked={selectedId === method.id}
          onSelect={() => onSelect(method.id)}
          title={method.name}
          description={method.description}
          trailing={
            method.requiresVerification ? (
              <span className="rounded-[7px] bg-caution/12 px-2 py-0.5 text-[0.6875rem] font-semibold text-caution">
                Confirmed by us
              </span>
            ) : null
          }
        />
      ))}
    </div>
  );
}
