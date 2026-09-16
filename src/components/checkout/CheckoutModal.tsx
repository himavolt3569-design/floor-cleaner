"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Overlay";
import { Button, Arrow } from "@/components/ui/Button";
import { AddressForm, EMPTY_ADDRESS, type AddressState } from "./AddressForm";
import { DeliverySelector, PaymentSelector } from "./Selectors";
import { OrderSummary } from "./OrderSummary";
import { QRPaymentPanel } from "./QRPaymentPanel";
import { OrderSuccess } from "./OrderSuccess";
import { useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import type { SiteSettings } from "@/types";
import type {
  ApiError,
  PlacedOrder,
  QuoteDelivery,
  QuotePayment,
  QuoteResponse,
} from "@/types/checkout";

type Phase = "form" | "payment" | "done";

export function CheckoutModal({ settings }: { settings: SiteSettings }) {
  const surface = useUi((s) => s.surface);
  const close = useUi((s) => s.close);
  const open = surface === "checkout";

  const lines = useCart((s) => s.lines);
  const clearCart = useCart((s) => s.clear);

  const [phase, setPhase] = useState<Phase>("form");
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deliveryMethods, setDeliveryMethods] = useState<QuoteDelivery[]>([]);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<QuotePayment[]>([]);
  const [subtotalMinor, setSubtotalMinor] = useState(0);
  const [deliveryId, setDeliveryId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [proofSubmitted, setProofSubmitted] = useState(false);

  // One key per checkout attempt: a retry of the same attempt must not create
  // a second order. Generated outside render, in the effect below and again
  // defensively at submit time.
  const idempotencyKey = useRef<string>("");
  const nextKey = () => {
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    return idempotencyKey.current;
  };

  const addressReady = Boolean(address.province && address.district);

  const items = useMemo(
    () =>
      lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
      })),
    [lines],
  );

  /* ------------------------------------------------------------- quoting */
  const fetchQuote = useCallback(async (signal: AbortSignal) => {
    if (!items.length) return;

    setQuoting(true);
    setQuoteError(undefined);

    try {
      const res = await fetch("/api/checkout/quote", {
        signal,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          province: address.province || undefined,
          district: address.district || undefined,
        }),
      });

      const data = (await res.json()) as QuoteResponse | ApiError;
      if (signal.aborted) return;

      if (!res.ok || !data.ok) {
        setQuoteError((data as ApiError).error ?? "We could not price your cart.");
        setDeliveryMethods([]);
        setPaymentMethods([]);
        setRecommendedId(null);
        return;
      }

      setSubtotalMinor(data.subtotalMinor);
      setDeliveryMethods(data.deliveryMethods);
      setRecommendedId(data.recommendedId);
      setPaymentMethods(data.paymentMethods);

      // Keep the current choice when it is still offered, otherwise pick the
      // first available so the customer is never left with nothing selected.
      setDeliveryId((current) =>
        data.deliveryMethods.some((m) => m.id === current)
          ? current
          : (data.recommendedId ?? data.deliveryMethods[0]?.id ?? ""),
      );
      setPaymentId((current) =>
        data.paymentMethods.some((m) => m.id === current)
          ? current
          : (data.paymentMethods[0]?.id ?? ""),
      );
    } catch {
      if (signal.aborted) return;
      setQuoteError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "You appear to be offline. Reconnect and we will price your order."
          : "We could not reach the server. Please try again.",
      );
    } finally {
      if (!signal.aborted) setQuoting(false);
    }
  }, [items, address.province, address.district]);

  useEffect(() => {
    if (!open) return;
    nextKey();
    if (!items.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => fetchQuote(controller.signal), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, items.length, fetchQuote]);

  // Reset for a fresh checkout once the modal has closed after a finished order.
  useEffect(() => {
    if (open || phase !== "done") return;
    const timer = setTimeout(() => {
      setPhase("form");
      setOrder(null);
      setProofSubmitted(false);
      setAddress(EMPTY_ADDRESS);
      setFieldErrors({});
      idempotencyKey.current = "";
    }, 250);
    return () => clearTimeout(timer);
  }, [open, phase]);

  /* ---------------------------------------------------------- submitting */
  const selectedDelivery = deliveryMethods.find((m) => m.id === deliveryId) ?? null;
  const selectedPayment = paymentMethods.find((m) => m.id === paymentId) ?? null;

  const placeOrder = async () => {
    setSubmitError(undefined);
    setFieldErrors({});

    if (!selectedDelivery) {
      setSubmitError("Choose a delivery option before placing the order.");
      return;
    }
    if (!selectedPayment) {
      setSubmitError("Choose a payment method before placing the order.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          address: {
            ...address,
            email: address.email || undefined,
            ward: address.ward || undefined,
            street: address.street || undefined,
            notes: address.notes || undefined,
          },
          deliveryMethodId: deliveryId,
          paymentMethodId: paymentId,
          idempotencyKey: nextKey(),
        }),
      });

      const data = (await res.json()) as { ok: true; order: PlacedOrder } | ApiError;

      if (!res.ok || !data.ok) {
        const err = data as ApiError;
        if (err.fields) setFieldErrors(flattenAddressErrors(err.fields));
        setSubmitError(err.error ?? "We could not place the order.");
        setSubmitting(false);
        return;
      }

      setOrder(data.order);
      clearCart();
      setPhase(data.order.requiresVerification ? "payment" : "done");
    } catch {
      setSubmitError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "You appear to be offline. Your cart is saved, try again once you reconnect."
          : "We could not reach the server. Your cart is saved, please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    phase === "done" ? "Order confirmed" : phase === "payment" ? "Complete payment" : "Checkout";

  const empty = lines.length === 0 && phase === "form";

  return (
    <Modal open={open} onClose={close} title={title} wide={phase === "form"}>
      {empty ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-[1.5rem] leading-none">Your cart is empty</p>
          <p className="mx-auto mt-3 max-w-[24rem] text-[0.875rem] text-muted">
            Add a size to your cart and it will show up here.
          </p>
        </div>
      ) : phase === "done" && order ? (
        <OrderSuccess order={order} settings={settings} proofSubmitted={proofSubmitted} />
      ) : phase === "payment" && order ? (
        <div className="px-5 py-6 sm:px-6">
          <QRPaymentPanel
            order={order}
            method={selectedPayment}
            onSubmitted={() => {
              setProofSubmitted(true);
              setPhase("done");
            }}
          />
          <button
            type="button"
            onClick={() => setPhase("done")}
            className="mt-5 w-full text-center text-[0.8125rem] font-medium text-muted underline underline-offset-4 hover:text-charcoal"
          >
            I will send the payment details later
          </button>
        </div>
      ) : (
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_19rem]">
          <div className="space-y-9">
            <Section title="Delivery details" step={1}>
              <AddressForm
                value={address}
                errors={fieldErrors}
                onChange={(patch) => {
                  if (patch.province !== undefined || patch.district !== undefined) { setDeliveryId(""); setDeliveryMethods([]); }
                  setAddress((a) => ({ ...a, ...patch }));
                }}
              />
            </Section>

            <Section title="Delivery option" step={2}>
              <DeliverySelector
                methods={deliveryMethods}
                selectedId={deliveryId}
                onSelect={setDeliveryId}
                addressReady={addressReady}
                recommendedId={recommendedId}
                district={address.district}
              />
            </Section>

            <Section title="Payment" step={3}>
              <PaymentSelector
                methods={paymentMethods}
                selectedId={paymentId}
                onSelect={setPaymentId}
              />
            </Section>
          </div>

          <div className="rounded-2xl border border-charcoal/10 bg-paper p-5 lg:sticky lg:top-4 lg:self-start">
            <OrderSummary
              lines={lines}
              subtotalMinor={subtotalMinor || fallbackSubtotal(lines)}
              deliveryFeeMinor={selectedDelivery?.feeMinor ?? null}
              pricing={quoting && !subtotalMinor}
            />

            {quoteError && (
              <p
                role="alert"
                className="mt-4 rounded-[12px] border border-critical/35 bg-critical/[0.04] p-3.5 text-[0.8125rem] font-medium text-critical"
              >
                {quoteError}
              </p>
            )}

            {submitError && (
              <p
                role="alert"
                className="mt-4 rounded-[12px] border border-critical/35 bg-critical/[0.04] p-3.5 text-[0.8125rem] font-medium text-critical"
              >
                {submitError}
              </p>
            )}

            <Button
              full
              size="lg"
              className="mt-4"
              onClick={placeOrder}
              disabled={submitting || quoting || !selectedDelivery || !selectedPayment}
            >
              <span>{submitting ? "Placing order..." : "Place order"}</span>
              {!submitting && <Arrow />}
            </Button>

            <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-muted">
              By placing this order you agree to be contacted about the delivery.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Section({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-charcoal/10 bg-paper p-4 sm:p-5">
      <h3 className="mb-4 flex items-center gap-3">
        <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-charcoal text-[0.6875rem] font-bold text-paper">
          {step}
        </span>
        <span className="text-[0.9375rem] font-bold tracking-[-0.01em] text-charcoal">
          {title}
        </span>
      </h3>
      {children}
    </section>
  );
}

function fallbackSubtotal(lines: { unitPriceMinor: number; quantity: number }[]) {
  return lines.reduce((s, l) => s + l.unitPriceMinor * l.quantity, 0);
}

/** Server paths look like `address.mobile`; the form keys off `mobile`. */
function flattenAddressErrors(fields: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(fields)) {
    out[key.replace(/^address\./, "")] = message;
  }
  return out;
}
