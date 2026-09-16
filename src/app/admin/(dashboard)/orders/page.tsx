import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/session";
import { listOrders, signedProofUrl } from "@/lib/data/admin";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { PageHeading } from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";

const FILTERS = [
  { label: "All", order: undefined, payment: undefined },
  { label: "New", order: "pending", payment: undefined },
  { label: "Needs verification", order: undefined, payment: "pending_verification" },
  { label: "Paid", order: undefined, payment: "paid" },
  { label: "Awaiting payment", order: undefined, payment: "pending" },
  { label: "Confirmed", order: "confirmed", payment: undefined },
  { label: "Processing", order: "processing", payment: undefined },
  { label: "Out for delivery", order: "out_for_delivery", payment: undefined },
  { label: "Delivered", order: "delivered", payment: undefined },
  { label: "Delivery failed", order: "delivery_failed", payment: undefined },
  { label: "Cancellation requested", order: "cancellation_requested", payment: undefined },
  { label: "Returned", order: "returned", payment: undefined },
  { label: "Cancelled", order: "cancelled", payment: undefined },
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  await requireSuperAdmin();

  const params = await searchParams;
  const orderStatus = typeof params.status === "string" ? params.status : undefined;
  const paymentStatus = typeof params.payment === "string" ? params.payment : undefined;
  const search = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  let orders = await listOrders({ orderStatus, paymentStatus, limit: 200 });

  if (search) {
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.deliveryAddress?.fullName?.toLowerCase().includes(search) ||
        o.deliveryAddress?.mobile?.includes(search),
    );
  }

  // Signed URLs are minted per request and expire, so screenshots never become
  // publicly addressable.
  const proofUrls: Record<string, string> = {};
  await Promise.all(
    orders
      .filter((o) => o.paymentProofUrl)
      .slice(0, 40)
      .map(async (o) => {
        const url = await signedProofUrl(o.paymentProofUrl as string);
        if (url) proofUrls[o.id] = url;
      }),
  );

  return (
    <>
      <PageHeading
        title="Orders"
        description="Confirm payments, move orders through fulfilment, and see where each one is going."
      />

      <nav aria-label="Filter orders" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const query = new URLSearchParams();
          if (filter.order) query.set("status", filter.order);
          if (filter.payment) query.set("payment", filter.payment);
          const href = `/admin/orders${query.size ? `?${query}` : ""}`;
          const active =
            (filter.order ?? undefined) === orderStatus &&
            (filter.payment ?? undefined) === paymentStatus;

          return (
            <Link
              key={filter.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-[9px] border px-3 py-1.5 text-[0.75rem] font-semibold transition-colors",
                active
                  ? "border-charcoal bg-charcoal text-paper"
                  : "border-charcoal/18 bg-paper text-muted hover:border-charcoal/40 hover:text-charcoal",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <form method="get" className="mb-6 flex gap-2">
        {orderStatus && <input type="hidden" name="status" value={orderStatus} />}
        {paymentStatus && <input type="hidden" name="payment" value={paymentStatus} />}
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search order number, name or mobile"
          aria-label="Search orders"
          className="h-10 w-full max-w-[22rem] rounded-[10px] border border-charcoal/18 bg-paper px-3.5 text-[0.875rem] focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18"
        />
        <button
          type="submit"
          className="h-10 rounded-[10px] bg-charcoal px-4 text-[0.8125rem] font-semibold text-paper hover:bg-espresso"
        >
          Search
        </button>
      </form>

      <OrdersTable orders={orders} proofUrls={proofUrls} />
    </>
  );
}
