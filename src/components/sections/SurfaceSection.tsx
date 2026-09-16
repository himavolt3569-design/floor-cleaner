"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import type { SurfaceEntry } from "@/types";

/**
 * Surface compatibility.
 *
 * Surfaces with real photography get a photographic tile. Those without get a
 * solid editorial block instead of a stock photo or a generic icon, so the
 * section never implies imagery the business has not supplied.
 */
export function SurfaceSection({ surfaces }: { surfaces: SurfaceEntry[] }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const withPhoto = surfaces.filter((s) => s.image);
  const withoutPhoto = surfaces.filter((s) => !s.image);

  return (
    <section
      id="surfaces"
      className="bg-ivory py-[var(--spacing-section)]"
      aria-labelledby="surfaces-heading"
    >
      <div className="shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p data-reveal="fade" className="eyebrow text-brass-ink">
              {t.surfaces.eyebrow}
            </p>
            <h2
              id="surfaces-heading"
              data-reveal="fade-up"
              data-reveal-delay="0.05"
              className="display-section mt-5 max-w-[14ch]"
            >
              {t.surfaces.headline}
            </h2>
          </div>
          <p
            data-reveal="fade-up"
            data-reveal-delay="0.1"
            className="max-w-[26rem] text-[0.9375rem] leading-relaxed text-muted md:pb-2"
          >
            {t.surfaces.body}
          </p>
        </div>

        {/* Photographic surfaces */}
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {withPhoto.map((surface, i) => {
            const name =
              (lang === "ne" && t.surfaces.items[surface.id]?.name) ||
              surface.name;
            const body =
              (lang === "ne" && t.surfaces.items[surface.id]?.body) ||
              surface.body;

            return (
              <li
                key={surface.id}
                data-reveal="fade-up"
                data-reveal-delay={(i * 0.07).toFixed(2)}
                className="group"
              >
                <div className="surface-photo relative aspect-[3/2] overflow-hidden rounded-[22px] bg-stone">
                  <Image
                    src={surface.image as string}
                    alt={`${name} surface cleaned with TMG Cleaner`}
                    fill
                    sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                    className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
                  />
                  <span className="absolute bottom-4 left-4 rounded-full bg-paper px-4 py-2 text-[0.875rem] font-semibold text-charcoal">
                    {name}
                  </span>
                </div>
                <p className="mt-4 max-w-[30ch] text-[0.9375rem] leading-relaxed text-muted">
                  {body}
                </p>
              </li>
            );
          })}
        </ul>

        {/* Surfaces the product covers that we do not hold photography for */}
        {withoutPhoto.length > 0 && (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2">
            {withoutPhoto.map((surface, i) => {
              const name =
                (lang === "ne" && t.surfaces.items[surface.id]?.name) ||
                surface.name;
              const body =
                (lang === "ne" && t.surfaces.items[surface.id]?.body) ||
                surface.body;

              return (
                <li
                  key={surface.id}
                  data-reveal="fade-up"
                  data-reveal-delay={(i * 0.07).toFixed(2)}
                  className="flex min-h-[11rem] flex-col justify-between rounded-[22px] bg-espresso p-7 text-paper"
                >
                  <span className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-brass-light">
                    {lang === "ne" ? "यसका लागि पनि उपयुक्त" : "Also suitable for"}
                  </span>
                  <div className="mt-8">
                    <h3 className="font-display text-[2rem] leading-none tracking-[-0.02em]">
                      {name}
                    </h3>
                    <p className="mt-3 max-w-[34ch] text-[0.875rem] leading-relaxed text-stone/75">
                      {body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
