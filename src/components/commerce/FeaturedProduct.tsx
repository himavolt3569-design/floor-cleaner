"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Button, Arrow } from "@/components/ui/Button";
import { QuantitySelector } from "./QuantitySelector";
import { ProductVariantSelector } from "./ProductVariantSelector";
import { useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import { useLanguage } from "@/lib/store/language";
import { TRANSLATIONS } from "@/config/translations";
import { formatNpr } from "@/lib/utils/money";
import type { DeliveryMethod, PaymentMethod, Product } from "@/types";

export function FeaturedProduct({
  product,
  paymentMethods,
  deliveryMethods,
}: {
  product: Product;
  paymentMethods: PaymentMethod[];
  deliveryMethods: DeliveryMethod[];
}) {
  const active = useMemo(
    () => product.variants.filter((v) => v.active),
    [product.variants],
  );
  // Prefer the size the business marks as default, then the first in stock.
  const firstInStock =
    active.find((v) => v.isDefault && v.stock > 0) ??
    active.find((v) => v.stock > 0) ??
    active[0];
  const [variantId, setVariantId] = useState(firstInStock?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const add = useCart((s) => s.add);
  const openCart = useUi((s) => s.openCart);
  const openCheckout = useUi((s) => s.openCheckout);
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  const variant = active.find((v) => v.id === variantId) ?? firstInStock;
  if (!variant) return null;

  const soldOut = variant.stock <= 0;
  const maxQty = Math.max(1, Math.min(variant.stock, 99));

  const productName = lang === "ne" ? t.product.name : product.name;
  const productDescription = lang === "ne" ? t.product.description : product.description;
  const variantLabel = (lang === "ne" && t.product.variants[variant.id]) || variant.label;

  const addLine = () =>
    add(
      {
        productId: product.id,
        variantId: variant.id,
        name: productName,
        variantLabel: variantLabel,
        image: product.images[0],
        unitPriceMinor: variant.priceMinor,
      },
      quantity,
    );

  // Only advertise what the admin has actually switched on.
  const assurances = [
    paymentMethods.some((m) => m.kind === "cod") &&
      (lang === "ne" ? "डेलिभरीमा भुक्तानी (COD) उपलब्ध" : "Cash on delivery available"),
    paymentMethods.some((m) => m.kind === "qr") &&
      (lang === "ne" ? "QR भुक्तानी स्वीकृत" : "QR payment accepted"),
    deliveryMethods.length > 0 &&
      (lang === "ne" ? "नेपालभर सुरक्षित डेलिभरी" : "Delivered to supported areas in Nepal"),
  ].filter((v): v is string => Boolean(v));

  return (
    <section
      id="product"
      className="bg-ivory py-[var(--spacing-section)]"
      aria-labelledby="product-heading"
    >
      <div className="shell">
        <div className="grid items-center gap-y-14 lg:grid-cols-12 lg:gap-x-14">
          {/* ------------------------------------------------ product shot */}
          <div className="lg:col-span-5">
            <div
              data-reveal="fade"
              className="relative flex aspect-[4/5] items-end justify-center overflow-hidden rounded-[26px] bg-stone px-8 pb-8 pt-12"
            >
              <div className="relative h-full w-full">
                <Image
                  src={product.images[0]}
                  alt={`${productName}, ${variantLabel}`}
                  fill
                  sizes="(max-width: 1023px) 86vw, 38vw"
                  className="product-shadow object-contain object-bottom"
                />
              </div>
              <span className="absolute left-5 top-5 rounded-[8px] bg-paper/92 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-charcoal">
                {variantLabel}
              </span>
            </div>
          </div>

          {/* ---------------------------------------------------- details */}
          <div className="lg:col-span-7">
            <p data-reveal="fade" className="eyebrow text-brass-ink">
              {t.product.badge}
            </p>

            <h2
              id="product-heading"
              data-reveal="fade-up"
              data-reveal-delay="0.05"
              className="display-section mt-5 max-w-[16ch]"
            >
              {productName}
            </h2>

            <p
              data-reveal="fade-up"
              data-reveal-delay="0.09"
              className="lede mt-6 max-w-[38rem]"
            >
              {productDescription}
            </p>

            <div
              data-reveal="fade-up"
              data-reveal-delay="0.13"
              className="mt-9 border-t border-charcoal/12 pt-8"
            >
              <ProductVariantSelector
                variants={active}
                selectedId={variant.id}
                onSelect={(id) => {
                  setVariantId(id);
                  setQuantity(1);
                }}
              />

              <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4">
                <div>
                  <span className="eyebrow block text-muted">{t.product.totalPrice}</span>
                  <p className="tabular mt-1.5 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-charcoal">
                    {formatNpr(variant.priceMinor)}
                  </p>
                </div>

                <StockBadge stock={variant.stock} isNepali={lang === "ne"} />
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  max={maxQty}
                  disabled={soldOut}
                />

                <Button
                  size="lg"
                  disabled={soldOut}
                  onClick={() => {
                    addLine();
                    openCheckout();
                  }}
                >
                  <span>{soldOut ? t.product.outOfStock : t.product.buyNow}</span>
                  {!soldOut && <Arrow />}
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  disabled={soldOut}
                  onClick={() => {
                    addLine();
                    openCart();
                  }}
                >
                  <span>{t.product.addToCart}</span>
                </Button>
              </div>

              {assurances.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                  {assurances.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-[0.8125rem] text-muted"
                    >
                      <svg viewBox="0 0 14 14" className="h-3 w-3 text-brass-ink" aria-hidden="true">
                        <path
                          d="m2.5 7.5 3 3 6-7"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Stock state is carried by an icon and a word, never by colour alone. */
function StockBadge({ stock, isNepali }: { stock: number; isNepali?: boolean }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-[9px] bg-critical/10 px-3 py-1.5 text-[0.75rem] font-semibold text-critical">
        <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
          <path d="m3.5 3.5 7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {isNepali ? "स्टक सकियो" : "Out of stock"}
      </span>
    );
  }

  const low = stock <= 5;
  return (
    <span
      className={cnBadge(low)}
      aria-label={low ? `Only ${stock} left in stock` : "In stock"}
    >
      <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
        <path
          d="m2.5 7.5 3 3 6-7"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {low
        ? isNepali
          ? `${stock} मात्र बाँकी`
          : `Only ${stock} left`
        : isNepali
          ? "स्टकमा उपलब्ध"
          : "In stock"}
    </span>
  );
}

function cnBadge(low: boolean) {
  return low
    ? "inline-flex items-center gap-2 rounded-[9px] bg-caution/10 px-3 py-1.5 text-[0.75rem] font-semibold text-caution"
    : "inline-flex items-center gap-2 rounded-[9px] bg-positive/10 px-3 py-1.5 text-[0.75rem] font-semibold text-positive";
}
