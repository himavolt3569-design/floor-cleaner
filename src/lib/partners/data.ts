import "server-only";
import { requireDb } from "@/lib/firebase/admin";
import type { Partner, PartnerEntry, PartnerOrder } from "@/types/partners";

export async function listPartners(): Promise<Partner[]> {
  const snap = await requireDb().collection("partners").get();
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Partner)).sort((a, b) => a.name.localeCompare(b.name));
}
export async function partnerReportData() {
  const db = requireDb();
  // No arbitrary latest-N cap: report totals include the whole ledger.
  const [partners, ledger, orders] = await Promise.all([listPartners(), db.collection("partnerEntries").get(), db.collection("orders").select("orderNumber", "orderStatus", "paymentStatus", "grandTotalMinor", "items", "salesPartnerId", "courierPartnerId", "externalReference", "trackingNumber", "createdAt").get()]);
  const entries = ledger.docs.map(doc => ({ ...doc.data(), id: doc.id, createdAt: doc.data().createdAt?.toDate?.().toISOString() ?? "" } as PartnerEntry));
  const linkedOrders = orders.docs.map(doc => {
    const d = doc.data();
    return { id: doc.id, orderNumber: d.orderNumber ?? doc.id, orderStatus: d.orderStatus ?? "pending", paymentStatus: d.paymentStatus ?? "unpaid", grandTotalMinor: d.grandTotalMinor ?? 0, items: (d.items ?? []).map((i: { sku: string; quantity: number }) => ({ sku: i.sku, quantity: i.quantity })), salesPartnerId: d.salesPartnerId ?? null, courierPartnerId: d.courierPartnerId ?? null, externalReference: d.externalReference ?? "", trackingNumber: d.trackingNumber ?? "", createdAt: d.createdAt?.toDate?.().toISOString() ?? "" } satisfies PartnerOrder;
  });
  return { partners, entries, orders: linkedOrders };
}
