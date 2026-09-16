"use client";

import type { UsageStep } from "@/types";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";

/**
 * Four steps, separated by rules. Deliberately free of invented dilution
 * ratios: the application detail lives on the bottle, and the admin can add a
 * manufacturer note here once it is supplied.
 */
export function HowToUseSection({
  steps,
  usageNote,
}: {
  steps: UsageStep[];
  usageNote: string | null;
}) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  if (!steps.length) return null;

  const displayNote = lang === "ne" ? t.howToUse.usageNote : (usageNote || t.howToUse.usageNote);

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-14 bg-stone py-[var(--spacing-section)]"
      aria-labelledby="how-heading"
    >
      <span id="how-to-use" className="absolute -top-14" aria-hidden="true" />
      <div className="shell">
        <div className="max-w-[40rem]">
          <p data-reveal="fade" className="eyebrow text-espresso/70">
            {t.howToUse.eyebrow}
          </p>
          <h2
            id="how-heading"
            data-reveal="fade-up"
            data-reveal-delay="0.05"
            className="display-section mt-5"
          >
            {t.howToUse.headline}
          </h2>
        </div>

        <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const title =
              (lang === "ne" && t.howToUse.items[step.id]?.title) ||
              step.title;
            const body =
              (lang === "ne" && t.howToUse.items[step.id]?.body) ||
              step.body;

            return (
              <li
                key={step.id}
                data-reveal="fade-up"
                data-reveal-delay={(i * 0.07).toFixed(2)}
                className="border-t border-charcoal/20 pt-6"
              >
                <span className="tabular block font-display text-[2.75rem] leading-none tracking-[-0.03em] text-charcoal/55">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-sans text-[1.0625rem] font-bold tracking-[-0.01em] text-charcoal">
                  {title}
                </h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-espresso/75">
                  {body}
                </p>
              </li>
            );
          })}
        </ol>

        {displayNote && (
          <p
            data-reveal="fade"
            className="mt-12 max-w-[46rem] border-l-2 border-brass pl-5 text-[0.9375rem] leading-relaxed text-espresso/85"
          >
            <span className="font-semibold text-charcoal">{t.howToUse.noteTitle}: </span>
            {displayNote}
          </p>
        )}
      </div>
    </section>
  );
}
