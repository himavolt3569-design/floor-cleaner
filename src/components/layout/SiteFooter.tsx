"use client";

import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import type { PaymentMethod, SiteSettings } from "@/types";

const NAV_GROUPS = [
  {
    title: "Product",
    titleNe: "उत्पादन",
    links: [
      { label: "The product", labelNe: "उत्पादन विवरण", href: "#product" },
      { label: "Benefits", labelNe: "फाइदाहरू", href: "#benefits" },
      { label: "Results", labelNe: "नतिजा", href: "#results" },
      { label: "How to use", labelNe: "प्रयोग विधि", href: "#how-to-use" },
    ],
  },
  {
    title: "Customer",
    titleNe: "ग्राहक सेवा",
    links: [
      { label: "Delivery", labelNe: "डेलिभरी", href: "#faq" },
      { label: "Payments", labelNe: "भुक्तानी", href: "#faq" },
      { label: "FAQ", labelNe: "प्रायः सोधिने प्रश्न", href: "#faq" },
    ],
  },
];

/**
 * Compact footer. Everything a customer needs, in one tight band rather than a
 * tall link farm.
 */
export function SiteFooter({
  settings,
  paymentMethods,
}: {
  settings: SiteSettings;
  paymentMethods: PaymentMethod[];
}) {
  const { lang } = useLanguage();
  const t = useTranslations();
  const year = new Date().getFullYear();
  const { contact } = settings;

  return (
    <footer id="contact" className="bg-charcoal text-stone/70">
      <div className="shell">
        <div className="grid gap-x-8 gap-y-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* Identity */}
          <div className="lg:col-span-4">
            <Wordmark tone="light" />
            <p className="mt-4 max-w-[26ch] text-[0.8125rem] leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>

          {/* Navigation */}
          {NAV_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="lg:col-span-2">
              <h2 className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-brass-light">
                {lang === "ne" ? group.titleNe : group.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[0.8125rem] transition-colors duration-200 hover:text-paper"
                    >
                      {lang === "ne" ? link.labelNe : link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div className="lg:col-span-4">
            <h2 className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-brass-light">
              {t.footer.contact}
            </h2>
            <ul className="mt-4 space-y-2.5 text-[0.8125rem]">
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="tabular transition-colors duration-200 hover:text-paper"
                >
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="transition-colors duration-200 hover:text-paper"
                >
                  {contact.email}
                </a>
              </li>
              <li>{contact.address}</li>
            </ul>

            {settings.social.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                {settings.social.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.8125rem] underline decoration-stone/30 underline-offset-4 transition-colors hover:text-paper"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-paper/12 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.75rem]">
            &copy; {year} TMG Cleaner. {t.footer.rights}
          </p>

          {paymentMethods.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
              {paymentMethods.map((method) => (
                <li
                  key={method.id}
                  className="rounded-[7px] border border-paper/15 px-2 py-1 text-[0.6875rem] font-medium text-stone/75"
                >
                  {method.name}
                </li>
              ))}
            </ul>
          )}

          <ul className="flex items-center gap-5 text-[0.75rem]">
            <li>
              <Link href="/track" className="transition-colors duration-200 hover:text-paper">
                Track an order
              </Link>
            </li>
            <li>
              <a href="/privacy" className="transition-colors duration-200 hover:text-paper">
                Privacy
              </a>
            </li>
            <li>
              <a href="/terms" className="transition-colors duration-200 hover:text-paper">
                Terms
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
