"use client";

import { formatNpr } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import type { ProductVariant } from "@/types";

/**
 * Size picker. Out of stock variants stay visible but unselectable, so a
 * customer can see the range that exists rather than silently losing options.
 */
export function ProductVariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-muted">{t.product.selectSize}</legend>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t.product.selectSize}>
        {variants.map((variant) => {
          const soldOut = variant.stock <= 0;
          const selected = variant.id === selectedId;
          const label = (lang === "ne" && t.product.variants[variant.id]) || variant.label;

          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={soldOut}
              onClick={() => onSelect(variant.id)}
              className={cn(
                "group relative min-w-[7.5rem] rounded-[13px] border px-4 py-3 text-left transition-all duration-200",
                selected
                  ? "border-forest bg-forest text-paper"
                  : "border-charcoal/18 bg-paper text-charcoal hover:border-charcoal/40",
                soldOut && "cursor-not-allowed opacity-55 hover:border-charcoal/18",
              )}
            >
              <span className="block text-[0.875rem] font-bold leading-none">
                {label}
              </span>
              <span
                className={cn(
                  "tabular mt-1.5 block text-[0.8125rem] leading-none",
                  selected ? "text-stone/85" : "text-muted",
                )}
              >
                {soldOut ? t.product.outOfStock : formatNpr(variant.priceMinor)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
