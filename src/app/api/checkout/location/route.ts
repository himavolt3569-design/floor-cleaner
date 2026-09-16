import { z } from "zod";
import { requireDb } from "@/lib/firebase/admin";
import { assertSameOrigin, clientIp, rateLimit, GuardError } from "@/lib/utils/request-guard";
import { normalizeNepalAddress } from "@/lib/location/nepal-address";
import { SITE } from "@/config/site";

const input = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    await rateLimit("location", await clientIp(), 10, 60);
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({ ok: false, error: "Invalid location." }, { status: 400 });
    const { latitude, longitude } = parsed.data;
    const endpoint = process.env.GEOCODING_REVERSE_URL || "https://nominatim.openstreetmap.org/reverse";
    // A global rolling gate respects the public provider's maximum of 1 req/s
    // across instances, not merely within a single server process.
    const gate = requireDb().collection("rateLimits").doc("geocoding-global");
    await requireDb().runTransaction(async (tx) => {
      const snap = await tx.get(gate);
      const now = Date.now();
      if (now - Number(snap.data()?.lastRequestAt ?? 0) < 1100) throw new GuardError("Location lookup is busy. Try again in a moment, or enter your address manually.", 429);
      tx.set(gate, { lastRequestAt: now });
    });
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ lat: latitude.toFixed(5), lon: longitude.toFixed(5), format: "jsonv2", addressdetails: "1", zoom: "18", "accept-language": "en" }).toString();
    const result = await fetch(url, { headers: { "User-Agent": `TMGCleaner/1.0 (${SITE.url})` }, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!result.ok) throw new Error("Location lookup is unavailable. Enter your address manually or try again.");
    const data = await result.json();
    if (!data.address) throw new Error("We could not identify this address. Please enter it manually.");
    const address = normalizeNepalAddress(data.address);
    return Response.json({ ok: true, address }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof GuardError ? error.message : error instanceof Error && /Nepal|manually/.test(error.message) ? error.message : "Could not look up this location. Enter your address manually." }, { status: error instanceof GuardError ? error.status : 503 });
  }
}
