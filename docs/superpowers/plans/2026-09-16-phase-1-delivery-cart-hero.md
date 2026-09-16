# Phase 1: Delivery auto-selection, checkout cart editing, hero restore

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A customer's address decides their delivery option instead of asking them to choose between two indistinguishable ones; the checkout lets them fix a wrong cart without leaving it; and the hero goes back to the arch-and-wordmark composition.

**Architecture:** One new pure module, `src/lib/commerce/service-zone.ts`, maps a district to a service zone and a delivery method to the zone it serves. The existing `eligibleDeliveryMethods` filter consumes it, which means both the quote API and order creation inherit the rule from one place. The checkout presents the resulting single option as a decision already made, with pickup beside it. Cart editing reuses the `QuantitySelector` already used by the cart drawer. The hero reverts to the composition in commit 7515de8, whose CSS never left `globals.css`.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19, TypeScript strict, Zustand, Zod, Tailwind v4, Firebase Admin SDK, pnpm. Vitest is added by Task 1 for pure-logic tests.

**Spec:** `docs/superpowers/specs/2026-09-16-order-lifecycle-design.md`

## Global Constraints

- Money is always an integer number of paisa, in a field named `*Minor`. Never a float. Use `formatNpr` / `rupeesToMinor` from `src/lib/utils/money.ts`.
- The browser sends ids and quantities only. Prices, delivery fees and totals are recomputed server side on every request, and any rule enforced in the UI must also be enforced in `createOrder`.
- No client ever writes to Firestore. Every write goes through the Next.js server with the Admin SDK.
- This is not the Next.js in your training data. Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code. Note that middleware lives in `src/proxy.ts` in this repo.
- Package manager is `pnpm`. Verification commands are `pnpm typecheck` and `pnpm lint`.
- New rule modules under `src/lib/commerce/` are pure: no `server-only`, no Firestore access, so they can be tested directly. Existing modules that mix rules with server access, such as `pricing.ts`, stay as they are; the Vitest config stubs `server-only` so they can still be imported by a test.

---

### Task 1: Service zone module and the Vitest harness

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/commerce/service-zone.ts`
- Create: `src/lib/commerce/service-zone.test.ts`
- Modify: `package.json` (scripts and devDependencies)

**Interfaces:**
- Consumes: `KATHMANDU_VALLEY_DISTRICTS` from `src/config/nepal.ts`; `DeliveryKind` and `DeliveryMethod` from `src/types/index.ts`.
- Produces:
  - `type ServiceZone = "valley" | "outside_valley" | "anywhere"`
  - `zoneForDistrict(district: string): "valley" | "outside_valley"`
  - `zoneOfMethod(method: Pick<DeliveryMethod, "kind">): ServiceZone`
  - `methodServesDistrict(method: Pick<DeliveryMethod, "kind">, district: string): boolean`
  - `recommendedDeliveryId(methods: Pick<DeliveryMethod, "id" | "kind" | "sortOrder">[]): string | null`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest@^3
```

- [ ] **Step 2: Add the test scripts**

In `package.json`, add these two entries to `"scripts"`, directly after the `"typecheck"` line:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Create the Vitest config and the `server-only` stub**

Create `src/test/server-only-stub.ts`:

```ts
/**
 * `server-only` throws by design when it is resolved outside a React Server
 * Component. Vitest runs plain Node, so importing a server module in a test
 * would blow up on that import alone. The Vitest config aliases the package to
 * this empty module; nothing else may import it.
 */
export {};
```

Create `vitest.config.ts`. The `@` alias is required because the modules under test import through it, and the `server-only` alias is what lets a test import `pricing.ts`.

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/commerce/service-zone.test.ts`:

```ts
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
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL. Vitest cannot resolve `./service-zone` because the module does not exist yet.

- [ ] **Step 6: Write the implementation**

Create `src/lib/commerce/service-zone.ts`:

```ts
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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS, 12 tests across 4 suites.

- [ ] **Step 8: Verify the build still typechecks**

Run: `pnpm typecheck`
Expected: no output, exit 0.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml src/test/server-only-stub.ts src/lib/commerce/service-zone.ts src/lib/commerce/service-zone.test.ts
git commit -m "feat: add service zone rules and a vitest harness" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Zone filtering in eligibility, and a recommendation from the quote API

**Files:**
- Modify: `src/lib/commerce/pricing.ts:178-201` (`eligibleDeliveryMethods`)
- Modify: `src/app/api/checkout/quote/route.ts:46-62` (add `recommendedId` to the response)
- Modify: `src/types/checkout.ts:29-35` (`QuoteResponse`)
- Test: `src/lib/commerce/eligibility.test.ts` (create)

**Interfaces:**
- Consumes: `methodServesDistrict` and `recommendedDeliveryId` from Task 1.
- Produces: `QuoteResponse.recommendedId: string | null`, consumed by Task 3. `eligibleDeliveryMethods` keeps its existing signature `(methods, subtotalMinor, province?, district?)` and gains zone filtering when `district` is supplied.

- [ ] **Step 1: Write the failing test**

Create `src/lib/commerce/eligibility.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/commerce/eligibility.test.ts`
Expected: FAIL on the first two cases. `outside` currently survives a Kathmandu address because its `districts` array is empty, which means "everywhere".

- [ ] **Step 3: Add the zone filter**

In `src/lib/commerce/pricing.ts`, add this import below the existing `isValidMinor` import:

```ts
import { methodServesDistrict } from "./service-zone";
```

Then replace the body of `eligibleDeliveryMethods` (currently lines 178-201) with:

```ts
export function eligibleDeliveryMethods(
  methods: DeliveryMethod[],
  subtotalMinor: number,
  province?: string,
  district?: string,
): DeliveryMethod[] {
  return methods.filter((method) => {
    if (!method.enabled) return false;

    // The zone rule: an address in the valley is never offered outside-valley
    // delivery, and vice versa. Skipped until we know the district, because
    // before that the customer is still filling the address in.
    if (district && !methodServesDistrict(method, district)) return false;

    if (province && method.provinces?.length && !method.provinces.includes(province)) {
      return false;
    }
    if (district && method.districts?.length && !method.districts.includes(district)) {
      return false;
    }
    if (
      isValidMinor(method.minimumOrderMinor ?? undefined) &&
      subtotalMinor < (method.minimumOrderMinor as number)
    ) {
      return false;
    }
    return true;
  });
}
```

Leave the doc comment above the function in place and add this sentence to the end of it: `A method that serves the wrong zone for the address is removed here rather than shown and left to the customer to interpret.`

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS, all suites.

- [ ] **Step 5: Add `recommendedId` to the quote response type**

In `src/types/checkout.ts`, add the field to `QuoteResponse`:

```ts
export interface QuoteResponse {
  ok: true;
  items: QuoteItem[];
  subtotalMinor: number;
  deliveryMethods: QuoteDelivery[];
  /** The option the checkout preselects. Null when only pickup is available. */
  recommendedId: string | null;
  paymentMethods: QuotePayment[];
}
```

- [ ] **Step 6: Return it from the quote route**

In `src/app/api/checkout/quote/route.ts`, add the import:

```ts
import { recommendedDeliveryId } from "@/lib/commerce/service-zone";
```

Immediately after the `const delivery = ...` assignment ends (the `}));` on line 62), add:

```ts
    const recommendedId = recommendedDeliveryId(
      eligibleDeliveryMethods(allDelivery, subtotalMinor, province, district),
    );
```

Then add `recommendedId,` to the returned JSON object, directly after the `deliveryMethods: delivery,` line.

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all three clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/commerce/pricing.ts src/lib/commerce/eligibility.test.ts src/app/api/checkout/quote/route.ts src/types/checkout.ts
git commit -m "feat: pick delivery by service zone and recommend one option" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The checkout presents one delivery decision

**Files:**
- Modify: `src/components/checkout/Selectors.tsx:58-119` (`DeliverySelector`)
- Modify: `src/components/checkout/CheckoutModal.tsx:35-124` (state and quote handling), `:255-262` (render)

**Interfaces:**
- Consumes: `QuoteResponse.recommendedId` from Task 2.
- Produces: `DeliverySelector` gains two props, `recommendedId: string | null` and `district: string`. No other component consumes them.

- [ ] **Step 1: Add the recommendation to DeliverySelector**

In `src/components/checkout/Selectors.tsx`, replace the `DeliverySelector` signature and its `methods.map` body. The props become:

```ts
export function DeliverySelector({
  methods,
  selectedId,
  onSelect,
  addressReady,
  recommendedId,
  district,
}: {
  methods: QuoteDelivery[];
  selectedId: string;
  onSelect: (id: string) => void;
  addressReady: boolean;
  recommendedId: string | null;
  district: string;
}) {
```

Keep both early returns exactly as they are. In the `methods.map` call, add a `description` that explains the automatic choice and a badge on the recommended row, by replacing the `<OptionRow ... />` element with:

```tsx
        <OptionRow
          key={method.id}
          id={`delivery-${method.id}`}
          name="delivery"
          checked={selectedId === method.id}
          onSelect={() => onSelect(method.id)}
          title={
            method.id === recommendedId && district ? (
              <>
                {method.name}
                <span className="ml-2 rounded-[7px] bg-forest/12 px-2 py-0.5 text-[0.6875rem] font-semibold text-forest">
                  Selected for {district}
                </span>
              </>
            ) : (
              method.name
            )
          }
          description={`${method.description} Estimated ${method.estimate.toLowerCase()}.`}
          trailing={
            <span className="tabular text-[0.875rem] font-semibold text-charcoal">
              {method.feeMinor === 0 ? (
                <>
                  Free
                  {method.freeApplied && method.baseFeeMinor > 0 && (
                    <span className="ml-1.5 font-normal text-muted line-through">
                      {formatNpr(method.baseFeeMinor)}
                    </span>
                  )}
                </>
              ) : (
                formatNpr(method.feeMinor)
              )}
            </span>
          }
        />
```

- [ ] **Step 2: Widen the OptionRow title type**

`OptionRow` in the same file declares `title: string`. Change that one line to:

```ts
  title: React.ReactNode;
```

- [ ] **Step 3: Carry the recommendation through the checkout**

In `src/components/checkout/CheckoutModal.tsx`, add the state beside the existing `deliveryMethods` state:

```ts
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
```

In `fetchQuote`, in the failure branch that currently calls `setDeliveryMethods([])` and `setPaymentMethods([])`, add `setRecommendedId(null);` as a third line.

In the success branch, directly after `setDeliveryMethods(data.deliveryMethods);`, add:

```ts
      setRecommendedId(data.recommendedId);
```

Then replace the `setDeliveryId` updater so the recommendation wins when the current choice is no longer offered:

```ts
      setDeliveryId((current) =>
        data.deliveryMethods.some((m) => m.id === current)
          ? current
          : (data.recommendedId ?? data.deliveryMethods[0]?.id ?? ""),
      );
```

- [ ] **Step 4: Pass the new props**

In the same file, in the `Section title="Delivery option"` block, replace the `<DeliverySelector .../>` element with:

```tsx
              <DeliverySelector
                methods={deliveryMethods}
                selectedId={deliveryId}
                onSelect={setDeliveryId}
                addressReady={addressReady}
                recommendedId={recommendedId}
                district={address.district}
              />
```

- [ ] **Step 5: Verify in the browser**

Run the dev server and open the checkout with items in the cart.

Expected, with province Bagmati and district Kathmandu: exactly two delivery rows, "Kathmandu Valley delivery" carrying the "Selected for Kathmandu" badge and preselected, plus "Pickup". "Outside valley delivery" must not appear.

Expected, with province Koshi and district Jhapa: "Outside valley delivery" badged and preselected, and no valley or pickup row, because the seeded pickup method lists only the three valley districts.

- [ ] **Step 6: Verify the build**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/checkout/Selectors.tsx src/components/checkout/CheckoutModal.tsx
git commit -m "feat: preselect the delivery option that fits the address" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Editable cart lines inside the checkout

**Files:**
- Modify: `src/components/checkout/OrderSummary.tsx:8-49`
- Modify: `src/components/checkout/CheckoutModal.tsx:29-30` (store bindings), `:273-279` (render)

**Interfaces:**
- Consumes: `useCart`'s existing `setQuantity(variantId, quantity)` and `remove(variantId)` from `src/lib/store/cart.ts`.
- Produces: `OrderSummary` gains three optional props: `editable?: boolean`, `onQuantityChange?: (variantId: string, quantity: number) => void`, `onRemove?: (variantId: string) => void`. When `editable` is absent the component renders exactly as it does today, so no other caller changes.

- [ ] **Step 1: Add the editing props to OrderSummary**

In `src/components/checkout/OrderSummary.tsx`, add the import:

```ts
import { QuantitySelector } from "@/components/commerce/QuantitySelector";
```

Extend the props:

```ts
export function OrderSummary({
  lines,
  subtotalMinor,
  deliveryFeeMinor,
  discountMinor = 0,
  pricing,
  editable = false,
  onQuantityChange,
  onRemove,
}: {
  lines: CartLine[];
  subtotalMinor: number;
  deliveryFeeMinor: number | null;
  discountMinor?: number;
  pricing: boolean;
  editable?: boolean;
  onQuantityChange?: (variantId: string, quantity: number) => void;
  onRemove?: (variantId: string) => void;
}) {
```

- [ ] **Step 2: Render the editable line**

Replace the whole `<li>` element inside `lines.map` with:

```tsx
          <li key={line.variantId} className="flex items-start gap-3">
            <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-[8px] bg-stone">
              <Image src={line.image} alt="" fill sizes="36px" className="object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-semibold text-charcoal">
                {line.name}
              </p>
              {editable ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <QuantitySelector
                    size="sm"
                    value={line.quantity}
                    onChange={(n) => onQuantityChange?.(line.variantId, n)}
                    label={`Quantity for ${line.variantLabel}`}
                  />
                  <button
                    type="button"
                    onClick={() => onRemove?.(line.variantId)}
                    aria-label={`Remove ${line.name} ${line.variantLabel} from your order`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-faint transition-colors hover:bg-charcoal/[0.06] hover:text-charcoal"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <p className="tabular text-[0.75rem] text-muted">
                  {line.variantLabel} &times; {line.quantity}
                </p>
              )}
            </div>
            <span className="tabular shrink-0 text-[0.8125rem] font-semibold text-charcoal">
              {formatNpr(line.unitPriceMinor * line.quantity)}
            </span>
          </li>
```

Note the variant label moves into the quantity control's accessible label when editing, so the row does not repeat itself.

- [ ] **Step 3: Bind the cart store in the checkout**

In `src/components/checkout/CheckoutModal.tsx`, beside the existing `lines` and `clearCart` bindings, add:

```ts
  const setCartQuantity = useCart((s) => s.setQuantity);
  const removeCartLine = useCart((s) => s.remove);
```

- [ ] **Step 4: Turn on editing in the checkout summary**

Replace the `<OrderSummary .../>` element inside the form phase with:

```tsx
            <OrderSummary
              lines={lines}
              subtotalMinor={subtotalMinor || fallbackSubtotal(lines)}
              deliveryFeeMinor={selectedDelivery?.feeMinor ?? null}
              pricing={quoting && !subtotalMinor}
              editable
              onQuantityChange={setCartQuantity}
              onRemove={removeCartLine}
            />
```

- [ ] **Step 5: Verify in the browser**

With two different sizes in the cart, open the checkout.

Expected: each line has a quantity stepper and a remove button. Increasing a quantity updates the subtotal and total, and the delivery fee re-evaluates against any free-delivery threshold, because changing `lines` changes `items`, which re-runs the quote effect. Removing every line shows the existing "Your cart is empty" state rather than a broken summary.

Confirm the `OrderSuccess` and payment phases still render, since they use the same component without `editable`.

- [ ] **Step 6: Verify the build**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/checkout/OrderSummary.tsx src/components/checkout/CheckoutModal.tsx
git commit -m "feat: let customers fix quantities and remove items in checkout" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Restore the arch hero and move the campaign image to the intro

**Files:**
- Modify: `src/components/sections/HeroSection.tsx:89-94`
- Modify: `src/config/defaults.ts:79-81` (the `hero.image` default)
- Modify: `src/components/admin/SettingsForm.tsx:17`, `:84` (help text for the hero image field)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing other tasks depend on.

Context: the arch composition, its wordmark, orbit, floor and surface chips are all still in `src/app/globals.css` at lines 192 and 201-207 and are currently unused. The markup was replaced by a single flat image; this restores it. `settings.hero.image` stays supported as an override so an admin can still put a photograph there, but it now defaults to empty, which is what makes the arch the default again.

- [ ] **Step 1: Restore the hero composition**

In `src/components/sections/HeroSection.tsx`, replace the contents of the `hero-visual` div (currently the single `<div className="relative mx-auto aspect-[4/5] ...">` block) with:

```tsx
            {settings.hero.image ? (
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[34rem] overflow-hidden rounded-[28px] bg-stone">
                <Image
                  src={settings.hero.image}
                  alt={`${lang === "ne" ? t.product.name : productName}: product artwork with marble, tile and granite`}
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 639px) 92vw, (max-width: 1023px) 544px, 46vw"
                  quality={90}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="hero-stage relative mx-auto h-[19rem] w-full max-w-[32rem] sm:h-[clamp(23rem,44vw,36rem)] lg:max-w-none">
                <span className="hero-stage-word" aria-hidden="true">TMG</span>
                <div aria-hidden="true" className="hero-orbit" />
                <div aria-hidden="true" className="hero-stage-floor" />

                <div
                  data-hero-step={String(5 + hero.headline.length)}
                  data-hero-product
                  className="absolute bottom-[12%] left-1/2 h-[82%] -translate-x-1/2"
                >
                  <div data-parallax="0.016" className="relative h-full aspect-[560/1488]">
                    <Image
                      src={productImage}
                      alt={`${lang === "ne" ? t.product.name : productName} bottle`}
                      fill
                      priority
                      fetchPriority="high"
                      sizes="(max-width: 1023px) 46vw, 26vw"
                      quality={90}
                      className="product-shadow object-contain object-bottom"
                    />
                  </div>
                </div>

                <div className="hero-surface-list">
                  {(lang === "ne"
                    ? ["मार्बल", "टायल", "ग्रेनाइट"]
                    : ["Marble", "Tile", "Granite"]
                  ).map((name) => (
                    <span key={name}>
                      <span aria-hidden="true">✓</span>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
```

- [ ] **Step 2: Default the hero back to the arch and give the campaign image its new home**

In `src/config/defaults.ts`, change the `hero.image` default from `"/imagery/tmg-campaign.png"` to `""`, and set the `intro.image` default to `"/imagery/tmg-campaign.png"`.

- [ ] **Step 3: Match the admin defaults and explain the field**

In `src/components/admin/SettingsForm.tsx` line 17, change the fallback so an unset hero image stays unset:

```ts
    heroImage: settings.hero.image || "",
```

On line 18, change the intro fallback to the campaign image:

```ts
    introImage: settings.intro.image || "/imagery/tmg-campaign.png",
```

Then add a hint under the hero image input, inside the same `<Field>`, after the `<input />`:

```tsx
<p className="mt-2 text-xs text-muted">Leave blank to show the branded TMG arch with the bottle. Enter a path to replace it with a single photograph.</p>
```

- [ ] **Step 4: Align the saved default**

In `src/app/admin/actions.ts`, in `settingsSchema`, change the `heroImage` default so saving an empty field keeps it empty:

```ts
  heroImage: z.string().trim().max(1000).default(""),
```

and change the `introImage` default to `"/imagery/tmg-campaign.png"`.

- [ ] **Step 5: Verify in the browser**

Load the storefront.

Expected: the hero shows the teal arch with the faded TMG wordmark, the orbit ring, the floor band, the bottle standing on it and the Marble / Tile / Granite chips. The intro section shows the campaign image. Check a phone width too, where `globals.css:220-223` shrinks the stage and the wordmark.

Then in the admin, under Store control center, Page copy and contact, put `/imagery/tmg-campaign.png` into the hero image field, save, and confirm the hero switches to the flat image. Clear it again and confirm the arch returns.

- [ ] **Step 6: Verify the build**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/HeroSection.tsx src/config/defaults.ts src/components/admin/SettingsForm.tsx src/app/admin/actions.ts
git commit -m "feat: restore the arch hero and move the campaign image to the intro" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Done when

- A Kathmandu address is offered valley delivery, badged as chosen for that district, plus pickup, and never outside-valley delivery.
- A Jhapa address is offered outside-valley delivery and never the valley option, and `createOrder` rejects a request that tries to use the valley method for it, because it shares `eligibleDeliveryMethods`.
- Quantities can be changed and lines removed from inside the checkout, and the total follows.
- The hero shows the arch and wordmark again, and the campaign image appears in the intro section.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` all pass.
