import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/session";
import { listOrders, orderCounts } from "@/lib/data/admin";
import { formatNpr } from "@/lib/utils/money";
import { PageHeading, Panel, StatTile, StatusChip, Notice } from "@/components/admin/ui";

export default async function AdminOverviewPage() {
  await requireSuperAdmin();

  const [counts, recent] = await Promise.all([
    orderCounts(),
    listOrders({ limit: 8 }),
  ]);

  const needsVerification = counts["payment:pending_verification"] ?? 0;
  const revenueMinor = recent.reduce(
    (sum, o) => (o.paymentStatus === "paid" ? sum + o.grandTotalMinor : sum),
    0,
  );

  return (
    <>
      <PageHeading
        title="Overview"
        description="Orders, payments and stock at a glance."
      />

      {needsVerification > 0 && (
        <div className="mb-6">
          <Notice tone="warn">
            {needsVerification} payment{needsVerification === 1 ? "" : "s"} waiting
            for you to verify.{" "}
            <Link href="/admin/orders?payment=pending_verification" className="underline">
              Review now
            </Link>
          </Notice>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total orders" value={counts.total ?? 0} />
        <StatTile label="New" value={counts["order:pending"] ?? 0} hint="Not yet confirmed" />
        <StatTile label="Needs verification" value={needsVerification} hint="Manual payments" />
        <StatTile
          label="Out for delivery"
          value={counts["order:out_for_delivery"] ?? 0}
        />
      </div>

      <div className="mt-8">
        <Panel title="Recent orders">
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.875rem] text-muted">
              No orders yet. They will appear here as soon as the first one comes in.
            </p>
          ) : (
            <ul className="divide-y divide-charcoal/10">
              {recent.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <Link
                    href={`/admin/orders?q=${order.orderNumber}`}
                    className="tabular text-[0.875rem] font-bold text-charcoal underline decoration-charcoal/20 underline-offset-4 hover:decoration-charcoal"
                  >
                    {order.orderNumber}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-muted">
                    {order.deliveryAddress?.fullName ?? "Customer"}
                  </span>
                  <StatusChip kind="payment" status={order.paymentStatus} />
                  <StatusChip kind="order" status={order.orderStatus} />
                  <span className="tabular text-[0.875rem] font-semibold text-charcoal">
                    {formatNpr(order.grandTotalMinor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {revenueMinor > 0 && (
        <p className="mt-4 text-[0.75rem] text-muted">
          Paid across the {recent.length} most recent orders: {formatNpr(revenueMinor)}
        </p>
      )}
    </>
  );
}
