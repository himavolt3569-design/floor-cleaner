export const SITE = {
  name: "TMG Cleaner",
  legalName: "TMG Cleaner",
  tagline: "Marble, Tile and Granite Cleaner",
  title: "TMG Cleaner | Marble, Tile & Granite Cleaner in Nepal",
  description:
    "Shop TMG Cleaner for marble, granite, tile, floors and other hard surfaces. Order online with convenient payment and home delivery options across supported locations in Nepal.",
  locale: "en_NP",
  currency: "NPR",
  country: "NP",
  /** Public origin. Set NEXT_PUBLIC_SITE_URL in production. */
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000",
} as const;

export const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#benefits", label: "Benefits" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#results", label: "Results" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
] as const;
