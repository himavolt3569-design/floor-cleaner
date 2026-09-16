import { requireSuperAdmin } from "@/lib/auth/session";
import { listComparisons, listContent, listFaqs } from "@/lib/data/admin";
import { FaqEditor } from "@/components/admin/FaqEditor";
import { ContentListEditor } from "@/components/admin/ContentListEditor";
import { ComparisonsEditor } from "@/components/admin/ComparisonsEditor";
import { PageHeading } from "@/components/admin/ui";

export default async function AdminContentPage() {
  await requireSuperAdmin();

  const [faqs, benefits, steps, surfaces, comparisons] = await Promise.all([
    listFaqs(),
    listContent("benefits"),
    listContent("steps"),
    listContent("surfaces"),
    listComparisons(),
  ]);

  return (
    <>
      <PageHeading
        title="Content"
        description="The editorial sections of the storefront. Everything here is read straight from Firestore, so no code change is needed to update the page."
      />

      <div className="space-y-14">
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
          description="The four steps. Dilution and application detail belongs in the manufacturer note on the Settings page, not invented here."
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
      </div>
    </>
  );
}
