"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveDeliveryMethod } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";
import { NEPAL_PROVINCES } from "@/config/nepal";
import { minorToRupees } from "@/lib/utils/money";
import type { DeliveryMethod } from "@/types";

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

export function DeliveryEditor({ methods }: { methods: DeliveryMethod[] }) {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();

  if (!methods.length) {
    return (
      <Notice tone="warn">
        No delivery methods in Firestore yet. Run <code>pnpm seed</code> to create
        the default set.
      </Notice>
    );
  }

  return (
    <div className="space-y-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {methods.map((m) => (
        <MethodCard key={m.id} method={m} onDone={setMessage} />
      ))}
    </div>
  );
}

function MethodCard({
  method,
  onDone,
}: {
  method: DeliveryMethod;
  onDone: (m: { tone: "success" | "error"; text: string }) => void;
}) {
  const [state, setState] = useState({
    name: method.name,
    description: method.description ?? "",
    estimate: method.estimate ?? "",
    enabled: method.enabled,
    feeRupees: String(minorToRupees(method.feeMinor ?? 0)),
    freeThreshold:
      method.freeDeliveryThresholdMinor === null ||
      method.freeDeliveryThresholdMinor === undefined
        ? ""
        : String(minorToRupees(method.freeDeliveryThresholdMinor)),
    minimumOrder:
      method.minimumOrderMinor === null || method.minimumOrderMinor === undefined
        ? ""
        : String(minorToRupees(method.minimumOrderMinor)),
    provinces: method.provinces ?? [],
    districts: (method.districts ?? []).join(", "),
  });
  const [pending, start] = useTransition();
  const router = useRouter();

  const patch = (p: Partial<typeof state>) => setState((s) => ({ ...s, ...p }));

  const save = () =>
    start(async () => {
      const result = await saveDeliveryMethod({
        id: method.id,
        kind: method.kind,
        sortOrder: method.sortOrder ?? 0,
        name: state.name,
        description: state.description,
        estimate: state.estimate,
        enabled: state.enabled,
        feeRupees: Number(state.feeRupees || 0),
        freeDeliveryThresholdRupees:
          state.freeThreshold === "" ? null : Number(state.freeThreshold),
        minimumOrderRupees:
          state.minimumOrder === "" ? null : Number(state.minimumOrder),
        provinces: state.provinces,
        districts: state.districts
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      });

      onDone(
        result.ok
          ? { tone: "success", text: `${state.name} saved.` }
          : { tone: "error", text: result.error ?? "That did not save." },
      );
      if (result.ok) router.refresh();
    });

  const toggleProvince = (province: string) =>
    patch({
      provinces: state.provinces.includes(province)
        ? state.provinces.filter((p) => p !== province)
        : [...state.provinces, province],
    });

  return (
    <Panel title={method.name}>
      <div className="grid gap-4 p-5 lg:grid-cols-3">
        <Field label="Name">
          <input className={INPUT} value={state.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Fee, Rs.">
          <input
            type="number"
            min={0}
            className={`${INPUT} tabular`}
            value={state.feeRupees}
            onChange={(e) => patch({ feeRupees: e.target.value })}
          />
        </Field>
        <Field label="Estimated time">
          <input
            className={INPUT}
            placeholder="1 to 2 days"
            value={state.estimate}
            onChange={(e) => patch({ estimate: e.target.value })}
          />
        </Field>

        <Field label="Description" className="lg:col-span-3">
          <input
            className={INPUT}
            value={state.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>

        <Field label="Free delivery above, Rs.">
          <input
            type="number"
            min={0}
            placeholder="Leave blank for none"
            className={`${INPUT} tabular`}
            value={state.freeThreshold}
            onChange={(e) => patch({ freeThreshold: e.target.value })}
          />
        </Field>
        <Field label="Minimum order, Rs.">
          <input
            type="number"
            min={0}
            placeholder="Leave blank for none"
            className={`${INPUT} tabular`}
            value={state.minimumOrder}
            onChange={(e) => patch({ minimumOrder: e.target.value })}
          />
        </Field>
        <div className="flex items-end">
          <label className="flex h-10 items-center gap-2 text-[0.875rem] text-charcoal">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-forest)]"
            />
            Offer this option
          </label>
        </div>

        <Field label="Provinces served" className="lg:col-span-3">
          <div className="flex flex-wrap gap-2">
            {NEPAL_PROVINCES.map((province) => {
              const on = state.provinces.includes(province);
              return (
                <button
                  key={province}
                  type="button"
                  onClick={() => toggleProvince(province)}
                  aria-pressed={on}
                  className={`rounded-[9px] border px-3 py-1.5 text-[0.75rem] font-semibold transition-colors ${
                    on
                      ? "border-forest bg-forest text-paper"
                      : "border-charcoal/18 bg-paper text-muted hover:border-charcoal/40"
                  }`}
                >
                  {province}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[0.75rem] text-muted">
            Select none to offer this option everywhere in Nepal.
          </p>
        </Field>

        <Field label="Districts served" className="lg:col-span-3">
          <input
            className={INPUT}
            placeholder="Kathmandu, Lalitpur, Bhaktapur. Leave blank for every district."
            value={state.districts}
            onChange={(e) => patch({ districts: e.target.value })}
          />
        </Field>

        <div className="lg:col-span-3">
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
