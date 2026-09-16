"use client";

import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/config/site";
import { useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import { cn } from "@/lib/utils/cn";
import { Wordmark } from "./Wordmark";
import { MobileNavigation } from "./MobileNavigation";

/**
 * Compact sticky header. Sits transparently over the hero, then settles onto a
 * solid ivory bar with a single hairline. No glass, no shadow.
 */
export function SiteHeader({ announcement }: { announcement: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const openCart = useUi((s) => s.openCart);
  const openMenu = useUi((s) => s.openMenu);
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const { lang, toggleLang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const count = hydrated ? lines.reduce((n, l) => n + l.quantity, 0) : 0;

  const navLabels: Record<string, string> = {
    "#product": t.nav.product,
    "#benefits": t.nav.benefits,
    "#how-it-works": t.nav.howItWorks,
    "#results": t.nav.results,
    "#faq": t.nav.faq,
    "#contact": t.nav.contact,
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {announcement && (
        <div className="relative z-50 bg-forest text-paper">
          <div className="shell flex h-8 items-center justify-center">
            <p className="truncate text-[0.6875rem] font-medium tracking-[0.02em] text-paper">
              {announcement}
            </p>
          </div>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-50 transition-[height,background-color,border-color] duration-300 ease-out",
          scrolled
            ? "h-[68px] border-b border-charcoal/12 bg-paper"
            : "h-[80px] border-b border-charcoal/8 bg-paper",
        )}
      >
        <div className="shell flex h-full items-center justify-between gap-6">
          <a
            href="#top"
            className="shrink-0 rounded-[8px] focus-visible:outline-offset-4"
            aria-label="TMG Cleaner, back to top"
          >
            <Wordmark />
          </a>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group relative block rounded-[9px] px-3 py-2 text-[0.8125rem] font-medium text-muted transition-colors duration-200 hover:text-charcoal"
                  >
                    {navLabels[link.href] ?? link.label}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-[5px] h-px origin-left scale-x-0 bg-brass transition-transform duration-300 ease-out group-hover:scale-x-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex h-11 items-center gap-1 rounded-[10px] border border-charcoal/15 bg-paper px-2.5 text-[0.75rem] font-semibold text-charcoal transition-colors hover:border-forest/40 hover:bg-ivory"
              aria-label={`Switch to ${lang === "en" ? "Nepali" : "English"}`}
              title={`Switch to ${lang === "en" ? "Nepali" : "English"}`}
            >
              <span className={lang === "en" ? "font-bold text-forest" : "text-muted"}>EN</span>
              <span className="text-charcoal/20">|</span>
              <span className={lang === "ne" ? "font-bold text-forest" : "text-muted"}>नेपाली</span>
            </button>

            <button
              type="button"
              onClick={openCart}
              className="relative grid h-11 w-11 place-items-center rounded-[10px] bg-ivory text-forest transition-colors duration-200 hover:bg-stone"
              aria-label={count ? `Open cart, ${count} items` : "Open cart"}
            >
              <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
                <path
                  d="M3.5 5.5h13l-1.1 8.2a1.6 1.6 0 0 1-1.6 1.4H6.2a1.6 1.6 0 0 1-1.6-1.4L3.5 5.5Zm3.4 0a3.1 3.1 0 0 1 6.2 0"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {count > 0 && (
                <span className="tabular absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-terracotta px-1 text-[0.625rem] font-bold leading-none text-paper">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>

            <a
              href="#product"
              className="hidden h-11 items-center rounded-full bg-forest px-5 text-[0.8125rem] font-semibold text-paper transition-colors duration-200 hover:bg-forest-deep sm:inline-flex"
            >
              {t.nav.buyNow}
            </a>

            <button
              type="button"
              onClick={openMenu}
              className="grid h-11 w-11 place-items-center rounded-[10px] text-charcoal transition-colors duration-200 hover:bg-charcoal/[0.06] lg:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
                <path
                  d="M3.5 6h13M3.5 10h13M3.5 14h9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileNavigation />
    </>
  );
}
