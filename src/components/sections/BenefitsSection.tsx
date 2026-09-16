"use client";

import type { Benefit } from "@/types";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";

/**
 * Benefits as an editorial numbered list rather than a grid of cards.
 * Hairlines and a sticky heading carry the structure; there is no box.
 */
export function BenefitsSection({ benefits }: { benefits: Benefit[] }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  if (!benefits.length) return null;

  return (
    <section
      id="benefits"
      className="bg-paper py-[var(--spacing-section)]"
      aria-labelledby="benefits-heading"
    >
      <div className="shell">
        <div className="grid gap-y-12 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p data-reveal="fade" className="eyebrow text-brass-ink">
                {t.benefits.eyebrow}
              </p>
              <h2
                id="benefits-heading"
                data-reveal="fade-up"
                data-reveal-delay="0.05"
                className="display-section mt-5 max-w-[12ch]"
              >
                {t.benefits.headline}
              </h2>
              <p
                data-reveal="fade-up"
                data-reveal-delay="0.1"
                className="lede mt-7 max-w-[26rem]"
              >
                {t.benefits.body}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ul className="border-t border-charcoal/12">
              {benefits.map((benefit, i) => {
                const title =
                  (lang === "ne" && t.benefits.items[benefit.id]?.title) ||
                  benefit.title;
                const body =
                  (lang === "ne" && t.benefits.items[benefit.id]?.body) ||
                  benefit.body;

                return (
                  <li
                    key={benefit.id}
                    data-reveal="fade-up"
                    data-reveal-delay={(i * 0.05).toFixed(2)}
                    className="group grid grid-cols-[2.75rem_1fr] items-start gap-x-4 border-b border-charcoal/12 py-7 transition-colors duration-300 sm:grid-cols-[3.5rem_1fr] sm:gap-x-6"
                  >
                    <span className="benefit-icon" aria-hidden="true">
                      ✓
                    </span>
                    <div>
                      <h3 className="display-sub text-charcoal">{title}</h3>
                      <p className="mt-2.5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">
                        {body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
