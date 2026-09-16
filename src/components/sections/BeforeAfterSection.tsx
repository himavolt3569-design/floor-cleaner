"use client";

import type { ComparisonEntry } from "@/types";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

/**
 * The results section runs on deep charcoal. The tonal shift is doing real
 * work: it isolates the photography and makes the comparison the loudest thing
 * on the page, which is where the attention should be.
 */
export function BeforeAfterSection({
  comparisons,
}: {
  comparisons: ComparisonEntry[];
}) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  if (!comparisons.length) return null;

  return (
    <section
      id="results"
      className="bg-charcoal py-[var(--spacing-section)] text-paper"
      aria-labelledby="results-heading"
    >
      <div className="shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p data-reveal="fade" className="eyebrow text-brass-light">
              {t.results.eyebrow}
            </p>
            <h2
              id="results-heading"
              data-reveal="fade-up"
              data-reveal-delay="0.05"
              className="display-section mt-5 max-w-[18ch] text-paper"
            >
              {t.results.headline}
            </h2>
          </div>
          <p
            data-reveal="fade-up"
            data-reveal-delay="0.1"
            className="max-w-[24rem] text-[0.9375rem] leading-relaxed text-stone/65 md:pb-2"
          >
            {t.results.body}
          </p>
        </div>

        <ul className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((entry, i) => (
            <li
              key={entry.id}
              data-reveal="fade-up"
              data-reveal-delay={(i * 0.08).toFixed(2)}
            >
              <BeforeAfterSlider entry={entry} priority={i === 0} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
