import { describe, expect, it } from "vitest";
import { eligibleDeliveryMethods } from "./pricing";
import type { DeliveryMethod } from "@/types";

function method(over: Partial<DeliveryMethod>): DeliveryMethod {
  return {
    id: "m",
    kind: "home",
    name: "Method",
    description: "",
    feeMinor: 10_000,
    estimate: "1 to 2 days",
    enabled: true,
    sortOrder: 1,
    provinces: [],
    districts: [],
    minimumOrderMinor: null,
    freeDeliveryThresholdMinor: null,
    ...over,
  };
}

const valley = method({ id: "valley", kind: "valley", sortOrder: 1 });
const outside = method({ id: "outside", kind: "outside_valley", sortOrder: 2 });
const pickup = method({ id: "pickup", kind: "pickup", sortOrder: 3, feeMinor: 0 });

describe("eligibleDeliveryMethods zone filtering", () => {
  it("offers a valley address the valley method and pickup, never outside-valley", () => {
    const ids = eligibleDeliveryMethods(
      [valley, outside, pickup],
      100_000,
      "Bagmati",
      "Kathmandu",
    ).map((m) => m.id);

    expect(ids).toEqual(["valley", "pickup"]);
  });

  it("offers an address outside the valley the outside method, never the valley one", () => {
    const ids = eligibleDeliveryMethods(
      [valley, outside, pickup],
      100_000,
      "Koshi",
      "Jhapa",
    ).map((m) => m.id);

    expect(ids).toEqual(["outside", "pickup"]);
  });

  it("does not filter by zone before a district is known", () => {
    const ids = eligibleDeliveryMethods([valley, outside, pickup], 100_000).map(
      (m) => m.id,
    );

    expect(ids).toEqual(["valley", "outside", "pickup"]);
  });

  it("still honours an explicit district list on the method", () => {
    const pokharaOnly = method({
      id: "pokhara",
      kind: "outside_valley",
      districts: ["Kaski"],
    });

    expect(
      eligibleDeliveryMethods([pokharaOnly], 100_000, "Koshi", "Jhapa"),
    ).toHaveLength(0);
  });

  it("still honours the minimum order value", () => {
    const premium = method({ id: "premium", kind: "valley", minimumOrderMinor: 500_000 });

    expect(
      eligibleDeliveryMethods([premium], 100_000, "Bagmati", "Kathmandu"),
    ).toHaveLength(0);
  });
});
