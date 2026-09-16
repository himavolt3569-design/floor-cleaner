import { describe, expect, it } from "vitest";
import {
  methodServesDistrict,
  recommendedDeliveryId,
  zoneForDistrict,
  zoneOfMethod,
} from "./service-zone";

describe("zoneForDistrict", () => {
  it("treats the three valley districts as the valley", () => {
    expect(zoneForDistrict("Kathmandu")).toBe("valley");
    expect(zoneForDistrict("Lalitpur")).toBe("valley");
    expect(zoneForDistrict("Bhaktapur")).toBe("valley");
  });

  it("treats every other district as outside the valley", () => {
    expect(zoneForDistrict("Jhapa")).toBe("outside_valley");
    expect(zoneForDistrict("Kaski")).toBe("outside_valley");
  });

  it("ignores casing and surrounding whitespace", () => {
    expect(zoneForDistrict("  kathmandu ")).toBe("valley");
  });

  it("treats an empty district as outside the valley", () => {
    expect(zoneForDistrict("")).toBe("outside_valley");
  });
});

describe("zoneOfMethod", () => {
  it("maps each delivery kind to the zone it serves", () => {
    expect(zoneOfMethod({ kind: "valley" })).toBe("valley");
    expect(zoneOfMethod({ kind: "same_day" })).toBe("valley");
    expect(zoneOfMethod({ kind: "outside_valley" })).toBe("outside_valley");
    expect(zoneOfMethod({ kind: "home" })).toBe("anywhere");
    expect(zoneOfMethod({ kind: "pickup" })).toBe("anywhere");
  });
});

describe("methodServesDistrict", () => {
  it("keeps a valley method for a valley address", () => {
    expect(methodServesDistrict({ kind: "valley" }, "Kathmandu")).toBe(true);
  });

  it("removes a valley method for an address outside the valley", () => {
    expect(methodServesDistrict({ kind: "valley" }, "Jhapa")).toBe(false);
  });

  it("removes an outside-valley method for a valley address", () => {
    expect(methodServesDistrict({ kind: "outside_valley" }, "Lalitpur")).toBe(false);
  });

  it("keeps an anywhere method for any address", () => {
    expect(methodServesDistrict({ kind: "pickup" }, "Kathmandu")).toBe(true);
    expect(methodServesDistrict({ kind: "pickup" }, "Jhapa")).toBe(true);
  });
});

describe("recommendedDeliveryId", () => {
  it("recommends the lowest sortOrder option that is not pickup", () => {
    const id = recommendedDeliveryId([
      { id: "pickup", kind: "pickup", sortOrder: 1 },
      { id: "outside", kind: "outside_valley", sortOrder: 3 },
      { id: "valley", kind: "valley", sortOrder: 2 },
    ]);
    expect(id).toBe("valley");
  });

  it("recommends nothing when pickup is the only option", () => {
    expect(
      recommendedDeliveryId([{ id: "pickup", kind: "pickup", sortOrder: 1 }]),
    ).toBeNull();
  });

  it("recommends nothing when there are no options", () => {
    expect(recommendedDeliveryId([])).toBeNull();
  });
});
