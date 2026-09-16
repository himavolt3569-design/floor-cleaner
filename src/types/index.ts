/**
 * TMG Cleaner - shared domain types.
 *
 * Money convention: every monetary value is an INTEGER number of *paisa*
 * (1 NPR = 100 paisa) and is always named `*Minor`. Nothing in this codebase
 * stores money as a float. Use `formatNpr` / `rupeesToMinor` in lib/utils/money.
 */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "out_for_delivery"
  | "delivery_failed"
  | "delivered"
  | "cancellation_requested"
  | "cancelled"
  | "returned";

/** Why a courier could not hand the parcel over. Fixed list plus a free note. */
export type DeliveryFailureReason =
  | "customer_unreachable"
  | "address_not_found"
  | "customer_refused"
  | "payment_not_ready"
  | "rescheduled_by_customer"
  | "area_not_serviced"
  | "damaged_in_transit"
  | "other";

export type CancellationState = "none" | "requested" | "approved" | "refused";

export interface OrderCancellation {
  state: CancellationState;
  /** Who asked. An admin cancelling outright is recorded as "admin". */
  requestedBy: "customer" | "admin" | null;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
}

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "pending_verification"
  | "paid"
  | "failed"
  | "refunded";

export type PaymentKind =
  | "cod"
  | "qr"
  | "bank_transfer"
  | "esewa"
  | "khalti"
  | "fonepay"
  | "custom";

export type DeliveryKind = "home" | "valley" | "outside_valley" | "pickup" | "same_day";

/* ------------------------------------------------------------------ catalog */

export interface ProductVariant {
  id: string;
  label: string;        // "1 Litre"
  volume: string;       // "1000 ml"
  sku: string;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  stock: number;
  active: boolean;
  sortOrder: number;
  /** Pre-selected size on the storefront. Falls back to the first in stock. */
  isDefault?: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  active: boolean;
  featured: boolean;
  category: string;
  surfaceTypes: string[];
  images: string[];
  variants: ProductVariant[];
}

/* -------------------------------------------------------------- commerce */

export interface CartLine {
  productId: string;
  variantId: string;
  /** Display-only. The server always re-reads authoritative prices. */
  name: string;
  variantLabel: string;
  image: string;
  unitPriceMinor: number;
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  kind: PaymentKind;
  name: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
  /** Manual methods (QR, bank transfer) settle as `pending_verification`. */
  requiresVerification: boolean;
  instructions?: string;
  accountTitle?: string;
  accountNumber?: string;
  qrImageUrl?: string;
  /** True only when a server-side gateway integration is configured. */
  gatewayConfigured?: boolean;
}

export interface DeliveryMethod {
  partnerId?: string | null;
  id: string;
  kind: DeliveryKind;
  name: string;
  description: string;
  feeMinor: number;
  estimate: string;              // "1 to 2 days"
  enabled: boolean;
  sortOrder: number;
  /** Empty array = available everywhere. Matched against the chosen province. */
  provinces: string[];
  /** Empty array = available in every district of the matched provinces. */
  districts: string[];
  minimumOrderMinor: number | null;
  freeDeliveryThresholdMinor: number | null;
}

export interface DeliveryAddress {
  fullName: string;
  mobile: string;
  email?: string;
  province: string;
  district: string;
  municipality: string;
  ward?: string;
  area: string;
  street?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  sku: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
}

export interface OrderTotals {
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
}

export interface Order extends OrderTotals {
  id: string;
  orderNumber: string;
  customerId: string | null;
  items: OrderItem[];
  currency: "NPR";
  paymentMethodId: string;
  paymentMethodName: string;
  paymentKind: PaymentKind;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  deliveryMethodId: string;
  deliveryMethodName: string;
  deliveryEstimate: string;
  deliveryAddress: DeliveryAddress;
  orderStatus: OrderStatus;
  /** Number of times a courier has attempted delivery. */
  deliveryAttempts: number;
  lastFailureReason: DeliveryFailureReason | null;
  lastFailureNote: string | null;
  cancellation: OrderCancellation | null;
  /** Set once, when stock has been returned. Guards against double restocking. */
  stockRestoredAt: string | null;
  customerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------------------------------------------- content */

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
}

export interface Benefit {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
}

export interface SurfaceEntry {
  id: string;
  name: string;
  body: string;
  image: string | null;
  sortOrder: number;
}

export interface UsageStep {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
}

export interface ComparisonEntry {
  id: string;
  label: string;
  caption: string;
  beforeImage: string;
  afterImage: string;
  sortOrder: number;
}

export interface SiteSettings {
  copyOverrides?: Record<string,string>;
  announcement: string | null;
  announcementEnabled: boolean;
  hero: {
    eyebrow: string;
    headline: string[];
    body: string;
    primaryCta: string;
    secondaryCta: string;
    support: string;
    image?: string;
  };
  intro: { eyebrow: string; headline: string; body: string; image?: string };
  why: { headline: string; body: string[] };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapUrl: string | null;
  };
  social: { label: string; url: string }[];
  /** Admin-editable dilution / application guidance from the manufacturer. */
  usageNote: string | null;
}

export interface StorefrontData {
  product: Product;
  settings: SiteSettings;
  benefits: Benefit[];
  surfaces: SurfaceEntry[];
  steps: UsageStep[];
  comparisons: ComparisonEntry[];
  faqs: Faq[];
  paymentMethods: PaymentMethod[];
  deliveryMethods: DeliveryMethod[];
  /** True when values came from Firestore rather than bundled defaults. */
  live: boolean;
}
