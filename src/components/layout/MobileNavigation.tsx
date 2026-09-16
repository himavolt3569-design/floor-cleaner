"use client";

import { NAV_LINKS } from "@/config/site";
import { useUi } from "@/lib/store/ui";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import { Drawer } from "@/components/ui/Overlay";
import { Wordmark } from "./Wordmark";

export function MobileNavigation() {
  const surface = useUi((s) => s.surface);
  const close = useUi((s) => s.close);
  const { lang, toggleLang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const navLabels: Record<string, string> = {
    "#product": t.nav.product,
    "#benefits": t.nav.benefits,
    "#how-it-works": t.nav.howItWorks,
    "#results": t.nav.results,
    "#faq": t.nav.faq,
    "#contact": t.nav.contact,
  };

  return (
    <Drawer
      open={surface === "menu"}
      onClose={close}
      title={t.nav.menu}
      header={<Wordmark />}
      footer={
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-[12px] border border-charcoal/15 bg-paper/60 p-3">
            <span className="text-[0.8125rem] font-medium text-charcoal">Language / भाषा</span>
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-charcoal px-3 text-[0.75rem] font-semibold text-paper"
            >
              <span>{lang === "en" ? "English" : "नेपाली"}</span>
              <span className="text-paper/40">➔</span>
              <span className="text-brass-light">{lang === "en" ? "नेपाली" : "English"}</span>
            </button>
          </div>
          <a
            href="#product"
            onClick={close}
            className="flex h-12 w-full items-center justify-center rounded-[12px] bg-forest text-[0.875rem] font-semibold text-paper transition-colors hover:bg-forest-deep"
          >
            {t.hero.primaryCta}
          </a>
        </div>
      }
    >
      <nav aria-label="Mobile" className="px-2 py-3">
        <ul>
          {NAV_LINKS.map((link, i) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={close}
                className="flex items-baseline gap-4 rounded-[12px] px-3 py-3.5 transition-colors hover:bg-charcoal/[0.05]"
              >
                <span className="tabular w-5 shrink-0 text-[0.6875rem] font-semibold tracking-[0.1em] text-brass-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-[1.5rem] leading-none tracking-[-0.02em]">
                  {navLabels[link.href] ?? link.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </Drawer>
  );
}
