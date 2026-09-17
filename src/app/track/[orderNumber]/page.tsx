import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CUSTOMER_COOKIE, isCustomerKey } from "@/lib/commerce/customer-key";
import { findOrderForCustomer, timelineForOrder } from "@/lib/data/tracking";
import { cancelAbility } from "@/lib/commerce/tracking-view";
import { CancelControl } from "@/components/track/CancelControl";
import { formatNpr } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({
  params,
}: PageProps<"/track/[orderNumber]">) {
  const { orderNumber } = await params;
  const key = (await cookies()).get(CUSTOMER_COOKIE)?.value;

  // Without the cookie there is nothing to prove ownership with, so the page
  // simply does not exist. The lookup form on /track is the way back in.
  if (!isCustomerKey(key)) notFound();

  const order = await findOrderForCustomer(
    decodeURIComponent(orderNumber).toUpperCase(),
    key,
  );
  if (!order) notFound();

  const timeline = await timelineForOrder(order.id);
  const ability = cancelAbility(order.orderStatus);

  return (
    <main className="shell py-[var(--spacing-section)]">
      <p className="text-[0.8125rem] text-muted">
        <Link
          href="/track"
          className="font-semibold text-forest underline underline-offset-4"
        >
          All your orders
        </Link>
      </p>

      <h1 className="display-sub mt-4">{order.orderNumber}</h1>
      <p className="mt-2 text-[0.9375rem] text-charcoal">{order.statusLabel}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            Progress
          </h2>
          <ol className="mt-4 space-y-3">
            {timeline.map((event) => (
              <li key={`${event.at}-${event.label}`} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest"
                />
                <div>
                  <p className="text-[0.875rem] font-semibold text-charcoal">
                    {event.label}
                  </p>
                  <p className="tabular text-[0.75rem] text-muted">
                    {new Date(event.at).toLocaleString("en-GB")}
                  </p>
                </div>
              </li>
            ))}
            {timeline.length === 0 && (
              <li className="text-[0.875rem] text-muted">
                We will update this as your order moves.
              </li>
            )}
          </ol>

          {order.deliveryAttempts > 0 && (
            <p className="mt-5 text-[0.8125rem] text-muted">
              Delivery attempts so far: {order.deliveryAttempts}. We will call
              you to arrange the next one.
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
              Order
            </h2>
            <ul className="mt-3 space-y-2 text-[0.8125rem]">
              {order.items.map((item) => (
                <li
                  key={`${item.name}-${item.variantLabel}`}
                  className="flex justify-between gap-3"
                >
                  <span className="text-charcoal">
                    {item.name}{" "}
                    <span className="text-muted">({item.variantLabel})</span>
                    <span className="tabular text-muted"> x{item.quantity}</span>
                  </span>
                  <span className="tabular shrink-0">
                    {formatNpr(item.lineTotalMinor)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-charcoal/12 pt-3">
              <span className="text-[0.875rem] font-bold text-charcoal">
                Total
              </span>
              <span className="tabular text-[0.875rem] font-bold text-charcoal">
                {formatNpr(order.grandTotalMinor)}
              </span>
            </div>
            <p className="mt-3 text-[0.8125rem] text-muted">
              {order.deliveryMethodName}
              {order.deliveryEstimate ? ` . ${order.deliveryEstimate}` : ""}
            </p>
            <p className="mt-1 text-[0.8125rem] text-muted">
              {[
                order.deliveryAddress.area,
                order.deliveryAddress.municipality,
                order.deliveryAddress.district,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>

          <CancelControl
            orderNumber={order.orderNumber}
            ability={ability}
            cancellationState={order.cancellationState}
          />
        </aside>
      </div>
    </main>
  );
}
