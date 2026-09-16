"use client";

import Image from "next/image";
import { LinkButton, Arrow } from "@/components/ui/Button";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import type { SiteSettings } from "@/types";

/** Product-led hero; on phones the bottle follows the headline. */
export function HeroSection({
  settings,
  productImage,
  productName,
}: {
  settings: SiteSettings;
  productImage: string;
  productName: string;
}) {
  const { lang } = useLanguage();
  const t = useTranslations();
  const hero = lang === "ne" ? t.hero : settings.hero;

  return (
    <section
      id="top"
      className="hero-section relative overflow-hidden"
    >
      <div className="shell">
        <div className="hero-layout grid items-center gap-y-0 sm:gap-y-10 lg:grid-cols-12 lg:gap-x-12">
          {/* ------------------------------------------------------ copy */}
          <div className="hero-copy relative z-10 lg:col-span-6">
            <p data-hero-step="1" className="hero-category">
              {hero.eyebrow}
            </p>

            <h1 className="display-hero mt-5 text-charcoal">
              {hero.headline.map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <span data-hero-step={String(2 + i)} className="block">
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p
              data-hero-step={String(2 + hero.headline.length)}
              className="hero-description lede mt-7 max-w-[34rem]"
            >
              {hero.body}
            </p>

            <div
              data-hero-step={String(3 + hero.headline.length)}
              className="hero-actions mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
            >
              <LinkButton href="#product" size="lg">
                <span>{hero.primaryCta}</span>
                <Arrow />
              </LinkButton>

              <a
                href="#results"
                className="group inline-flex items-center gap-2 text-[0.875rem] font-semibold text-charcoal"
              >
                <span className="relative">
                  {hero.secondaryCta}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-100 bg-charcoal/30 transition-transform duration-300 ease-out group-hover:scale-x-0"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-charcoal transition-transform duration-300 ease-out group-hover:origin-left group-hover:scale-x-100"
                  />
                </span>
                <Arrow className="h-3 w-3" />
              </a>
            </div>

            <p
              data-hero-step={String(4 + hero.headline.length)}
              className="hero-support mt-10 text-[0.8125rem] text-muted"
            >
              {hero.support}
            </p>
          </div>

          {/* --------------------------------------------------- product */}
          <div className="hero-visual relative lg:col-span-6">
            {settings.hero.image ? (
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[34rem] overflow-hidden rounded-[28px] bg-stone">
                <Image
                  src={settings.hero.image}
                  alt={`${lang === "ne" ? t.product.name : productName}: product artwork with marble, tile and granite`}
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 639px) 92vw, (max-width: 1023px) 544px, 46vw"
                  quality={90}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="hero-stage relative mx-auto h-[19rem] w-full max-w-[32rem] sm:h-[clamp(23rem,44vw,36rem)] lg:max-w-none">
                <span className="hero-stage-word" aria-hidden="true">TMG</span>
                <div aria-hidden="true" className="hero-orbit" />
                <div aria-hidden="true" className="hero-stage-floor" />

                <div
                  data-hero-step={String(5 + hero.headline.length)}
                  data-hero-product
                  className="absolute bottom-[12%] left-1/2 h-[82%] -translate-x-1/2"
                >
                  <div data-parallax="0.016" className="relative h-full aspect-[560/1488]">
                    <Image
                      src={productImage}
                      alt={`${lang === "ne" ? t.product.name : productName} bottle`}
                      fill
                      priority
                      fetchPriority="high"
                      sizes="(max-width: 1023px) 46vw, 26vw"
                      quality={90}
                      className="product-shadow object-contain object-bottom"
                    />
                  </div>
                </div>

                <div className="hero-surface-list">
                  {(lang === "ne"
                    ? ["मार्बल", "टायल", "ग्रेनाइट"]
                    : ["Marble", "Tile", "Granite"]
                  ).map((name) => (
                    <span key={name}>
                      <span aria-hidden="true">✓</span>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
