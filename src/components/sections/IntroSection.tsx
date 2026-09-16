"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import type { SiteSettings } from "@/types";

/**
 * Calm editorial beat after the hero. A full-width stone band carries the
 * statement; the stone still life bleeds off the right edge so the band reads
 * as a surface rather than a card.
 */
export function IntroSection({ settings }: { settings: SiteSettings }) {
  const { lang } = useLanguage();
  const t = useTranslations();
  const intro = lang === "ne" ? t.intro : settings.intro;

  return (
    <section className="relative overflow-hidden bg-stone py-[var(--spacing-section)]">
      <div className="shell">
        <div className="grid gap-y-12 lg:grid-cols-12 lg:gap-x-10">
          <div className="lg:col-span-7">
            <p data-reveal="fade" className="eyebrow text-espresso/70">
              {intro.eyebrow}
            </p>

            <h2
              data-reveal="fade-up"
              data-reveal-delay="0.06"
              className="display-section mt-6 max-w-[16ch] text-charcoal"
            >
              {intro.headline}
            </h2>

            <div
              data-reveal="fade-up"
              data-reveal-delay="0.12"
              className="mt-6 max-w-[38rem]"
            >
              <p className="text-[1.0625rem] leading-[1.72] text-espresso/85">
                {intro.body}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div
              data-reveal="mask"
              className="relative ml-auto aspect-[4/5] w-full max-w-[26rem] overflow-hidden rounded-[24px] lg:max-w-none xl:aspect-[5/6]"
            >
              <Image
                src={settings.intro.image || "/imagery/marble-interior.png"}
                alt="Illustrative interior with polished marble flooring and granite surfaces"
                fill
                sizes="(max-width: 1023px) 90vw, 38vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
