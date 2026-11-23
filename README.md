# DeepamVote.in

A two-page, English-language opinion platform for the question of traditional Karthigai Deepam lighting at Thiruparankundram. Home contains voting, aggregate results and fee disclosures. About contains cultural context, privacy, participation terms and the independent-platform disclaimer.

## Local development

Use Node.js 22.18 or newer and npm. From the project root:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Both pages work with an empty environment. You can choose an opinion and inspect the review dialog. Checkout identifies its setup state and cannot collect money. Results use dashes while disconnected, zeroes for a verified empty ledger and a separate message for a connection failure. No sample transactions are seeded.

```sh
npm run typecheck
npm test
npm run build
npm start
```

The stack uses Next.js App Router, TypeScript, Tailwind CSS, a locally owned shadcn-style button built on Radix Slot, Lucide icons, Framer Motion, Zod, Supabase and the Razorpay REST API and hosted Checkout. These are the only public page routes: `/` and `/about`. Privacy and terms are anchored sections on About.

## Connect the test ledger

1. Create a dedicated Supabase test project. Apply [the migration](supabase/migrations/001_participation.sql) once through the SQL editor or your migration pipeline. All four tables have RLS enabled. Anonymous and authenticated roles have no table or RPC permissions.
2. Put the project URL and its server service key in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The REST project URL is `https://<project-ref>.supabase.co` — a `.supabase.com` host does not resolve. Do not put that key in a public variable. The aggregate results endpoint is the public read interface. The private receipt endpoint requires a signed bearer reference.
3. Generate a private 32-byte receipt signing secret with `openssl rand -hex 32` and set `RECEIPT_SECRET`. Keep it stable. Rotating it invalidates previously issued receipt access tokens.
4. In Razorpay Test Mode, create a key pair and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Set `PAYMENT_MODE=test`. Use automatic capture. Set a distinct random `RAZORPAY_WEBHOOK_SECRET` on the server and the matching Razorpay endpoint.
5. Configure an HTTPS webhook pointing to `/api/webhook` on a stable, reachable deployment. Subscribe to **payment.captured** and **payment.failed**. Razorpay cannot deliver webhooks to localhost. For local end-to-end testing use a development HTTPS tunnel or a reachable test deployment.
6. Restart the dev server after editing environment variables. Use Razorpay’s documented test payment instruments. Test-mode aggregate data is always labelled **DEMO DATA — NOT REAL VOTES** and is filtered separately from live orders.

Optional Supabase Auth uses email OTPs on About. To enable it, set the two `NEXT_PUBLIC_SUPABASE_*` variables, enable the email provider, configure SMTP, change the email template to include `{{ .Token }}`, and configure Auth rate limits. Visitors can always vote as guests. The application does not associate an Auth user ID with an opinion or enforce voter identity.

## How confirmation works

- The browser selects YES or NO and reviews the terms. Both choices cost exactly 1,000 paise. The server accepts only a choice and affirmative consent. It sets the amount, currency and terms version.
- A successful order creation records the server-generated UUID, expected amount, opinion and provider order reference **before** returning checkout details. An upstream order that could not be persisted is never presented to the visitor.
- Checkout posts its signed result to `/api/verify`. The server verifies HMAC-SHA256 using the stored provider order ID, fetches the payment from Razorpay and checks the order ID, payment ID, amount, currency and captured status. This endpoint cannot insert a vote.
- The webhook verifies an HMAC over the original body, validates the event and independently fetches a captured payment from Razorpay. It can confirm an order even if the browser closes before its callback. Authorised, pending, cancelled and failed attempts do not increment the ledger.
- The PostgreSQL function locks the order row, deduplicates the event, checks the expected amount and currency, confirms the order and inserts a vote in one transaction. Unique constraints protect both provider payment IDs and votes per order. A late failure cannot downgrade a confirmation. A valid capture after an earlier failed attempt can confirm the order.
- Receipt access requires the local reference and an HMAC token, sent in a POST body. The current tab retains them in session storage to recover across reloads. A receipt shows success only after the transaction commits. If delivery is delayed, check the same receipt again. Reference IDs alone do not grant public access.
- Public statistics poll every 30 seconds while the page is visible. Gross fees count historical confirmed orders × ₹10 before deductions or subsequent refunds. Refunds can be reviewed and issued manually through Razorpay. They do not erase the original captured-order record. Financial settlement amounts are not exposed.
- Separate paid orders may come from the same person. There is no identity-weighted or representative survey claim.

## Deployment on Vercel

1. Import the repository, select the Next.js framework preset, project root as the root directory and a supported Node.js 22+ runtime. Use `npm install` and `npm run build`. Commit the generated npm lockfile once dependencies have been installed and reviewed.
2. Add secrets from `.env.example` in Vercel project settings. Separate Preview and Production databases, payment keys and webhook secrets. Avoid attaching a production service key to untrusted preview branches.
3. Deploy in test mode, register the HTTPS webhook URL with Razorpay and run the acceptance checks below. If deployment protection is enabled, configure an appropriate accessible webhook endpoint. Keep preview/deployment bypass credentials out of URLs shared with visitors.
4. Configure the actual domain and DNS only when you control it. The project name does not register or verify ownership of DeepamVote.in.
5. Before real charges, obtain merchant approval for this paid-opinion use, publish the operator identity and monitored contact email, validate refunds and retention procedures, and review privacy and payment requirements for the operating entity. Set `CONTACT_EMAIL` and switch to a dedicated live database, live keys, live webhook and `PAYMENT_MODE=live` only after approval. The app rejects mismatched key prefixes and requires a contact address for live checkout. Redeploy after changing environment variables.

## Security and operations

- Private server modules use the `server-only` import. The browser receives a Razorpay publishable key, its own order reference and its own receipt capability. The app never asks for or stores a full card number or UPI credential. Razorpay manages its own payment records.
- Sensitive browser POSTs require same-origin JSON, size-limited bodies, Zod validation and a database-backed request budget. Order creation allows 6 requests per 10 minutes per keyed client bucket. Verification and receipt reads have separate limits. The app uses Vercel’s trusted forwarded IP header on Vercel. Other hosting environments share a conservative bucket until a trusted proxy is explicitly configured. Raw IPs are not written to the ledger. Expired buckets are deleted on subsequent requests.
- Protect the signed webhook at the host edge against floods and oversized requests. Only authenticated, recognised events trigger provider lookups. Apply initiating-client bot challenges or Vercel Firewall rules when traffic warrants it. Do not put an interactive challenge on the webhook.
- Keep request bodies, secrets, payment payloads and receipt tokens out of production logs and analytics. Use restricted operator access, Supabase backups, TLS and secret management. Review failed webhook deliveries and reconcile with the Razorpay dashboard. Request a provider webhook retry after correcting delivery failures. Never resolve a missing confirmation by inserting a vote manually.
- The operator handles privacy/deletion enquiries and refund requests through `CONTACT_EMAIL`. Publish entity-specific retention periods before launch. Restrict and retain financial records only as required for reconciliation and applicable law. This repository does not automatically expire accounting records or certify legal compliance.

## Tests

`npm test` runs the Node tests for HMAC verification and capture matching. The SQL integration suite exercises the actual migration, including zero counts, YES/NO aggregation, failed payments, out-of-order events, duplicate events and payments, transactional rollback, rate limiting, private access controls and separation of test/live totals.

Run only against a disposable, **empty** migrated Supabase/PostgreSQL database. With ordinary PostgreSQL, first provision test roles named `anon`, `authenticated`, and `service_role` (BYPASSRLS). Set standard libpq variables such as `PGHOST`, `PGDATABASE` and `PGUSER` to point to that database.

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/001_participation.sql
npm run test:db
```

The test fixture rolls back. Do not reapply the migration to an existing migrated schema.

Before opening checkout, verify on the test deployment:

- Choose each opinion, review the same ₹10 fee, inspect the disclosures and check the agreement. Cancel out using the close button or Escape.
- Exercise a failed or abandoned payment. Check that totals stay unchanged.
- Complete one successful Razorpay test capture. Await the signed webhook, reload the receipt and verify the aggregate increments by one. Redeliver the same event and confirm that counts stay fixed.
- Test the webhook before the browser callback, temporary provider/database failure, and a delayed webhook. A missing configuration or network interruption must not display a confirmed receipt.
- At phone, tablet and desktop widths, check the menu, keyboard radio selection, visible focus, dialog scrolling, result labels and both About links.

## Content and artwork

The hero uses a generated, generic South Indian hill temple and traditional lamps. It is labelled as an illustration. The original reference was a browser-local blob URL, so the written visual brief guided the composition.

Cultural references are [Madurai District’s temple overview](https://madurai.nic.in/tourist-place/thirupparankundram-temple/) and the [Ministry of Tourism festival description](https://www.utsav.gov.in/public/view-event/maha-deepam-festival-thiruvannamalai-1). Payment operations follow [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/) and the [Razorpay security checklist](https://razorpay.com/security/checklist).

The hero asset is [temple-dusk.webp](public/images/temple-dusk.webp), generated with the built-in image tool. Its art direction was a wide dusk panorama with an amber-lit South Indian gopuram, rugged wooded hills, and foreground brass oil lamps, leaving shadowed space for text and the voting card.

<details><summary>Original image-generation prompt</summary>

Wide panoramic cinematic editorial illustration for an Indian festival website hero, full bleed 2.7:1 wide landscape. A monumental intricately carved ancient South Indian hill temple gopuram stands in the middle of the image at x=54%, rising from craggy wooded hills, amber-lit window openings and ornate carved sandstone tiers catching copper sunset light, layered rugged mountains beyond, smoky plum and burnt-orange nightfall sky. In the lower foreground a closeup of several beautiful traditional brass diya oil lamps with real glowing flames at x=52-62%, a trail of small amber lights receding into hills. Left third is dark dusky open mountain sky and shadowed hills with fine texture, right third falls into muted shadow. Rich cinematic photographic detail, exquisite ornate brass texture and luminous orange highlights, deep umber shadows with atmospheric depth, beautiful and evocative, natural composition. Generic imagined location, no readable text, no signage, no graphics, no typography, no watermark.

</details>
