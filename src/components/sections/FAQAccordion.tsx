"use client";

import { useId, useState } from "react";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import type { Faq } from "@/types";

/**
 * Accordion built on a button plus a region. The open transition uses a
 * grid-rows 0fr to 1fr change so it animates to the content's real height
 * without measuring anything in JavaScript.
 */
export function FAQAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);
  const base = useId();
  const { lang } = useLanguage();
  const t = useTranslations();

  return (
    <div className="border-t border-charcoal/12">
      {faqs.map((faq) => {
        const open = openId === faq.id;
        const buttonId = `${base}-${faq.id}-button`;
        const panelId = `${base}-${faq.id}-panel`;
        const question =
          (lang === "ne" && t.faq.items[faq.id]?.question) || faq.question;
        const answer =
          (lang === "ne" && t.faq.items[faq.id]?.answer) || faq.answer;

        return (
          <div key={faq.id} className="border-b border-charcoal/12">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : faq.id)}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left"
              >
                <span className="max-w-[46ch] text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-charcoal transition-colors duration-200 group-hover:text-espresso">
                  {question}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-charcoal/18 text-charcoal transition-colors duration-200 group-hover:border-charcoal/40"
                >
                  <svg viewBox="0 0 14 14" className="h-3 w-3">
                    <path
                      d="M7 2.5v9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className={`origin-center transition-transform duration-300 ease-out ${
                        open ? "scale-y-0" : "scale-y-100"
                      }`}
                    />
                    <path d="M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="max-w-[62ch] pb-7 pr-10 text-[0.9375rem] leading-relaxed text-muted">
                  {answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
