"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { OrderCard } from "./OrderCard";
import type { TrackedOrder } from "@/lib/commerce/tracking-view";

export function LookupForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setOrder(null);

    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber, mobile }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "We could not find that order.");
        return;
      }
      setOrder(data.order as TrackedOrder);
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Order number"
          required
          value={orderNumber}
          placeholder="TMG-2609-0042"
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        <Input
          label="Mobile number on the order"
          required
          inputMode="numeric"
          value={mobile}
          placeholder="98XXXXXXXX"
          onChange={(e) => setMobile(e.target.value)}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            <span>{busy ? "Looking..." : "Find my order"}</span>
          </Button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[12px] border border-critical/35 bg-critical/[0.04] p-3.5 text-[0.8125rem] font-medium text-critical"
        >
          {error}
        </p>
      )}

      {order && (
        <div className="mt-5">
          <OrderCard order={order} />
        </div>
      )}
    </div>
  );
}
