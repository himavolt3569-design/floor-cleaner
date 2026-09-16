"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import type { SiteSettings } from "@/types";

/**
 * The brand beat, and the one place the page commits to a colour.
 *
 * Everything around it is a warm neutral, so a deep terracotta block here
 * gives the scroll a chromatic moment and rhymes with the red on the bottle
 * without competing with it.
 */
export function WhyTmgSection({ settings }: { settings: SiteSettings }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const why =
    lang === "ne"
      ? { ...settings.why, headline: t.why.headline, body: t.why.body }
      : settings.why;

  return (
    <section className="relative overflow-hidden bg-terracotta-deep text-paper">
      <div className="grid lg:grid-cols-12">
        <div className="relative min-h-[16rem] lg:col-span-5 lg:min-h-0">
          <div data-reveal="fade" className="absolute inset-0">
            <Image
              src="/texture/floor-stained.webp"
              alt="A stone floor marked by everyday use before cleaning"
              fill
              sizes="(max-width: 1023px) 100vw, 42vw"
              className="object-cover"
            />
            {/* Flat tint, not a gradient: keeps the type legible over texture. */}
            <div aria-hidden="true" className="absolute inset-0 bg-terracotta-deep/55" />
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="px-[var(--spacing-gutter)] py-[var(--spacing-section)] lg:pl-[clamp(2.5rem,5vw,5rem)] lg:pr-[clamp(2.5rem,7vw,7rem)]">
            <p data-reveal="fade" className="eyebrow text-stone">
              {t.why.eyebrow}
            </p>

            <h2
              data-reveal="fade-up"
              data-reveal-delay="0.05"
              className="display-section mt-6 max-w-[18ch] text-paper"
            >
              {why.headline}
            </h2>

            <div className="mt-9 max-w-[42rem] space-y-5">
              {why.body.map((paragraph, i) => (
                <p
                  key={i}
                  data-reveal="fade-up"
                  data-reveal-delay={(0.1 + i * 0.06).toFixed(2)}
                  className="text-[1.0625rem] leading-[1.72] text-stone/78"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
