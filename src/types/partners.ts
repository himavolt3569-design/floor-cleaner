export interface Partner {
  id: string;
  name: string;
  kind: "marketplace" | "courier" | "distributor" | "other";
  active: boolean;
  contact: string;
  accountReference: string;
  notes: string;
  integrationMode: "manual";
}
export type PartnerEntryKind = "stock_in" | "stock_out" | "sale" | "return" | "collection" | "remittance" | "fee" | "refund";
export interface PartnerEntry {
  id: string;
  partnerId: string;
  kind: PartnerEntryKind;
  sku: string;
  quantity: number;
  amountMinor: number;
  reference: string;
  orderId: string | null;
  occurredOn: string;
  note: string;
  actor: string;
  createdAt: string;
}
export interface PartnerOrder {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  grandTotalMinor: number;
  items: { sku: string; quantity: number }[];
  salesPartnerId: string | null;
  courierPartnerId: string | null;
  externalReference: string;
  trackingNumber: string;
  createdAt: string;
}
