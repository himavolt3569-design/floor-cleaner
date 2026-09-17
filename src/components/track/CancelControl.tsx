"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CancellationState } from "@/types";

export function CancelControl({
  orderNumber,
  ability,
  cancellationState,
}: {
  orderNumber: string;
  ability: "cancel" | "request" | "none";
  cancellationState: CancellationState;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();

  if (cancellationState === "requested") {
    return (
      <div className="rounded-[16px] border border-caution/40 bg-caution/[0.06] p-5">
        <p className="text-[0.875rem] font-semibold text-charcoal">
          You asked us to cancel this order
        </p>
        <p className="mt-2 text-[0.8125rem] text-muted">
          The parcel is already with the courier, so someone here is confirming
          it. We will call you either way.
        </p>
      </div>
    );
  }

  if (ability === "none") return null;

  const submit = async () => {
    setBusy(true);
    setError(undefined);

    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber, reason }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "We could not cancel that order.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[16px] border border-charcoal/12 bg-paper p-5">
      <h2 className="text-[0.875rem] font-bold text-charcoal">
        {ability === "cancel" ? "Cancel this order" : "Need to cancel?"}
      </h2>
      <p className="mt-2 text-[0.8125rem] text-muted">
        {ability === "cancel"
          ? "We have not sent this out yet, so you can cancel it right now."
          : "This order is already with the courier. We can ask them to stop it, and someone here will confirm with you."}
      </p>

      {!open ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-4"
          onClick={() => setOpen(true)}
        >
          <span>
            {ability === "cancel" ? "Cancel order" : "Request cancellation"}
          </span>
        </Button>
      ) : (
        <div className="mt-4">
          <label className="block text-[0.75rem] font-semibold text-charcoal">
            Reason, optional
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ordered the wrong size"
              className="mt-1.5 block h-10 w-full rounded-[10px] border border-charcoal/18 bg-paper px-3 text-[0.8125rem] font-normal"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={submit}>
              <span>{busy ? "Sending..." : "Confirm"}</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              <span>Keep my order</span>
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[0.8125rem] font-medium text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
