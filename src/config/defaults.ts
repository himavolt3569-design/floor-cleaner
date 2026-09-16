import type {
  Benefit,
  ComparisonEntry,
  DeliveryMethod,
  Faq,
  PaymentMethod,
  Product,
  SiteSettings,
  SurfaceEntry,
  UsageStep,
} from "@/types";

/**
 * Bundled defaults.
 *
 * These render the storefront before Firestore is provisioned, and act as the
 * seed payload for `pnpm seed`. Once Firestore holds data it becomes the single
 * source of truth and these values are no longer read.
 *
 * Every product claim below is taken from the TMG Cleaner packaging and
 * marketing artwork supplied by the business. Nothing here is invented.
 */

export const DEFAULT_PRODUCT: Product = {
  id: "tmg-cleaner",
  name: "TMG Marble, Tile and Granite Cleaner",
  slug: "tmg-cleaner",
  shortDescription:
    "Stain and dirt remover for marble, tile, granite, floors and driveways.",
  description:
    "TMG Cleaner is an everyday cleaner for hard surfaces. It lifts dirt, stains and stubborn marks from marble, tile and granite, and is equally at home on floors and driveways. The formula is odorless and gentle on the surface it cleans, which makes it practical for homes, offices and commercial spaces.",
  active: true,
  featured: true,
  category: "Surface cleaner",
  surfaceTypes: ["Marble", "Granite", "Tile", "Floors", "Driveways"],
  images: ["/product/tmg-bottle.png"],
  variants: [
    {
      id: "500ml",
      label: "500 ml",
      volume: "500 ml",
      sku: "TMG-500",
      priceMinor: 45_000,
      compareAtPriceMinor: null,
      stock: 40,
      active: true,
      sortOrder: 1,
    },
    {
      id: "1l",
      label: "1 Litre",
      volume: "1000 ml",
      sku: "TMG-1000",
      priceMinor: 75_000,
      compareAtPriceMinor: null,
      stock: 60,
      active: true,
      sortOrder: 2,
      isDefault: true,
    },
    {
      id: "5l",
      label: "5 Litre",
      volume: "5000 ml",
      sku: "TMG-5000",
      priceMinor: 320_000,
      compareAtPriceMinor: null,
      stock: 18,
      active: true,
      sortOrder: 3,
    },
  ],
};

export const DEFAULT_SETTINGS: SiteSettings = {
  announcement:
    "Now delivering across Nepal. Cash on delivery available in supported areas.",
  announcementEnabled: true,
  hero: {
    // Blank shows the branded TMG arch with the bottle. A path here replaces
    // the whole composition with a single photograph.
    image: "",
    eyebrow: "Marble . Tile . Granite",
    headline: ["Made for surfaces", "worth looking", "after."],
    body: "A powerful everyday cleaner formulated for marble, granite, tile, floors and driveways. Built to remove dirt, stains and stubborn marks while leaving surfaces clean and refreshed.",
    primaryCta: "Shop TMG Cleaner",
    secondaryCta: "See the results",
    support: "For marble, granite, tile and everyday hard surfaces.",
  },
  intro: {
    image: "/imagery/tmg-campaign.png",
    eyebrow: "One cleaner. Multiple surfaces.",
    headline: "Built for the surfaces that define your space.",
    body: "Stone and tile carry a room. They also take the most traffic, the most spills and the most cleaning. TMG Cleaner is made for that daily reality: one bottle that works across marble, granite and tile without asking you to keep a different product for every floor in the building.",
  },
  why: {
    headline: "Cleaning should restore a space, not overwhelm it.",
    body: [
      "Most surface cleaners announce themselves. You smell them from the next room, and the room stays unusable until the air clears.",
      "TMG Cleaner is odorless, which matters more than it sounds. It means a shop floor can be cleaned during opening hours, a stairwell can be washed on a weekday morning, and a kitchen goes back into service as soon as it dries.",
      "It is sold in Nepal, delivered from Nepal, and priced for the way people here actually buy: a bottle at a time for the house, or five litres at a time for a building.",
    ],
  },
  contact: {
    phone: "+977 9800000000",
    whatsapp: "+977 9800000000",
    email: "hello@tmgcleaner.com",
    address: "Kathmandu, Nepal",
    mapUrl: null,
  },
  social: [],
  usageNote: null,
};

export const DEFAULT_BENEFITS: Benefit[] = [
  {
    id: "dirt",
    title: "Removes dirt, stains and marks",
    body: "Effectively cleans old stains and stubborn dirt that ordinary mopping leaves behind.",
    sortOrder: 1,
  },
  {
    id: "safe",
    title: "Safe for surfaces",
    body: "Cleans without damaging the floors you paid to install.",
    sortOrder: 2,
  },
  {
    id: "gentle",
    title: "Gentle yet powerful formula",
    body: "Tough on dirt, kind to the surface underneath it.",
    sortOrder: 3,
  },
  {
    id: "odorless",
    title: "Odorless and safe to use",
    body: "No harsh smell, so a room stays usable while it is being cleaned.",
    sortOrder: 4,
  },
  {
    id: "shine",
    title: "Long lasting shine",
    body: "Leaves floors clean, shiny and fresh rather than dulled by residue.",
    sortOrder: 5,
  },
  {
    id: "spaces",
    title: "Home, office and commercial use",
    body: "Practical for a single apartment and for a building cleaned every day.",
    sortOrder: 6,
  },
];

export const DEFAULT_SURFACES: SurfaceEntry[] = [
  {
    id: "marble",
    name: "Marble",
    body: "Lifts everyday dirt and marks while preserving the polished character of the stone.",
    image: "/surfaces/marble.webp",
    sortOrder: 1,
  },
  {
    id: "granite",
    name: "Granite",
    body: "Refreshes high use stone surfaces and brings back a visibly cleaner finish.",
    image: "/surfaces/granite.webp",
    sortOrder: 2,
  },
  {
    id: "tile",
    name: "Tile",
    body: "Cuts through accumulated dirt and the stubborn marks that settle along grout lines.",
    image: "/surfaces/tile.webp",
    sortOrder: 3,
  },
  {
    id: "floors",
    name: "Floors",
    body: "Made for the floors that get walked on all day, in homes and in busy commercial spaces.",
    image: null,
    sortOrder: 4,
  },
  {
    id: "driveways",
    name: "Driveways",
    body: "Works outdoors on the hard surfaces that collect dust, tyre marks and weather.",
    image: null,
    sortOrder: 5,
  },
];

export const DEFAULT_STEPS: UsageStep[] = [
  {
    id: "prepare",
    title: "Prepare the surface",
    body: "Sweep or dust the area first so loose grit is not dragged across the surface.",
    sortOrder: 1,
  },
  {
    id: "apply",
    title: "Apply",
    body: "Apply TMG Cleaner following the dilution and application guidance printed on the bottle.",
    sortOrder: 2,
  },
  {
    id: "clean",
    title: "Clean",
    body: "Work across the surface evenly with a mop, brush or cloth suited to the material.",
    sortOrder: 3,
  },
  {
    id: "finish",
    title: "Finish",
    body: "Let the surface dry, then check the result and repeat on any areas that need it.",
    sortOrder: 4,
  },
];

export const DEFAULT_COMPARISONS: ComparisonEntry[] = [
  {
    id: "marble",
    label: "Marble",
    caption: "Removes stains and restores natural beauty.",
    beforeImage: "/results/marble-before.webp",
    afterImage: "/results/marble-after.webp",
    sortOrder: 1,
  },
  {
    id: "tile",
    label: "Tile",
    caption: "Cleans tough dirt and stubborn marks.",
    beforeImage: "/results/tile-before.webp",
    afterImage: "/results/tile-after.webp",
    sortOrder: 2,
  },
  {
    id: "granite",
    label: "Granite",
    caption: "Brings back the shine and freshness.",
    beforeImage: "/results/granite-before.webp",
    afterImage: "/results/granite-after.webp",
    sortOrder: 3,
  },
];

export const DEFAULT_FAQS: Faq[] = [
  {
    id: "surfaces",
    question: "What surfaces can I use TMG Cleaner on?",
    answer:
      "Marble, granite and tile, plus floors and driveways made of similar hard materials. On any finish you have not cleaned before, test a small hidden area first.",
    sortOrder: 1,
    active: true,
  },
  {
    id: "how",
    question: "How do I use the product?",
    answer:
      "Clear loose dust, apply the cleaner following the guidance printed on the bottle, work across the surface with a suitable mop or cloth, then let it dry.",
    sortOrder: 2,
    active: true,
  },
  {
    id: "outside",
    question: "Do you deliver outside Kathmandu Valley?",
    answer:
      "Enter your address at checkout and the delivery options available for that location will be shown, along with the fee and the expected time.",
    sortOrder: 3,
    active: true,
  },
  {
    id: "payment",
    question: "Which payment methods do you accept?",
    answer:
      "The methods currently accepted are listed at checkout. Options can include cash on delivery, QR payment and bank transfer depending on your delivery area.",
    sortOrder: 4,
    active: true,
  },
  {
    id: "cod",
    question: "Can I pay after delivery?",
    answer:
      "Where cash on delivery is available for your area it will appear as a payment option at checkout. If it is not shown, it is not currently available for that location.",
    sortOrder: 5,
    active: true,
  },
  {
    id: "time",
    question: "How long does delivery take?",
    answer:
      "Each delivery option shows its own estimate at checkout before you confirm the order.",
    sortOrder: 6,
    active: true,
  },
  {
    id: "bulk",
    question: "Can businesses order in larger quantities?",
    answer:
      "Yes. The 5 litre size is intended for regular and commercial cleaning. For larger or repeat orders, contact us using the details in the footer.",
    sortOrder: 7,
    active: true,
  },
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cod",
    kind: "cod",
    name: "Cash on delivery",
    description: "Pay the courier in cash when the order arrives.",
    enabled: true,
    sortOrder: 1,
    requiresVerification: false,
  },
  {
    id: "qr",
    kind: "qr",
    name: "QR payment",
    description: "Scan the QR code with any mobile banking or wallet app.",
    enabled: true,
    sortOrder: 2,
    requiresVerification: true,
    accountTitle: "TMG Cleaner",
    instructions:
      "Scan the QR code, pay the exact order total, then enter the transaction reference or upload the payment screenshot so we can confirm it.",
  },
  {
    id: "bank",
    kind: "bank_transfer",
    name: "Bank transfer",
    description: "Transfer the total to the account shown, then share the reference.",
    enabled: false,
    sortOrder: 3,
    requiresVerification: true,
  },
  {
    id: "esewa",
    kind: "esewa",
    name: "eSewa",
    description: "Pay through eSewa.",
    enabled: false,
    sortOrder: 4,
    requiresVerification: false,
    gatewayConfigured: false,
  },
  {
    id: "khalti",
    kind: "khalti",
    name: "Khalti",
    description: "Pay through Khalti.",
    enabled: false,
    sortOrder: 5,
    requiresVerification: false,
    gatewayConfigured: false,
  },
];

export const DEFAULT_DELIVERY_METHODS: DeliveryMethod[] = [
  {
    id: "valley",
    kind: "valley",
    name: "Kathmandu Valley delivery",
    description: "Delivered to your address inside the valley.",
    feeMinor: 10_000,
    estimate: "1 to 2 days",
    enabled: true,
    sortOrder: 1,
    provinces: ["Bagmati"],
    districts: ["Kathmandu", "Lalitpur", "Bhaktapur"],
    minimumOrderMinor: null,
    freeDeliveryThresholdMinor: 200_000,
  },
  {
    id: "outside",
    kind: "outside_valley",
    name: "Outside valley delivery",
    description: "Sent by courier to your municipality.",
    feeMinor: 20_000,
    estimate: "3 to 5 days",
    enabled: true,
    sortOrder: 2,
    provinces: [],
    districts: [],
    minimumOrderMinor: null,
    freeDeliveryThresholdMinor: null,
  },
  {
    id: "pickup",
    kind: "pickup",
    name: "Pickup",
    description: "Collect the order yourself from our location in Kathmandu.",
    feeMinor: 0,
    estimate: "Ready same day",
    enabled: true,
    sortOrder: 3,
    provinces: ["Bagmati"],
    districts: ["Kathmandu", "Lalitpur", "Bhaktapur"],
    minimumOrderMinor: null,
    freeDeliveryThresholdMinor: null,
  },
];
