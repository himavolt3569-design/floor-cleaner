# Order lifecycle, tracking, verification and partner integration

Date: 2026-09-16
Status: approved design, ready for implementation planning

## Problem

The storefront can take an order. After that, nothing happens that either the
customer or the business can see or control:

- A valley address matches both the `valley` and the `outside` delivery method,
  because `outside` has empty `provinces`/`districts`, which means "everywhere".
  The customer is asked to choose between two options they cannot distinguish,
  and can pick the wrong one.
- There is no way for a customer to see an order again once the modal closes.
- There is no way for a customer to cancel, so the only cancellation channel is
  refusing the parcel at the door, which costs a courier fee.
- `updateOrderStatus` writes `orderStatus: "cancelled"` and nothing else, so a
  cancelled order silently keeps its stock decrement. Inventory drifts down on
  every cancellation.
- Nothing proves a phone number is real, so cash-on-delivery orders carry the
  full cost of a fake address.
- Couriers are assigned by hand, failed deliveries have nowhere to record a
  reason, and courier and payment provider credentials have nowhere to live.

## Goals

1. One delivery option per address, decided by the address, with pickup always
   available as an explicit alternative.
2. An order lifecycle that is a real state machine, shared by every actor, that
   cannot lose stock or skip its audit trail.
3. Customer-visible order tracking and self-service cancellation without any
   account creation.
4. Phone verification that costs nothing on the Firebase Spark plan and never
   blocks a sale when it is unavailable.
5. Automatic courier assignment on arrival, and a recorded reason for every
   failed delivery.
6. Encrypted storage for courier and payment merchant credentials, entered by
   the super admin and never readable from a browser.

## Non-goals

- No card payments, and no payment gateway integration beyond storing credentials.
- No automated refunds. A refund is recorded as a status; money is moved by hand.
- No customer accounts, passwords, or profile pages.
- No courier API calls. Auto-assignment is internal attribution only; pushing a
  consignment to a courier's API is later work that the credential vault exists
  to make possible.

## Decisions taken

| Question | Decision |
|---|---|
| Verification transport | Firebase Auth phone OTP only. No third-party SMS vendor. |
| Cancellation cutoff | Free self-cancel until dispatch; a request requiring admin approval afterwards. |
| Accountless identity | httpOnly cookie token only. No OTP recovery, no IP matching. |
| Courier auto-assign | District service areas with priority, then a configured default courier. |

IP addresses are recorded on the order for fraud triage only, as they already
are, and are never used to decide what to show anyone. Shared carrier NAT makes
IP-based history a privacy breach rather than a feature.

## 1. Order status machine

New module: `src/lib/commerce/order-status.ts`.

```ts
export type OrderStatus =
  | "pending" | "confirmed" | "processing" | "packed"
  | "out_for_delivery" | "delivery_failed" | "delivered"
  | "cancellation_requested" | "cancelled" | "returned";
```

Transition table, keyed by the status being left:

| From | To | Allowed actors |
|---|---|---|
| pending | confirmed, processing, cancelled | admin; customer may cancel |
| confirmed | processing, packed, cancelled | admin; customer may cancel |
| processing | packed, cancelled | admin; customer may cancel |
| packed | out_for_delivery, cancelled | admin; customer may cancel |
| out_for_delivery | delivered, delivery_failed, cancellation_requested | admin; customer may request |
| delivery_failed | out_for_delivery, returned, cancellation_requested, cancelled | admin; customer may request |
| cancellation_requested | cancelled, out_for_delivery, delivered | admin only |
| delivered, cancelled, returned | terminal | nobody |

`applyOrderTransition(input)` is the only writer of `orderStatus` anywhere in
the codebase. It runs one Firestore transaction that:

1. reads the order and rejects an illegal or unauthorised move,
2. restores variant stock when entering `cancelled` or `returned`, guarded by
   `stockRestoredAt` so a retry cannot restock twice,
3. refuses to cancel an order that has `partnerEntries` recorded against it,
   because that money is already reconciled,
4. sets `paymentStatus` to `refunded` when cancelling an order that was `paid`,
5. appends an `orderEvents` document describing the move and its actor.

Admin actions, the customer cancel route and the delivery-failure action all
call this function. That is what merges the customer, courier and service paths:
there is no second code path that can skip restocking or auditing.

## 2. Delivery auto-selection

New module: `src/lib/commerce/service-zone.ts`.

```ts
export type ServiceZone = "valley" | "outside_valley" | "anywhere";
export function zoneForDistrict(district: string): "valley" | "outside_valley";
export function zoneOfMethod(method: DeliveryMethod): ServiceZone;
```

`zoneForDistrict` uses the existing `KATHMANDU_VALLEY_DISTRICTS`. A method's
zone comes from its `kind`: `valley` and `same_day` are valley, `outside_valley`
is outside, `home` and `pickup` are anywhere.

`eligibleDeliveryMethods` gains a zone filter: a method whose zone disagrees
with the address district is removed, rather than shown and left to the
customer. `/api/checkout/quote` returns `recommendedId`, the lowest `sortOrder`
eligible method that is not pickup. The checkout preselects it and renders it as
a decided fact, for example "Selected for Kathmandu", with pickup offered beside
it. When pickup is the only eligible method, `recommendedId` is null and pickup
is preselected instead; when nothing at all is eligible, the existing "we do not
deliver to that area" message stands.

`createOrder` applies the same filter, so a crafted request cannot buy valley
pricing for an outside-valley address.

## 3. Customer identity and tracking

Cookie `__tmg_customer`: httpOnly, `secure` in production, `sameSite=lax`,
`path=/`, 180 days, value is 32 random bytes base64url. Written by the order
route on first order. Orders store it as `customerKey`.

Each order also gets a `trackingToken`, 32 random bytes returned to the browser
exactly once, of which only the SHA-256 hash is stored, in `trackingTokenHash`.
Comparison is timing-safe.

Pages:

- `/track` — server component. Reads the cookie, lists that browser's orders,
  and offers a lookup form for a customer who lost the cookie.
- `/track/[orderNumber]` — status timeline from `orderEvents` filtered to
  customer-safe event types, the delivery estimate, and the cancel control.

Access to a single order is granted by any one of: the `customerKey` cookie
matching, a valid `trackingToken` in the URL, or a successful lookup.

`POST /api/track/lookup` takes an order number plus a mobile number, and is rate
limited to 5 per hour per IP so the order number space cannot be walked. On
success it sets a short-lived scope cookie for that one order.

Every response is a trimmed projection built in `src/lib/data/tracking.ts`. The
`meta` block holding IP and user agent is never included, and neither is any
other order.

Firestore index required: `orders` on `customerKey` ascending, `createdAt`
descending.

## 4. Phone verification

Client: `signInWithPhoneNumber` from the Firebase web SDK with an invisible
`RecaptchaVerifier`, mounted in the checkout modal after the address step. The
number is sent as `+977` followed by the normalised national number that
`normalizeNepaliMobile` already produces.

Server: `POST /api/checkout/verify` receives the resulting ID token, verifies it
with the Admin SDK, asserts its `phone_number` equals the mobile on the address,
and writes `phoneVerifications/{id}` with a 15 minute expiry. `createOrder`
consumes that record and sets `phoneVerified`. The client signs the temporary
Firebase user out immediately; it exists only to prove possession of the number.

Policy lives in site settings as `verificationPolicy`, one of `off`, `cod_only`
or `all`, defaulting to `cod_only`.

Degradation is deliberate and required. When reCAPTCHA fails, the SMS quota is
exhausted, or the message never arrives, the order is still accepted and written
with `phoneVerified: false`. Admin gets an "Unverified" filter and calls those
customers back. Verification must never cost a sale.

CSP change in `src/proxy.ts`: add `https://www.google.com` to `frame-src` for
the reCAPTCHA challenge frame.

## 5. Cancellation

While the order is `pending`, `confirmed`, `processing` or `packed`, the
customer cancels directly from the tracking page and the transition happens
immediately, restoring stock.

From `out_for_delivery` or `delivery_failed`, the control becomes "Request
cancellation": the order moves to `cancellation_requested` with the customer's
reason, and appears under a new admin filter. The admin approves, which cancels
and restocks, or refuses, which returns the order to `out_for_delivery` with a
note. The courier is already carrying the parcel at that point, which is exactly
why a human decides.

`POST /api/orders/cancel` carries the order id and the proof of ownership
described in section 3, enforces same-origin, and is rate limited.

A cancelled order that had been paid moves `paymentStatus` to `refunded` and is
listed for manual settlement. Nothing in this system moves money.

## 6. Auto-assignment and delivery failure

`Partner` gains `serviceDistricts: string[]`, `priority: number` and
`isDefaultCourier: boolean`.

`src/lib/partners/assignment.ts` exports `selectCourier(partners, district)`:
active couriers whose `serviceDistricts` include the district, sorted by
`priority` then name, first match wins; otherwise the partner flagged
`isDefaultCourier`; otherwise null. Orders using a `pickup` delivery method are
never assigned. A null result sets `needsAssignment: true` and flags the order in
the admin list.

Assignment runs inside the order-creation transaction and writes a
`courier_auto_assigned` event. The existing `assignOrderPartners` action remains
the manual override.

Failures: `recordDeliveryFailure(orderId, reason, note)` moves the order to
`delivery_failed`, increments `deliveryAttempts`, and stores the reason. Reasons
are a fixed enum — `customer_unreachable`, `address_not_found`,
`customer_refused`, `payment_not_ready`, `rescheduled_by_customer`,
`area_not_serviced`, `damaged_in_transit`, `other` — plus a free-text note. From
`delivery_failed` the admin either retries or marks the parcel returned.

## 7. Merchant credentials

New module: `src/lib/security/secrets.ts`.

```ts
export function encryptSecret(plain: string): string;   // v1.<iv>.<tag>.<ciphertext>, base64url
export function decryptSecret(payload: string): string;
export function maskSecret(plain: string): string;      // last four characters only
export function credentialsAvailable(): boolean;
```

AES-256-GCM with a key read from a new `CREDENTIALS_ENCRYPTION_KEY` environment
variable, 32 bytes base64. When the variable is absent the credential UI is
disabled with an explicit message. There is no plaintext fallback, ever.

Stored in `partnerCredentials/{partnerId}` and `paymentCredentials/{methodId}`,
both denied to every client in `firestore.rules`, reachable only through the
Admin SDK.

`src/config/integrations.ts` declares the fields per provider: a courier gets
base URL, client id, API key and account code; eSewa gets a merchant code and
secret key; Khalti gets a secret key; Fonepay gets a merchant code and secret
key. Each field is marked secret or not.

Admin UI rules: a secret field is write-only. A stored secret renders as four
bullets followed by its last four characters, beside a Replace button, and its
plaintext is never sent to the browser under any circumstance. Saving records a
`credentials_updated` event listing the field names that changed and no values.

## 8. Storefront corrections

- **Checkout cart editing.** `OrderSummary` gains an `editable` mode with
  quantity steppers and a remove control bound to the cart store. Changing a
  quantity re-quotes. Removing the last line shows the existing empty state.
  The add-to-cart buttons keep accumulating, which is correct for a shop, but
  now open the cart drawer so the change is visible as it happens.
- **Hero.** Restore the arch stage, TMG wordmark and bottle composition from
  commit 7515de8. Its CSS is still present in `globals.css` and unused. The
  campaign image moves to the Intro section as the default for
  `settings.intro.image`.

## Data model summary

New fields on `orders`: `customerKey`, `trackingTokenHash`, `phoneVerified`,
`phoneVerifiedAt`, `deliveryAttempts`, `lastFailureReason`, `lastFailureNote`,
`cancellation` (state, requestedBy, reason, decidedBy, decidedAt),
`stockRestoredAt`, `needsAssignment`.

New collections: `phoneVerifications`, `partnerCredentials`, `paymentCredentials`.
All three are denied to every client in `firestore.rules`.

New site setting: `verificationPolicy`.

New environment variable: `CREDENTIALS_ENCRYPTION_KEY`, documented in
`.env.example`.

Existing orders have none of these fields. Every read path defaults them, so no
backfill migration is required.

## Phases

| Phase | Contents | Depends on |
|---|---|---|
| 1 | Hero restore, checkout cart editing, delivery auto-selection | — |
| 2 | Status machine, stock restoration, delivery failure reasons, admin cancellation | — |
| 3 | Cookie identity, `/track` pages, customer cancel and request | 2 |
| 4 | Phone OTP and verification policy | 3 |
| 5 | Courier auto-assignment and the credentials vault | 2 |

Each phase leaves the application working and deployable.

## Testing

The repository has no test runner. This design adds `vitest` for pure logic
only, because the modules that carry the risk are pure functions:

- `order-status.ts` — every legal and illegal transition, per actor.
- `service-zone.ts` — valley and non-valley districts, every method kind.
- `assignment.ts` — priority ordering, default fallback, no match, pickup.
- `secrets.ts` — encrypt and decrypt round trip, tampered payload rejection, and
  that a missing key disables the feature rather than degrading it.

Everything with a Firestore transaction in it is verified by running the flow
against the dev server: place an order, cancel it, confirm stock returns to its
previous value and that exactly one `orderEvents` record is written.

Per phase, `pnpm typecheck` and `pnpm lint` must pass, and the storefront and
admin flows that phase touches are exercised in the browser.

## Risks

- **Spark SMS quota.** Firebase's free phone-auth allowance is small and Nepali
  deliverability through it is unproven. This is why the policy defaults to cash
  on delivery only, and why failure never blocks an order. If the quota proves
  unusable in practice, the verification module is the single place a Nepali SMS
  gateway would be substituted, and the credential vault from phase 5 is where
  its keys would live.
- **Cookie loss.** A customer who clears data or changes device loses their
  history and falls back to order number plus mobile lookup. Accepted, as the
  alternative was an account.
- **reCAPTCHA under strict CSP.** The site runs `strict-dynamic`, so the
  challenge frame needs the `frame-src` addition above. This must be checked in
  a production build, not only in development.
