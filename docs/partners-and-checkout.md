# Store control center and partners

All storefront editors are under `/admin/content`: page copy/contact, labels/translations, products/images, delivery, payments and editorial content. Old editor URLs redirect to the matching tab. Every page and write verifies the existing Firebase superadmin session.

## Companies and reporting

`/admin/partners` manages marketplaces (Daraz), couriers (Pathao or any other courier), distributors and other companies. Add real companies before assigning them; none are connected or seeded automatically. Connections are **manual**, as requested.

- Assign a courier to a delivery method in the control center. New checkout orders inherit `courierPartnerId` on the server.
- Assign a sales company and/or courier to an existing order in Partners. External order references and tracking numbers are stored on the order.
- The append-only `partnerEntries` ledger records company-held stock, external sales/returns, customer collections, fees, refunds and remittances. Use integer paisa in JSON imports; the form accepts NPR.
- External sales consume company-held inventory, not the store warehouse. Website checkout consumes store warehouse inventory and appears separately in company reports. Do not re-enter website orders as external sales. Stock allocations record the company statement; adjust the store's physical warehouse stock separately when transferring stock to a company.
- Money held = collections − remittances − fees − refunds. Marking a website order paid does not imply the company has remitted that money. Record the collection and the remittance separately.
- Dates on manual entries are Nepal calendar dates. Website order date filtering uses creation date in Asia/Kathmandu and its current status. Date-filtered totals and all-time balances are labeled separately.
- CSV exports include transactions and linked orders. CSV cells neutralize spreadsheet formulas. JSON imports support 1–100 entries per company, atomically; duplicate company/type/reference/SKU combinations are rejected. Imports and writes are audited.
- `partners` and `partnerEntries` are accessible only through the authenticated server. Existing Firestore catch-all rules deny direct client access. No rules deployment is needed for these server-only collections.

## Future API connections

The typed boundary is `src/lib/partners/integration.ts`. Add provider-specific adapters only after the merchant account and supported API are confirmed. Store credentials only in server secret/environment storage. Verify webhook signatures; normalize provider events into the ledger schema, preserve original external references, validate amounts/stock, and retain idempotency and audit behavior. Add durable sync cursors and retries before enabling unattended sync. Do not expose a generic arbitrary URL fetch endpoint or claim a live connection until its authenticated handshake succeeds.

## Checkout location

The location button requests browser permission, then reverse-geocodes through `/api/checkout/location`. All fields remain manually editable; missing or uncertain fields are not guessed. Changing province/district clears dependent address fields and invalidates delivery choices. Old quote requests are aborted.

The default provider is Nominatim, with per-client limiting and a Firestore-backed global rolling gate allowing at most one upstream request per 1.1 seconds. Only coordinates go upstream; names and phone numbers do not. Responses are not cached publicly, and coordinates are not stored in orders. `GEOCODING_REVERSE_URL` can switch to a compatible hosted provider; attribution must be updated if the provider requires it. Browser geolocation requires HTTPS in deployment (localhost is supported).

References: [Nominatim reverse API](https://nominatim.org/release-docs/develop/api/Reverse/) and [usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Imagery

Built-in image generation produced `public/imagery/marble-interior.png`, `granite-detail.png`, and `tile-interior.png`; the supplied campaign image is `tmg-campaign.png`. Surface imagery is labeled illustrative. Existing before/after media was preserved rather than replaced with invented proof of cleaning performance.

Prompts: (1) crisp architectural interior with polished white marble floor, granite island and pale tile, natural daylight; (2) tack-sharp black/grey granite countertop detail in natural daylight; (3) crisp ivory porcelain bathroom floor, precise grout lines, white bathtub and blue towel. All requested landscape 1536×1024, no people, products, lettering, logos or watermarks, and no foreground surface blur.
