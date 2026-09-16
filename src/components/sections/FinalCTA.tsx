"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Button, Arrow } from "@/components/ui/Button";
import { QuantitySelector } from "@/components/commerce/QuantitySelector";
import { useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { formatNpr } from "@/lib/utils/money";
import type { DeliveryMethod, PaymentMethod, Product } from "@/types";

/**
 * Closing purchase block on deep forest. The product is shown at scale one
 * last time, with the price read from the same source as the rest of the page.
 */
export function FinalCTA({
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
  const defaultVariant =
    active.find((v) => v.isDefault && v.stock > 0) ??
    active.find((v) => v.stock > 0) ??
    active[0];
  const [variantId, setVariantId] = useState(defaultVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const add = useCart((s) => s.add);
  const openCart = useUi((s) => s.openCart);
  const openCheckout = useUi((s) => s.openCheckout);
  const { lang } = useLanguage();
  const t = useTranslations();

  const variant = active.find((v) => v.id === variantId) ?? defaultVariant;
  if (!variant) return null;

  const soldOut = variant.stock <= 0;

  const productName = lang === "ne" ? t.product.name : product.name;
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

  const assurances = [
    paymentMethods.some((m) => m.kind === "cod") &&
      (lang === "ne" ? "डेलिभरीमा भुक्तानी (COD) उपलब्ध" : "Cash on delivery available"),
    paymentMethods.some((m) => m.kind === "qr") &&
      (lang === "ne" ? "QR भुक्तानी स्वीकृत" : "QR payment accepted"),
    deliveryMethods.length > 0 &&
      (lang === "ne" ? "नेपालभर सुरक्षित डेलिभरी" : "Delivered across Nepal"),
  ].filter((v): v is string => Boolean(v));

  return (
    <section className="relative overflow-hidden bg-forest text-paper">
      <div className="shell">
        <div className="grid items-center gap-y-12 py-[var(--spacing-section)] lg:grid-cols-12 lg:gap-x-12">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <div data-reveal="fade" className="relative mx-auto h-[clamp(16rem,34vw,26rem)] w-full max-w-[22rem]">
              <Image
                src={product.images[0]}
                alt=""
                fill
                sizes="(max-width: 1023px) 60vw, 30vw"
                className="object-contain object-bottom drop-shadow-[0_28px_34px_rgba(0,0,0,0.34)]"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-7">
            <p data-reveal="fade" className="eyebrow text-brass-light">
              {lang === "ne" ? "सजिलो अर्डर" : "Ready when you are"}
            </p>

            <h2
              data-reveal="fade-up"
              data-reveal-delay="0.05"
              className="display-section mt-5 max-w-[15ch] text-paper"
            >
              {t.cta.headline}
            </h2>

            <p
              data-reveal="fade-up"
              data-reveal-delay="0.09"
              className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-stone/75"
            >
              {t.cta.body}
            </p>

            <div
              data-reveal="fade-up"
              data-reveal-delay="0.13"
              className="mt-9 border-t border-paper/18 pt-8"
            >
              <div className="flex flex-wrap items-center gap-2">
                {active.map((v) => {
                  const selected = v.id === variant.id;
                  const vLabel =
                    (lang === "ne" && t.product.variants[v.id]) || v.label;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={v.stock <= 0}
                      onClick={() => {
                        setVariantId(v.id);
                        setQuantity(1);
                      }}
                      aria-pressed={selected}
                      className={`rounded-[11px] border px-4 py-2 text-[0.8125rem] font-semibold transition-colors duration-200 ${
                        selected
                          ? "border-paper bg-paper text-forest"
                          : "border-paper/30 text-stone/85 hover:border-paper/60"
                      } ${v.stock <= 0 ? "cursor-not-allowed opacity-45" : ""}`}
                    >
                      {vLabel}
                    </button>
                  );
                })}
              </div>

              <p className="tabular mt-7 font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none tracking-[-0.03em] text-paper">
                {formatNpr(variant.priceMinor)}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <div className="[&_*]:!border-paper/30 [&_input]:!text-paper [&_button]:!text-paper [&>div]:!bg-transparent">
                  <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    max={Math.max(1, Math.min(variant.stock, 99))}
                    disabled={soldOut}
                  />
                </div>

                <Button
                  size="lg"
                  variant="onDark"
                  disabled={soldOut}
                  onClick={() => {
                    addLine();
                    openCheckout();
                  }}
                >
                  <span>{soldOut ? t.product.outOfStock : t.cta.button}</span>
                  {!soldOut && <Arrow />}
                </Button>

                <button
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    addLine();
                    openCart();
                  }}
                  className="h-[52px] rounded-[14px] border border-paper/30 px-6 text-[0.9375rem] font-semibold text-paper transition-colors duration-200 hover:border-paper/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.product.addToCart}
                </button>
              </div>

              {assurances.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
                  {assurances.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-[0.8125rem] text-stone/70"
                    >
                      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-brass" />
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
