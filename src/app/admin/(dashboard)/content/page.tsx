import { requireSuperAdmin } from "@/lib/auth/session";
import { listComparisons, listContent, listFaqs, listProducts, listPaymentMethods, listDeliveryMethods } from "@/lib/data/admin";
import { getStorefrontData } from "@/lib/data/storefront";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { ProductsEditor } from "@/components/admin/ProductsEditor";
import { PaymentsEditor } from "@/components/admin/PaymentsEditor";
import { DeliveryEditor } from "@/components/admin/DeliveryEditor";
import { ControlCenter } from "@/components/admin/ControlCenter";
import { listPartners } from "@/lib/partners/data";
import { CopyEditor } from "@/components/admin/CopyEditor";
import { FaqEditor } from "@/components/admin/FaqEditor";
import { ContentListEditor } from "@/components/admin/ContentListEditor";
import { ComparisonsEditor } from "@/components/admin/ComparisonsEditor";
import { PageHeading } from "@/components/admin/ui";

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSuperAdmin();

  const [faqs, benefits, steps, surfaces, comparisons, products, payments, delivery, storefront, params, partners] = await Promise.all([
    listFaqs(),
    listContent("benefits"),
    listContent("steps"),
    listContent("surfaces"),
    listComparisons(),
    listProducts(), listPaymentMethods(), listDeliveryMethods(), getStorefrontData(), searchParams, listPartners(),
  ]);

  return (
    <>
      <PageHeading
        title="Store control center"
        description="Edit the website, imagery, products, delivery and payments in one place. Each editor saves independently."
      />

      <ControlCenter initial={params.tab} sections={[
        { id: "copy", label: "Page copy & contact", content: <SettingsForm settings={storefront.settings} /> },
        { id: "labels", label: "Labels & translations", content: <CopyEditor overrides={storefront.settings.copyOverrides} /> },
        { id: "products", label: "Products & images", content: <ProductsEditor products={products} /> },
        { id: "delivery", label: "Delivery", content: <DeliveryEditor methods={delivery} partners={partners} /> },
        { id: "payments", label: "Payments", content: <PaymentsEditor methods={payments} /> },
        { id: "sections", label: "Sections & FAQs", content: <div className="space-y-14">
        <ContentListEditor
          kind="benefits"
          items={benefits}
          title="Benefits"
          description="The numbered list in the Why it works section. Only add a claim that appears on the product packaging."
        />

        <ContentListEditor
          kind="steps"
          items={steps}
          title="How to use"
          description="Application steps. Edit the manufacturer note in Page copy & contact."
        />

        <ContentListEditor
          kind="surfaces"
          items={surfaces}
          title="Surfaces"
          description="Surface compatibility. A surface with a photograph gets a photographic tile; one without gets a typographic block."
        />

        <ComparisonsEditor comparisons={comparisons} />

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-[1.5rem] leading-none tracking-[-0.02em] text-charcoal">
              Questions
            </h2>
            <p className="mt-1.5 max-w-[56ch] text-[0.8125rem] text-muted">
              Shown in the FAQ section and in the structured data search engines read.
            </p>
          </div>
          <FaqEditor faqs={faqs} />
        </section>
      </div> },
      ]} />
    </>
  );
}
