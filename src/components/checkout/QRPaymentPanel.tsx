"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { formatNpr } from "@/lib/utils/money";
import type { PlacedOrder, QuotePayment } from "@/types/checkout";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Manual payment step. The customer pays out of band, then gives us a
 * reference or a screenshot.
 *
 * This panel never claims the payment succeeded. Submitting moves the order to
 * "submitted for verification" and says so plainly.
 */
export function QRPaymentPanel({
  order,
  method,
  onSubmitted,
}: {
  order: PlacedOrder;
  method: QuotePayment | null;
  onSubmitted: () => void;
}) {
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);

  const isQr = method?.kind === "qr";

  const pickFile = (selected: File | null) => {
    setFileError(undefined);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFileError("Upload a PNG, JPG or WebP image.");
      return;
    }
    if (selected.size > MAX_PROOF_BYTES) {
      setFileError("That image is larger than 5 MB. Try a smaller screenshot.");
      return;
    }
    setFile(selected);
  };

  const submit = async () => {
    setError(undefined);

    if (!reference.trim() && !file) {
      setError("Add the transaction reference or attach a screenshot.");
      return;
    }

    setBusy(true);
    try {
      let proofPath: string | undefined;

      if (file) {
        proofPath = (await uploadProof(file, order.orderId)) ?? undefined;
        if (!proofPath) {
          setError(
            "We could not upload the screenshot. Enter the transaction reference instead.",
          );
          setBusy(false);
          return;
        }
      }

      const res = await fetch("/api/payments/proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          reference: reference.trim() || undefined,
          proofPath,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "We could not record that just now. Please try again.");
        setBusy(false);
        return;
      }

      onSubmitted();
    } catch {
      setError("Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
        <p className="eyebrow text-brass-ink">Amount to pay</p>
        <p className="tabular mt-2 font-display text-[2.25rem] leading-none tracking-[-0.03em] text-charcoal">
          {formatNpr(order.grandTotalMinor)}
        </p>
        <p className="tabular mt-2 text-[0.8125rem] text-muted">
          Order {order.orderNumber}
        </p>

        {method?.accountTitle && (
          <p className="mt-4 border-t border-charcoal/12 pt-4 text-[0.875rem] text-charcoal">
            <span className="text-muted">Pay to: </span>
            <span className="font-semibold">{method.accountTitle}</span>
          </p>
        )}
        {method?.accountNumber && (
          <p className="tabular mt-1 text-[0.875rem] text-charcoal">
            <span className="text-muted">Account: </span>
            <span className="font-semibold">{method.accountNumber}</span>
          </p>
        )}
      </div>

      {isQr && (
        <div className="rounded-[16px] border border-charcoal/12 bg-paper p-5 text-center">
          {method?.qrImageUrl ? (
            <>
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="mx-auto block rounded-[14px] border border-charcoal/12 p-2 transition-colors hover:border-charcoal/35"
                aria-label="Enlarge the QR code"
              >
                <Image
                  src={method.qrImageUrl}
                  alt={`QR code to pay ${formatNpr(order.grandTotalMinor)}`}
                  width={220}
                  height={220}
                  className="h-[220px] w-[220px] object-contain"
                  unoptimized
                />
              </button>
              <p className="mt-3 text-[0.75rem] text-muted">
                Tap the code to enlarge it, then scan with your banking or wallet app.
              </p>
            </>
          ) : (
            <p className="rounded-[12px] border border-dashed border-charcoal/25 p-5 text-[0.8125rem] text-muted">
              The QR code has not been uploaded yet. Please contact us using the
              details in the footer to complete this payment.
            </p>
          )}
        </div>
      )}

      {method?.instructions && (
        <p className="border-l-2 border-brass pl-4 text-[0.875rem] leading-relaxed text-muted">
          {method.instructions}
        </p>
      )}

      <div className="space-y-4">
        <Input
          label="Transaction reference"
          placeholder="For example the transaction ID from your app"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <div>
          <span className="mb-1.5 block text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted">
            Payment screenshot
          </span>
          <label
            htmlFor="proof-file"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-dashed border-charcoal/28 bg-paper px-4 py-3 text-[0.8125rem] transition-colors hover:border-charcoal/45"
          >
            <span className={file ? "truncate font-medium text-charcoal" : "text-muted"}>
              {file ? file.name : "Choose an image, PNG or JPG up to 5 MB"}
            </span>
            <span className="shrink-0 font-semibold text-forest">Browse</span>
          </label>
          <input
            id="proof-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {fileError && (
            <p role="alert" className="mt-1.5 text-[0.75rem] font-medium text-critical">
              {fileError}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[12px] border border-critical/35 bg-critical/[0.04] p-3.5 text-[0.8125rem] font-medium text-critical"
        >
          {error}
        </p>
      )}

      <Button full size="lg" onClick={submit} disabled={busy}>
        <span>{busy ? "Submitting..." : "I have paid, submit details"}</span>
      </Button>

      <p className="text-center text-[0.75rem] leading-relaxed text-muted">
        We confirm every manual payment by hand before marking an order paid.
        You will hear from us shortly.
      </p>

      <Modal open={zoom} onClose={() => setZoom(false)} title="QR code">
        <div className="p-6 text-center">
          {method?.qrImageUrl && (
            <Image
              src={method.qrImageUrl}
              alt={`QR code to pay ${formatNpr(order.grandTotalMinor)}`}
              width={460}
              height={460}
              className="mx-auto h-auto w-full max-w-[420px] object-contain"
              unoptimized
            />
          )}
          <p className="tabular mt-4 font-display text-[1.75rem] leading-none">
            {formatNpr(order.grandTotalMinor)}
          </p>
          <p className="mt-2 text-[0.8125rem] text-muted">Order {order.orderNumber}</p>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Uploads to Firebase Storage under this order's folder. Returns null when
 * Storage is unavailable so the caller can fall back to a reference number.
 */
async function uploadProof(file: File, orderId: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orderId", orderId);

    const res = await fetch("/api/checkout/upload-proof", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data.path) return null;
    return data.path as string;
  } catch {
    return null;
  }
}
