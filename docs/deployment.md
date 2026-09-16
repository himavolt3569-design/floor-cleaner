# Deploying to Vercel

The Next.js app runs on Vercel. Firebase stays where it is and keeps doing what
it already does — Firestore, Auth, Storage and the Cloud Functions in
`functions/` are unaffected by this and are deployed separately with the
Firebase CLI. Vercel only hosts the front end and its server routes.

`vercel.ts` in the repo root carries the project configuration. Everything else
Vercel detects on its own.

## 1. Create the project

Import `himavolt3569-design/floor-cleaner` from the Vercel dashboard, or link
an existing project from this directory:

```bash
npm i -g vercel
```

```bash
vercel link
```

Leave the root directory as the repository root and let Vercel detect Next.js.
`vercel.ts` overrides the build and install commands so that pnpm is used with a
frozen lockfile.

## 2. Environment variables

Every variable below has to exist in **all three** Vercel environments
(production, preview, development) before the first build, because the
`NEXT_PUBLIC_*` ones are inlined at build time and a missing one produces a
site that builds successfully and then fails in the browser.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | build | Canonical origin. Feeds the sitemap, robots and OG tags, so it must differ per environment — production gets the real domain, preview gets the preview URL. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | build | Firebase web config. Public by design. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | build | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | build | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | build | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | build | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | build | |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | build | Analytics. Optional; omit it and analytics stays off. |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` | build | reCAPTCHA site key. Optional, but see App Check below. |
| `FIREBASE_PROJECT_ID` | runtime | Admin SDK. |
| `FIREBASE_CLIENT_EMAIL` | runtime | Admin SDK service account. |
| `FIREBASE_PRIVATE_KEY` | runtime | **Secret.** See below. |
| `FIREBASE_STORAGE_BUCKET` | runtime | |
| `GEOCODING_REVERSE_URL` | runtime | Optional. Defaults to public Nominatim; see below. |

### The private key

`FIREBASE_PRIVATE_KEY` is the one that reliably goes wrong. The value in the
service-account JSON contains real newlines; the value in an environment
variable has to contain the two-character sequence `\n` instead, wrapped in
double quotes, exactly as `.env.example` shows. Paste it into the Vercel
dashboard rather than piping it through a shell, which will otherwise eat the
backslashes.

The service-account JSON sitting in the repo root is gitignored and must never
be committed or uploaded to Vercel as a file. Only the three values from it
(`project_id`, `client_email`, `private_key`) belong in environment variables.

### Pulling them back down

```bash
vercel env pull .env.local
```

## 3. Firebase settings that have to change

Deploying to a new origin breaks two things until they are updated in the
Firebase console:

- **Authorized domains** (Authentication → Settings → Authorized domains) must
  include the production domain and `*.vercel.app`, or admin sign-in fails.
- **Storage CORS** must allow the new origin, or admin uploads and payment-proof
  uploads fail from the browser.

If App Check is enforced, register the new domain there too, otherwise every
Firestore read from the browser is rejected.

## 4. Region

`vercel.ts` pins functions to `bom1` (Mumbai). Each page render makes several
Firestore round trips, so the function should sit next to the database rather
than next to the user. If the Firestore database is not in `asia-south1`, change
the region to match it — that hop dominates TTFB far more than the user's
distance to the edge.

## 5. Turn off the Vercel Toolbar on previews

This is not optional here. `src/proxy.ts` sends a strict
`script-src 'self' 'nonce-…' 'strict-dynamic'`. The toolbar injects its own
scripts into preview deployments without that nonce, and `'strict-dynamic'`
disables host allowlisting, so there is no header you can add to permit them —
they will be blocked and the console will fill with CSP violations.

Disable it under Project Settings → Toolbar. The same applies to Vercel Web
Analytics and Speed Insights: if you want either, install the npm package and
render its component so the script is part of the app and inherits the nonce,
rather than letting the platform inject it.

## 6. Deploy

```bash
vercel
```

Verify the preview, then promote the exact artifact you verified rather than
rebuilding:

```bash
vercel promote <preview-url>
```

## After the first production deploy

- `pnpm seed` writes the bundled defaults into Firestore. Run it against the
  production project once, or the storefront comes up empty — payment and
  delivery methods no longer fall back to the seeded defaults when their
  collections are empty.
- `pnpm grant-admin <email>` for whoever needs the dashboard.
- Check `vercel logs <url> --level error` before handing the URL to anyone.

## Known caveats

- **Reverse geocoding** defaults to the public Nominatim instance, whose usage
  policy does not cover commercial traffic at volume. The route already gates
  itself to one request per second globally, but a paid geocoder set through
  `GEOCODING_REVERSE_URL` is the right answer before this sees real traffic.
- **Image optimization is open to any host.** `next.config.ts` ends its
  `remotePatterns` with `hostname: "**"` over both http and https, which lets
  anyone use the deployment as an image proxy and bill the optimization to this
  project. Narrow it to the Firebase Storage hosts before the site is public.
