import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { headers } from "next/headers";
import { SITE } from "@/config/site";
import { FirebaseAnalytics } from "@/components/analytics/FirebaseAnalytics";
import "./globals.css";

/**
 * Poppins carries the whole site: display headings, interface and body.
 *
 * It is a static family rather than variable, so every weight the design uses
 * is requested explicitly. 300 is reserved for the largest display sizes, where
 * a heavier cut would feel blunt.
 */
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "TMG Cleaner",
    "marble cleaner Nepal",
    "granite cleaner",
    "tile cleaner",
    "floor cleaner Nepal",
    "driveway cleaner",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
    images: [
      {
        url: "/product/tmg-bottle.png",
        width: 560,
        height: 1488,
        alt: "TMG Marble, Tile and Granite Cleaner bottle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: ["/product/tmg-bottle.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Set by proxy.ts alongside the Content-Security-Policy header.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`no-js ${poppins.variable}`}
      // The inline script below swaps no-js for js before hydration, so the
      // server and client class lists legitimately differ on this element.
      suppressHydrationWarning
    >
      <body>
        {/*
          Swap no-js -> js before first paint so reveal animations start hidden
          only when there is JavaScript available to reveal them again.
        */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.remove("no-js");document.documentElement.classList.add("js");`,
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-forest focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        {children}
        <FirebaseAnalytics />
      </body>
    </html>
  );
}
