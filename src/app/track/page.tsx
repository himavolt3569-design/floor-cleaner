import { cookies } from "next/headers";
import Link from "next/link";
import { CUSTOMER_COOKIE, isCustomerKey } from "@/lib/commerce/customer-key";
import { listOrdersForCustomer } from "@/lib/data/tracking";
import { OrderCard } from "@/components/track/OrderCard";
import { LookupForm } from "@/components/track/LookupForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your orders",
  description: "Track an order you placed with TMG Cleaner.",
};

export default async function TrackPage() {
  const key = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  const orders = isCustomerKey(key) ? await listOrdersForCustomer(key) : [];

  return (
    <main className="shell py-[var(--spacing-section)]">
      <h1 className="display-sub">Your orders</h1>
      <p className="mt-3 max-w-[48ch] text-[0.9375rem] text-muted">
        Orders placed from this device appear here. There is no account to sign
        in to.
      </p>

      {orders.length > 0 ? (
        <div className="mt-8 grid gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.orderNumber}
              order={order}
              href={`/track/${order.orderNumber}`}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-[16px] border border-dashed border-charcoal/25 bg-paper/60 p-5 text-[0.875rem] text-muted">
          No orders from this device yet. If you ordered from another phone or
          browser, find it below.
        </p>
      )}

      <section className="mt-12 rounded-[16px] border border-charcoal/12 bg-paper p-5 sm:p-6">
        <h2 className="text-[1rem] font-bold text-charcoal">
          Find an order from another device
        </h2>
        <p className="mb-5 mt-2 max-w-[52ch] text-[0.875rem] text-muted">
          Enter the order number from your confirmation and the mobile number
          you gave us.
        </p>
        <LookupForm />
      </section>

      <p className="mt-10 text-[0.8125rem] text-muted">
        <Link
          href="/"
          className="font-semibold text-forest underline underline-offset-4"
        >
          Back to the shop
        </Link>
      </p>
    </main>
  );
}
