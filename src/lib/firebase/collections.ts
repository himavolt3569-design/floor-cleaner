/** Firestore collection paths. Single place so rules and code cannot drift. */
export const COLLECTIONS = {
  products: "products",
  variants: "variants",
  orders: "orders",
  orderEvents: "orderEvents",
  customers: "customers",
  paymentMethods: "paymentMethods",
  deliveryMethods: "deliveryMethods",
  siteSettings: "siteSettings",
  faqs: "faqs",
  benefits: "benefits",
  surfaces: "surfaces",
  steps: "steps",
  comparisons: "comparisons",
  media: "media",
  contactSubmissions: "contactSubmissions",
  adminUsers: "adminUsers",
  discountCodes: "discountCodes",
  inventoryLogs: "inventoryLogs",
  paymentTransactions: "paymentTransactions",
  idempotency: "idempotencyKeys",
  rateLimits: "rateLimits",
  counters: "counters",
} as const;

/** The single settings document. */
export const SETTINGS_DOC = "site";
