"use client";

import Image from "next/image";
import { Drawer } from "@/components/ui/Overlay";
import { Button, Arrow } from "@/components/ui/Button";
import { QuantitySelector } from "./QuantitySelector";
import { useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import { useLanguage } from "@/lib/store/language";
import { formatNpr } from "@/lib/utils/money";

export function CartDrawer() {
  const surface = useUi((s) => s.surface);
  const close = useUi((s) => s.close);
  const openCheckout = useUi((s) => s.openCheckout);
  const { lang } = useLanguage();

  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceMinor * l.quantity, 0);
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const empty = lines.length === 0;

  return (
    <Drawer
      open={surface === "cart"}
      onClose={close}
      title={lang === "ne" ? "तपाईंको कार्ट" : "Your cart"}
      header={
        <h2 className="font-sans text-[0.95rem] font-bold tracking-[-0.01em]">
          {lang === "ne" ? "तपाईंको कार्ट" : "Your cart"}{" "}
          <span className="tabular ml-1 font-medium text-muted">
            {count > 0 ? `(${count})` : ""}
          </span>
        </h2>
      }
      footer={
        empty ? undefined : (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[0.875rem] font-semibold text-charcoal">
                {lang === "ne" ? "जम्मा" : "Subtotal"}
              </span>
              <span className="tabular font-display text-[1.5rem] leading-none tracking-[-0.02em]">
                {formatNpr(subtotal)}
              </span>
            </div>
            <p className="mt-1.5 text-[0.75rem] text-muted">
              {lang === "ne"
                ? "ठेगाना राखेपछि चेकआउटमा डेलिभरी शुल्क गणना गरिनेछ।"
                : "Delivery is calculated at checkout once you enter your address."}
            </p>
            <Button full size="lg" className="mt-4" onClick={openCheckout}>
              <span>{lang === "ne" ? "चेकआउट गर्नुहोस्" : "Checkout"}</span>
              <Arrow />
            </Button>
          </div>
        )
      }
    >
      {empty ? (
        <EmptyCart onClose={close} isNepali={lang === "ne"} />
      ) : (
        <ul className="divide-y divide-charcoal/10 px-5">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 py-5">
              <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-[12px] bg-stone">
                <Image
                  src={line.image}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-contain p-1.5"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.875rem] font-semibold leading-snug text-charcoal">
                      {line.name}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-muted">{line.variantLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.variantId)}
                    aria-label={`Remove ${line.name} ${line.variantLabel} from cart`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-faint transition-colors hover:bg-charcoal/[0.06] hover:text-charcoal"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <QuantitySelector
                    size="sm"
                    value={line.quantity}
                    onChange={(n) => setQuantity(line.variantId, n)}
                    label={`Quantity for ${line.variantLabel}`}
                  />
                  <span className="tabular text-[0.875rem] font-semibold text-charcoal">
                    {formatNpr(line.unitPriceMinor * line.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function EmptyCart({ onClose, isNepali }: { onClose: () => void; isNepali?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-stone">
        <svg viewBox="0 0 20 20" className="h-6 w-6 text-espresso/60" aria-hidden="true">
          <path
            d="M3.5 5.5h13l-1.1 8.2a1.6 1.6 0 0 1-1.6 1.4H6.2a1.6 1.6 0 0 1-1.6-1.4L3.5 5.5Zm3.4 0a3.1 3.1 0 0 1 6.2 0"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-5 font-display text-[1.5rem] leading-none tracking-[-0.02em]">
        {isNepali ? "तपाईंको कार्ट खाली छ" : "Your cart is empty"}
      </p>
      <p className="mt-3 max-w-[22rem] text-[0.875rem] leading-relaxed text-muted">
        {isNepali ? "साइज छान्नुहोस् र कार्टमा थप्नुहोस्।" : "Pick a size and it will appear here."}
      </p>
      <a
        href="#product"
        onClick={onClose}
        className="mt-6 inline-flex h-11 items-center rounded-[12px] bg-forest px-5 text-[0.875rem] font-semibold text-paper transition-colors hover:bg-forest-deep"
      >
        {isNepali ? "साइज छान्नुहोस्" : "Choose a size"}
      </a>
    </div>
  );
}
