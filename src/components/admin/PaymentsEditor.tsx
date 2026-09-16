"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePaymentMethod } from "@/app/admin/actions";
import { uploadAdminMedia } from "@/lib/utils/upload";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";
import type { PaymentMethod } from "@/types";

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";
const AREA =
  "w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 py-2 text-[0.875rem] leading-relaxed text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

export function PaymentsEditor({ methods }: { methods: PaymentMethod[] }) {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();

  if (!methods.length) {
    return (
      <Notice tone="warn">
        No payment methods in Firestore yet. Run <code>pnpm seed</code> to create
        the default set.
      </Notice>
    );
  }

  return (
    <div className="space-y-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {methods.map((method) => (
        <MethodCard key={method.id} method={method} onDone={setMessage} />
      ))}
    </div>
  );
}

function MethodCard({
  method,
  onDone,
}: {
  method: PaymentMethod;
  onDone: (m: { tone: "success" | "error"; text: string }) => void;
}) {
  const [state, setState] = useState({
    name: method.name,
    description: method.description ?? "",
    enabled: method.enabled,
    requiresVerification: method.requiresVerification,
    instructions: method.instructions ?? "",
    accountTitle: method.accountTitle ?? "",
    accountNumber: method.accountNumber ?? "",
    qrImageUrl: method.qrImageUrl ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const isGateway = ["esewa", "khalti", "fonepay"].includes(method.kind);
  const showsQr = method.kind === "qr" || method.kind === "bank_transfer";

  const patch = (p: Partial<typeof state>) => setState((s) => ({ ...s, ...p }));

  const save = () =>
    start(async () => {
      const result = await savePaymentMethod({
        id: method.id,
        kind: method.kind,
        sortOrder: method.sortOrder ?? 0,
        ...state,
      });
      onDone(
        result.ok
          ? { tone: "success", text: `${state.name} saved.` }
          : { tone: "error", text: result.error ?? "That did not save." },
      );
      if (result.ok) router.refresh();
    });

  const uploadQr = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdminMedia(file, "payments");
      patch({ qrImageUrl: url });
      onDone({ tone: "success", text: "QR uploaded. Press Save to publish it." });
    } catch (err) {
      onDone({ tone: "error", text: (err as Error)?.message || "Could not upload that image." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Panel title={`${method.name} (${method.kind})`}>
      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <Field label="Name shown at checkout">
          <input className={INPUT} value={state.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>

        <Field label="Short description">
          <input
            className={INPUT}
            value={state.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>

        <div className="lg:col-span-2 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-[0.875rem] text-charcoal">
            <input
              type="checkbox"
              checked={state.enabled}
              disabled={isGateway && !method.gatewayConfigured}
              onChange={(e) => patch({ enabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-forest)]"
            />
            Offer this method
          </label>

          <label className="flex items-center gap-2 text-[0.875rem] text-charcoal">
            <input
              type="checkbox"
              checked={state.requiresVerification}
              onChange={(e) => patch({ requiresVerification: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-forest)]"
            />
            We confirm payment by hand
          </label>
        </div>

        {isGateway && !method.gatewayConfigured && (
          <div className="lg:col-span-2">
            <Notice tone="warn">
              This gateway has no server credentials configured, so it cannot be
              enabled. Until the keys are set, a customer choosing it would have
              no way to pay. See README.md for the variables to set.
            </Notice>
          </div>
        )}

        {showsQr && (
          <>
            <Field label="Account title">
              <input
                className={INPUT}
                value={state.accountTitle}
                onChange={(e) => patch({ accountTitle: e.target.value })}
              />
            </Field>
            <Field label="Account number">
              <input
                className={`${INPUT} tabular`}
                value={state.accountNumber}
                onChange={(e) => patch({ accountNumber: e.target.value })}
              />
            </Field>

            <Field label="Instructions shown to the customer" className="lg:col-span-2">
              <textarea
                rows={3}
                className={AREA}
                value={state.instructions}
                onChange={(e) => patch({ instructions: e.target.value })}
              />
            </Field>

            <div className="lg:col-span-2">
              <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
                QR code
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {state.qrImageUrl ? (
                  <Image
                    src={state.qrImageUrl}
                    alt="Current payment QR code"
                    width={110}
                    height={110}
                    unoptimized
                    className="rounded-[10px] border border-charcoal/12 bg-paper object-contain p-1.5"
                  />
                ) : (
                  <span className="grid h-[110px] w-[110px] place-items-center rounded-[10px] border border-dashed border-charcoal/25 text-[0.6875rem] text-muted">
                    None yet
                  </span>
                )}

                <label
                  htmlFor={`qr-${method.id}`}
                  className="cursor-pointer rounded-[10px] border border-charcoal/18 bg-paper px-4 py-2 text-[0.8125rem] font-semibold text-charcoal hover:border-charcoal/45"
                >
                  {uploading ? "Uploading..." : "Upload new QR"}
                </label>
                <input
                  id={`qr-${method.id}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadQr(f);
                  }}
                />
              </div>
            </div>
          </>
        )}

        <div className="lg:col-span-2">
          <Button disabled={pending} onClick={save}>
            <span>{pending ? "Saving..." : "Save"}</span>
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
