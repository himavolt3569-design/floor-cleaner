import { KATHMANDU_VALLEY_DISTRICTS } from "@/config/nepal";
import type { DeliveryKind, DeliveryMethod } from "@/types";

/**
 * Which part of the country a delivery method serves, and which one an address
 * sits in. This is the single rule that stops a Kathmandu address being offered
 * both valley and outside-valley delivery and left to guess between them.
 *
 * Pure by design: the quote API, order creation and the tests all share it.
 */

export type ServiceZone = "valley" | "outside_valley" | "anywhere";

const VALLEY_DISTRICTS = new Set(
  KATHMANDU_VALLEY_DISTRICTS.map((d) => d.toLowerCase()),
);

export function zoneForDistrict(district: string): "valley" | "outside_valley" {
  return VALLEY_DISTRICTS.has(district.trim().toLowerCase())
    ? "valley"
    : "outside_valley";
}

const METHOD_ZONES: Record<DeliveryKind, ServiceZone> = {
  valley: "valley",
  same_day: "valley",
  outside_valley: "outside_valley",
  home: "anywhere",
  pickup: "anywhere",
};

export function zoneOfMethod(method: Pick<DeliveryMethod, "kind">): ServiceZone {
  return METHOD_ZONES[method.kind] ?? "anywhere";
}

export function methodServesDistrict(
  method: Pick<DeliveryMethod, "kind">,
  district: string,
): boolean {
  const zone = zoneOfMethod(method);
  return zone === "anywhere" || zone === zoneForDistrict(district);
}

/**
 * The option the checkout should preselect: the cheapest-ranked real delivery.
 * Returns null when pickup is all that is left, because "we will deliver this
 * to you" is not a claim we can make about a pickup.
 */
export function recommendedDeliveryId(
  methods: Pick<DeliveryMethod, "id" | "kind" | "sortOrder">[],
): string | null {
  const deliverable = methods.filter((m) => m.kind !== "pickup");
  if (!deliverable.length) return null;

  return [...deliverable].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )[0].id;
}
