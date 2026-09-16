import type { PaymentKind, DeliveryKind, PaymentStatus, OrderStatus } from "@/types";

export interface QuoteDelivery {
  id: string;
  kind: DeliveryKind;
  name: string;
  description: string;
  estimate: string;
  feeMinor: number;
  baseFeeMinor: number;
  freeApplied: boolean;
}

export interface QuotePayment {
  id: string;
  kind: PaymentKind;
  name: string;
  description: string;
  requiresVerification: boolean;
  instructions: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  qrImageUrl: string | null;
}

export interface QuoteItem {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
}

export interface QuoteResponse {
  ok: true;
  items: QuoteItem[];
  subtotalMinor: number;
  deliveryMethods: QuoteDelivery[];
  /** The option the checkout preselects. Null when only pickup is available. */
  recommendedId: string | null;
  paymentMethods: QuotePayment[];
}

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentKind: PaymentKind;
  requiresVerification: boolean;
  deliveryMethodName: string;
  deliveryEstimate: string;
  customerName: string;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
  fields?: Record<string, string>;
}
