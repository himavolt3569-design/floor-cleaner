"use client";

import Image from "next/image";
import { LinkButton, Arrow } from "@/components/ui/Button";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import type { SiteSettings } from "@/types";

/**
 * Asymmetric editorial hero. Type holds the left column; the bottle stands on a
 * warm stone plinth that bleeds off the right edge and is deliberately allowed
 * to break out above it, so the product reads as a physical object in a room
 * rather than a cutout dropped on a page.
 */
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
  const t = TRANSLATIONS[lang];
  const hero = lang === "ne" ? t.hero : settings.hero;

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-ivory pb-[clamp(3rem,7vw,6rem)] pt-[clamp(2.5rem,5vw,4.5rem)]"
    >
      <div className="shell">
        <div className="grid items-center gap-y-[clamp(2.5rem,5vw,4rem)] lg:grid-cols-12 lg:gap-x-8">
          {/* ------------------------------------------------------ copy */}
          <div className="relative z-10 lg:col-span-6">
            <p data-hero-step="1" className="eyebrow text-brass-ink">
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
              className="lede mt-7 max-w-[34rem]"
            >
              {hero.body}
            </p>

            <div
              data-hero-step={String(3 + hero.headline.length)}
              className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
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
              className="mt-10 text-[0.8125rem] text-muted"
            >
              {hero.support}
            </p>
          </div>

          {/* --------------------------------------------------- product */}
          <div className="relative lg:col-span-6">
            <div className="relative mx-auto h-[clamp(19rem,46vw,37rem)] w-full max-w-[26rem] lg:max-w-none">
              {/* Plinth. Runs off the right edge of the viewport on desktop. */}
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-[66%] w-full rounded-[26px] bg-stone lg:w-[calc(100%+8vw)] lg:rounded-[32px] lg:rounded-r-none"
              />
              {/* Brass hairline marking the top of the plinth. */}
              <div
                aria-hidden="true"
                className="absolute bottom-[66%] left-0 h-px w-full bg-brass/35 lg:w-[calc(100%+8vw)]"
              />

              <div
                data-hero-step={String(5 + hero.headline.length)}
                data-hero-product
                className="absolute bottom-[7%] left-1/2 h-[94%] -translate-x-1/2 lg:left-[46%]"
              >
                <div
                  data-parallax="0.016"
                  className="relative h-full aspect-[560/1488]"
                >
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
