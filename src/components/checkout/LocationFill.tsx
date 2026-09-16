"use client";
import { useEffect, useRef, useState } from "react";
import type { AddressState } from "./AddressForm";
import { Button } from "@/components/ui/Button";

export function LocationFill({ onChange }: { onChange: (patch: Partial<AddressState>) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const attempt = useRef(0);
  useEffect(() => () => { attempt.current++; }, []);
  const locate = () => {
    if (!navigator.geolocation) { setMessage("Your browser cannot share location. Enter your address below."); return; }
    const current = ++attempt.current;
    setBusy(true);
    setMessage("Waiting for your browser's location permission…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (current !== attempt.current) return;
      setMessage("Finding your delivery address…");
      try {
        const res = await fetch("/api/checkout/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }), signal: AbortSignal.timeout(15000) });
        const data = await res.json();
        if (current !== attempt.current) return;
        if (!res.ok || !data.ok) throw new Error(data.error || "Location lookup failed. Enter your address below.");
        onChange(data.address);
        setMessage("Location filled. Check the address and complete any missing ward, area or landmark below.");
      } catch (error) {
        if (current === attempt.current) setMessage(error instanceof Error ? error.message : "Could not find your address. Enter it below.");
      } finally { if (current === attempt.current) setBusy(false); }
    }, (error) => {
      if (current !== attempt.current) return;
      setBusy(false);
      setMessage(error.code === 1 ? "Location permission was denied. You can still enter every address field manually." : "Location could not be determined. Try again or enter your address manually.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  return <div className="mb-5 rounded-2xl border border-forest/20 bg-ivory p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Where should we deliver?</p><p className="mt-1 text-xs text-muted">Use your location, or fill in the address below.</p></div><Button onClick={locate} disabled={busy}>{busy ? "Finding location…" : "Use my current location"}</Button></div>
    <p className="mt-3 text-xs text-muted">When you choose this, your coordinates are sent to OpenStreetMap to find your address.</p>
    {busy && <button type="button" className="mt-2 text-sm font-semibold text-forest underline" onClick={() => { attempt.current++; setBusy(false); setMessage("Automatic lookup cancelled. Enter your address below."); }}>Enter address manually</button>}
    <p role="status" className="mt-2 text-xs text-forest">{message}</p>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-[10px] text-muted underline">Address data © OpenStreetMap contributors</a>
  </div>;
}
