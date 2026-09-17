import Link from "next/link";
import { formatNpr } from "@/lib/utils/money";
import type { TrackedOrder } from "@/lib/commerce/tracking-view";

export function OrderCard({
  order,
  href,
}: {
  order: TrackedOrder;
  href?: string;
}) {
  return (
    <article className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tabular text-[0.9375rem] font-bold text-charcoal">
          {order.orderNumber}
        </p>
        <span className="rounded-[7px] border border-forest/30 bg-forest/10 px-2 py-1 text-[0.6875rem] font-semibold text-forest">
          {order.statusLabel}
        </span>
      </div>

      <p className="mt-2 text-[0.8125rem] text-muted">
        {order.items
          .map((i) => `${i.name} ${i.variantLabel} x${i.quantity}`)
          .join(", ")}
      </p>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.8125rem] text-muted">
          {order.deliveryMethodName}
          {order.deliveryEstimate ? ` . ${order.deliveryEstimate}` : ""}
        </p>
        <p className="tabular text-[0.9375rem] font-semibold text-charcoal">
          {formatNpr(order.grandTotalMinor)}
        </p>
      </div>

      {href && (
        <Link
          href={href}
          className="mt-4 inline-block text-[0.8125rem] font-semibold text-forest underline underline-offset-4"
        >
          See details
        </Link>
      )}
    </article>
  );
}
