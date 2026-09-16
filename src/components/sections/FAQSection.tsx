"use client";

import type { DeliveryMethod, Faq, PaymentMethod } from "@/types";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { FAQAccordion } from "./FAQAccordion";
import { formatNpr } from "@/lib/utils/money";

/**
 * FAQ plus the concrete delivery and payment facts. Both lists are generated
 * from what the admin has enabled, so the page cannot promise an option that
 * is switched off.
 */
export function FAQSection({
  faqs,
  deliveryMethods,
  paymentMethods,
}: {
  faqs: Faq[];
  deliveryMethods: DeliveryMethod[];
  paymentMethods: PaymentMethod[];
}) {
  const { lang } = useLanguage();
  const t = useTranslations();

  return (
    <section
      id="faq"
      className="bg-ivory py-[var(--spacing-section)]"
      aria-labelledby="faq-heading"
    >
      <div className="shell">
        <div className="grid gap-y-12 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <p data-reveal="fade" className="eyebrow text-brass-ink">
                {t.faq.eyebrow}
              </p>
              <h2
                id="faq-heading"
                data-reveal="fade-up"
                data-reveal-delay="0.05"
                className="display-section mt-5 max-w-[10ch]"
              >
                {t.faq.headline}
              </h2>

              {(deliveryMethods.length > 0 || paymentMethods.length > 0) && (
                <div
                  data-reveal="fade-up"
                  data-reveal-delay="0.1"
                  className="mt-10 space-y-7"
                >
                  {deliveryMethods.length > 0 && (
                    <div>
                      <h3 className="eyebrow text-muted">{t.faq.deliveryTitle}</h3>
                      <ul className="mt-3 space-y-2.5">
                        {deliveryMethods.map((method) => (
                          <li key={method.id} className="text-[0.8125rem] leading-relaxed">
                            <span className="font-semibold text-charcoal">
                              {lang === "ne"
                                ? method.id.includes("valley") || method.id.includes("ktm")
                                  ? "काठमाडौं उपत्यका"
                                  : method.id.includes("outside")
                                    ? "उपत्यका बाहिर (नेपालभर)"
                                    : method.name
                                : method.name}
                            </span>
                            <span className="tabular text-muted">
                              {" . "}
                              {method.feeMinor === 0
                                ? lang === "ne"
                                  ? "निःशुल्क"
                                  : "Free"
                                : formatNpr(method.feeMinor)}
                              {" . "}
                              {method.estimate}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {paymentMethods.length > 0 && (
                    <div>
                      <h3 className="eyebrow text-muted">{t.faq.paymentTitle}</h3>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {paymentMethods.map((method) => (
                          <li
                            key={method.id}
                            className="rounded-[9px] border border-charcoal/15 bg-paper px-2.5 py-1.5 text-[0.75rem] font-medium text-charcoal"
                          >
                            {lang === "ne"
                              ? method.kind === "cod"
                                ? "डेलिभरीमा भुक्तानी (COD)"
                                : method.kind === "qr"
                                  ? "QR भुक्तानी"
                                  : method.kind === "bank_transfer"
                                    ? "बैंक ट्रान्सफर"
                                    : method.name
                              : method.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div data-reveal="fade" className="lg:col-span-8">
            <FAQAccordion faqs={faqs} />
          </div>
        </div>
      </div>
    </section>
  );
}
