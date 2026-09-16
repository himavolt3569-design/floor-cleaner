# TMG Cleaner

One-page storefront and admin dashboard for TMG Cleaner, a marble, tile and
granite cleaner sold in Nepal.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind
CSS v4, Firebase, GSAP and Lenis.

---

## Running it

```bash
pnpm install
pnpm dev
```

The storefront works immediately with no configuration. Until Firebase is set
up it renders from the bundled defaults in `src/config/defaults.ts`, so you can
see and review the whole design straight away. Orders cannot be placed until
Firebase is connected, and the checkout says so plainly rather than failing
silently.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm seed` | Write the bundled defaults into Firestore |
| `pnpm grant-admin <email>` | Give an account admin access |
| `node scripts/e2e.mjs` | Purchase-flow smoke test |
| `pnpm shot --w 1440` | Screenshot the page for design review |

---

## Connecting Firebase

1. Create a Firebase project and enable **Firestore**, **Storage**, and
   **Authentication** with the Email/Password provider.
2. Copy `.env.example` to `.env.local` and fill it in. The file explains where
   each value comes from and which ones are secret.
3. Push the security rules and indexes:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

4. Seed the catalogue and configuration:

   ```bash
   pnpm seed
   ```

5. Create a staff user in the Firebase console (Authentication > Add user),
   then grant it admin access:

   ```bash
   pnpm grant-admin you@example.com
   ```

6. Sign in at `/admin`.

> **Before going live**, set prices and stock on the Products page. The seeded
> prices (Rs. 450 / Rs. 750 / Rs. 3,200) are placeholders, not the business's
> real prices.

---

## Deploying

The app runs on Vercel; Firebase keeps serving the data, auth, storage and the
Cloud Functions in `functions/`. `vercel.ts` holds the project configuration.

```bash
vercel
```

The first deploy needs environment variables in place, the new origin added to
Firebase's authorized domains, and the Vercel Toolbar switched off so it does
not trip the CSP. [`docs/deployment.md`](docs/deployment.md) walks through all
of it.

---

## How money is handled

This is the part worth reading carefully.

**The browser never decides what anything costs.** It sends product ids,
variant ids and quantities. Everything else is computed on the server:

- `src/lib/commerce/pricing.ts` reads authoritative prices from Firestore.
- `src/lib/commerce/orders.ts` re-reads prices *and stock inside the Firestore
  transaction* that writes the order, so a cart priced ten minutes ago cannot
  lock in a stale price, and two customers racing for the last bottle cannot
  both win it.
- Delivery fees, free-delivery thresholds and minimum order values are
  recalculated server side and re-checked against the address at order time.

**A customer can never mark an order paid.** Pressing "I have paid" on a QR
payment records a *claim*: the order moves to `pending_verification` and a human
confirms it on the Orders page. The only code path that writes `paid` is an
admin action, and it is audited.

**Order totals are integers.** Every monetary value is a whole number of paisa
named `*Minor`. No float arithmetic touches a total.

---

## Security

| Layer | What it does |
| --- | --- |
| `src/proxy.ts` | Per-request CSP nonce, HSTS, frame denial, referrer and permissions policy, no-store on admin |
| `firestore.rules` | Deny by default. No client writes anywhere. Orders are not client readable at all |
| `storage.rules` | Payment screenshots are write-once, staff-read-only, type and size capped |
| `src/lib/auth/session.ts` | httpOnly, SameSite=Strict Firebase session cookie, `superAdmin` custom claim, revocation checked on every request |
| `src/lib/utils/request-guard.ts` | Same-origin enforcement, Firestore-backed rate limiting, idempotency keys |
| `src/lib/validation/schemas.ts` | One zod schema set, re-parsed server side on every request |
| App Check | Attests that Firebase traffic comes from your site |

A few specifics worth knowing:

- **`proxy.ts` is not the authorisation boundary.** It only checks that a
  session cookie exists, so the redirect is fast. The real check runs in
  `src/app/admin/(dashboard)/layout.tsx` and again inside every admin action.
- **CSP uses a nonce for scripts and `unsafe-inline` for styles.** Script
  injection is the execution vector and is strictly nonced with
  `strict-dynamic`. Nonce-ing styles would mean auditing every server-rendered
  `style` attribute React emits, for no security gain, so that trade is
  deliberate and documented in `proxy.ts`.
- **Payment screenshots are never public.** The admin reads them through signed
  URLs that expire in fifteen minutes.
- **Order ids are not secrets on their own.** Attaching payment evidence
  requires the order number too.
- **The `payment-proofs/` path allows create but not update or delete**, so an
  uploaded screenshot cannot be swapped after staff have seen it.

---

## Structure

```
src/
  app/
    page.tsx                  the one-page storefront
    admin/                    protected dashboard
    api/                      checkout quote, orders, payment proof, session
    proxy.ts                  (at src/proxy.ts) security headers and admin gate
  components/
    layout/ sections/ commerce/ checkout/ motion/ ui/ admin/
  lib/
    commerce/                 pricing and order creation, server only
    firebase/                 client and admin SDK setup
    auth/ validation/ store/ utils/ data/
  config/
    defaults.ts               seed content and copy
    nepal.ts                  provinces, districts, mobile validation
functions/                    optional Cloud Functions (webhook, cleanup)
```

### Where the content comes from

`src/lib/data/storefront.ts` reads Firestore and falls back to the bundled
defaults field by field. A half-seeded project renders correctly rather than
throwing. Once Firestore has data it is the only source of truth.

---

## Payments and delivery

Both are configured entirely from the admin. Nothing is hard coded.

- **Cash on delivery** and **QR payment** are enabled by default.
- **Bank transfer** is configured but switched off.
- **eSewa, Khalti and Fonepay** are present but cannot be enabled until their
  server credentials exist. This is deliberate: a customer must never be able to
  select a method that has no way to take their money. The admin explains why
  the toggle is locked.

To add a real gateway you need server-side initialise and verify calls plus a
webhook. `functions/src/index.ts` contains a working, signature-verifying
webhook skeleton that checks the amount against the stored order total and is
safe to replay. Never trust a redirect or query parameter as proof of payment.

Delivery options are filtered by the customer's province and district, so the
checkout only ever offers what actually serves that address.

---

## Typography

**Poppins carries the entire site** — display headings, interface and body.
Weights 300 to 700 are loaded and self-hosted by `next/font`, so there is no
request to Google at runtime and no layout shift.

With one typeface doing every job, hierarchy has to come from size, weight and
tracking rather than from contrasting faces:

| Token | Size | Weight | Tracking |
| --- | --- | --- | --- |
| `display-hero` | clamp(2.25rem, 5vw, 4.5rem) | 600 | -0.038em |
| `display-section` | clamp(1.75rem, 3.7vw, 3.25rem) | 600 | -0.032em |
| `display-sub` | clamp(1.125rem, 1.8vw, 1.5rem) | 600 | -0.022em |
| `eyebrow` | 0.6875rem | 600 | +0.18em, uppercase |
| body | 1rem / 1.65 | 400 | normal |

Poppins is geometric and runs wide, so display sizes carry noticeably negative
tracking; without it the large headings read loose and soft. The `TMG` wordmark
leans the other way on both axes (700 weight, -0.055em) so the logo still
separates itself from the copy around it.

---

## Motion

One client component, `src/components/motion/MotionProvider.tsx`, owns GSAP,
ScrollTrigger and Lenis. Sections stay server components and just mark elements
with `data-reveal`, `data-hero-step` and `data-parallax`.

The page is designed to be complete without any of it. Reveal styles are scoped
to `.js`, so with JavaScript disabled everything renders in its final state, and
`prefers-reduced-motion` short-circuits the whole provider.

---

## Assets

Product and result photography in `public/` was cut from the artwork supplied by
the business (`Images/`). The before and after photographs are the business's
own; nothing has been simulated or retouched to exaggerate a result.

Two surfaces the product covers, **floors** and **driveways**, have no supplied
photography. Rather than substituting stock imagery, they are presented as
typographic blocks. Adding real photographs of either is a content change, not a
code change.

---

## What the admin can change

Everything the storefront shows, without touching code:

| Page | Controls |
| --- | --- |
| Orders | Fulfilment status, payment verification, payment references and screenshots |
| Products | Prices, stock, size labels, availability, product photography |
| Payments | Which methods are offered, QR code image, account details, instructions |
| Delivery | Options, fees, estimates, provinces and districts served, free-delivery thresholds |
| Content | Benefits, how-to-use steps, surfaces and their photographs, FAQs |
| Settings | Announcement bar, hero copy, introduction, Why TMG, manufacturer usage note, contact details |

---

## Known gaps

- Prices, phone number, email and address are placeholders until set in the
  admin.
- `/privacy` and `/terms` describe how the site actually handles data, and are
  accurate, but should be reviewed by someone qualified before launch and
  extended with the business's own returns and refund policy.
- No payment gateway is wired to a live account. Cash on delivery and manual QR
  work end to end today.
