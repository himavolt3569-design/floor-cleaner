import { headers } from "next/headers";
import { getStorefrontData } from "@/lib/data/storefront";
import { SITE } from "@/config/site";
import { minorToRupees } from "@/lib/utils/money";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/sections/HeroSection";
import { IntroSection } from "@/components/sections/IntroSection";
import { SurfaceSection } from "@/components/sections/SurfaceSection";
import { BeforeAfterSection } from "@/components/sections/BeforeAfterSection";
import { BenefitsSection } from "@/components/sections/BenefitsSection";
import { FeaturedProduct } from "@/components/commerce/FeaturedProduct";
import { HowToUseSection } from "@/components/sections/HowToUseSection";
import { WhyTmgSection } from "@/components/sections/WhyTmgSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { CheckoutModal } from "@/components/checkout/CheckoutModal";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { StoreCopyProvider } from "@/components/layout/StoreCopyProvider";

export default async function HomePage() {
  const data = await getStorefrontData();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const {
    settings,
    product,
    benefits,
    surfaces,
    steps,
    comparisons,
    faqs,
    paymentMethods,
    deliveryMethods,
  } = data;

  return (
    <StoreCopyProvider overrides={settings.copyOverrides}>
      <SiteHeader
        announcement={settings.announcementEnabled ? settings.announcement : null}
      />

      <main id="main">
        <HeroSection
          settings={settings}
          productImage={product.images[0]}
          productName={product.name}
        />
        <SurfaceSection surfaces={surfaces} />
        <BeforeAfterSection comparisons={comparisons} />
        <FeaturedProduct
          product={product}
          paymentMethods={paymentMethods}
          deliveryMethods={deliveryMethods}
        />
        <HowToUseSection steps={steps} usageNote={settings.usageNote} />
        <BenefitsSection benefits={benefits} />
        <IntroSection settings={settings} />
        <WhyTmgSection settings={settings} />
        <FinalCTA
          product={product}
          paymentMethods={paymentMethods}
          deliveryMethods={deliveryMethods}
        />
        <FAQSection
          faqs={faqs}
          deliveryMethods={deliveryMethods}
          paymentMethods={paymentMethods}
        />
      </main>

      <SiteFooter settings={settings} paymentMethods={paymentMethods} />

      <CartDrawer />
      <CheckoutModal settings={settings} />
      <MotionProvider />

      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildStructuredData(data)),
        }}
      />
    </StoreCopyProvider>
  );
}

/**
 * Organization, Product and FAQ structured data.
 *
 * Offers are generated from the live variants, so the prices Google sees are
 * the same ones the storefront shows. No review or rating markup is emitted:
 * the business has no collected reviews, and inventing them would be fraud.
 */
function buildStructuredData(
  data: Awaited<ReturnType<typeof getStorefrontData>>,
) {
  const { product, settings, faqs } = data;
  const inStock = product.variants.some((v) => v.active && v.stock > 0);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}#organization`,
        name: SITE.name,
        url: SITE.url,
        email: settings.contact.email,
        telephone: settings.contact.phone,
        address: {
          "@type": "PostalAddress",
          addressLocality: settings.contact.address,
          addressCountry: "NP",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}#website`,
        url: SITE.url,
        name: SITE.name,
        publisher: { "@id": `${SITE.url}#organization` },
        inLanguage: "en",
      },
      {
        "@type": "Product",
        "@id": `${SITE.url}#product`,
        name: product.name,
        description: product.shortDescription,
        image: [`${SITE.url}${product.images[0]}`],
        brand: { "@type": "Brand", name: SITE.name },
        category: product.category,
        offers: product.variants
          .filter((v) => v.active)
          .map((variant) => ({
            "@type": "Offer",
            name: variant.label,
            sku: variant.sku,
            price: minorToRupees(variant.priceMinor).toFixed(2),
            priceCurrency: "NPR",
            availability:
              variant.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: `${SITE.url}#product`,
            seller: { "@id": `${SITE.url}#organization` },
          })),
        ...(inStock ? {} : { availability: "https://schema.org/OutOfStock" }),
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE.url}#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
