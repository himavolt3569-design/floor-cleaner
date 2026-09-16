"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPaymentStatus, updateOrderStatus } from "@/app/admin/actions";
import { formatNpr } from "@/lib/utils/money";
import { formatNepaliMobile } from "@/config/nepal";
import { Button } from "@/components/ui/Button";
import { Notice, ORDER_LABEL, StatusChip } from "./ui";
import type { Order, OrderStatus } from "@/types";

const FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
];

export function OrdersTable({
  orders,
  proofUrls,
}: {
  orders: Order[];
  proofUrls: Record<string, string>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  if (!orders.length) {
    return (
      <p className="rounded-[16px] border border-charcoal/12 bg-paper px-5 py-12 text-center text-[0.875rem] text-muted">
        No orders match this filter.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}

      {orders.map((order) => {
        const open = openId === order.id;
        const proof = proofUrls[order.id];

        return (
          <article
            key={order.id}
            className="overflow-hidden rounded-[16px] border border-charcoal/12 bg-paper"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : order.id)}
              aria-expanded={open}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-charcoal/[0.02]"
            >
              <span className="tabular text-[0.875rem] font-bold text-charcoal">
                {order.orderNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-muted">
                {order.deliveryAddress?.fullName}
                {order.deliveryAddress?.district ? ` . ${order.deliveryAddress.district}` : ""}
              </span>
              <StatusChip kind="payment" status={order.paymentStatus} />
              <StatusChip kind="order" status={order.orderStatus} />
              <span className="tabular text-[0.875rem] font-semibold text-charcoal">
                {formatNpr(order.grandTotalMinor)}
              </span>
            </button>

            {open && (
              <div className="border-t border-charcoal/12 bg-ivory/60 px-5 py-5">
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Items */}
                  <div>
                    <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                      Items
                    </h3>
                    <ul className="space-y-1.5 text-[0.8125rem]">
                      {order.items.map((item) => (
                        <li key={item.variantId} className="flex justify-between gap-3">
                          <span className="text-charcoal">
                            {item.name} <span className="text-muted">({item.variantLabel})</span>
                            <span className="tabular text-muted"> x{item.quantity}</span>
                          </span>
                          <span className="tabular shrink-0 font-medium">
                            {formatNpr(item.lineTotalMinor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <dl className="mt-3 space-y-1 border-t border-charcoal/12 pt-3 text-[0.8125rem]">
                      <Line label="Subtotal" value={formatNpr(order.subtotalMinor)} />
                      <Line label="Delivery" value={formatNpr(order.deliveryFeeMinor)} />
                      <Line label="Total" value={formatNpr(order.grandTotalMinor)} strong />
                    </dl>
                  </div>

                  {/* Delivery */}
                  <div>
                    <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                      Deliver to
                    </h3>
                    <address className="space-y-0.5 text-[0.8125rem] not-italic text-charcoal">
                      <p className="font-semibold">{order.deliveryAddress?.fullName}</p>
                      <p className="tabular">
                        <a
                          href={`tel:+977${order.deliveryAddress?.mobile}`}
                          className="underline decoration-charcoal/25 underline-offset-4"
                        >
                          {order.deliveryAddress?.mobile
                            ? formatNepaliMobile(order.deliveryAddress.mobile)
                            : ""}
                        </a>
                      </p>
                      {order.deliveryAddress?.email && <p>{order.deliveryAddress.email}</p>}
                      <p className="pt-1 text-muted">
                        {[
                          order.deliveryAddress?.area,
                          order.deliveryAddress?.street,
                          order.deliveryAddress?.ward ? `Ward ${order.deliveryAddress.ward}` : null,
                          order.deliveryAddress?.municipality,
                          order.deliveryAddress?.district,
                          order.deliveryAddress?.province,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p className="pt-1 text-muted">
                        {order.deliveryMethodName} . {order.deliveryEstimate}
                      </p>
                    </address>
                    {order.customerNotes && (
                      <p className="mt-3 border-l-2 border-brass pl-3 text-[0.8125rem] text-muted">
                        {order.customerNotes}
                      </p>
                    )}
                  </div>

                  {/* Payment */}
                  <div>
                    <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                      Payment
                    </h3>
                    <p className="text-[0.8125rem] text-charcoal">{order.paymentMethodName}</p>
                    {order.paymentReference && (
                      <p className="tabular mt-1 text-[0.8125rem] text-muted">
                        Reference: {order.paymentReference}
                      </p>
                    )}
                    {proof && (
                      <a
                        href={proof}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-[0.8125rem] font-semibold text-forest underline underline-offset-4"
                      >
                        View payment screenshot
                      </a>
                    )}

                    {order.paymentStatus !== "paid" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => setPaymentStatus(order.id, "paid"))}
                        >
                          <span>Mark as paid</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => run(() => setPaymentStatus(order.id, "failed"))}
                        >
                          <span>Payment failed</span>
                        </Button>
                      </div>
                    )}
                    {order.paymentStatus === "paid" && (
                      <p className="mt-3 text-[0.75rem] text-muted">
                        Confirmed. Refunds are recorded by marking the payment refunded.
                      </p>
                    )}
                  </div>
                </div>

                {/* Fulfilment */}
                <div className="mt-6 border-t border-charcoal/12 pt-5">
                  <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                    Order status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {FLOW.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={pending || order.orderStatus === status}
                        onClick={() => run(() => updateOrderStatus(order.id, status))}
                        className={`rounded-[9px] border px-3 py-1.5 text-[0.75rem] font-semibold transition-colors ${
                          order.orderStatus === status
                            ? "border-forest bg-forest text-paper"
                            : "border-charcoal/18 bg-paper text-charcoal hover:border-charcoal/40"
                        } disabled:cursor-not-allowed`}
                      >
                        {ORDER_LABEL[status]}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={pending || order.orderStatus === "cancelled"}
                      onClick={() => run(() => updateOrderStatus(order.id, "cancelled"))}
                      className="rounded-[9px] border border-critical/35 px-3 py-1.5 text-[0.75rem] font-semibold text-critical transition-colors hover:bg-critical/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="mt-3 text-[0.75rem] text-muted">
                    Placed {new Date(order.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? "tabular font-bold text-charcoal" : "tabular text-charcoal"}>
        {value}
      </dd>
    </div>
  );
}
