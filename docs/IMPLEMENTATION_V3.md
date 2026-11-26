# Gallermo V3 implementation

[V3.1 handoff](IMPLEMENTATION_V3_1.md) supersedes the local checkout and production launch instructions below.

Baseline `af26c68`. The V3 owner-approved rules supersede V2 operating instructions. Changes are in the working tree for owner review.

## Storefront and checkout

- Responsive WebP hero with matching media-specific preloads and a branded fallback. The category section uses square art, a layered 3D carousel, real links, keyboard navigation, swipe and reduced-motion support. The homepage includes conditional bundles, categories, up to eight prominently labeled products, FAQ and footer.
- Mobile navigation opens on the physical right. Filters start collapsed, mobile sorting applies from a bottom sheet and catalog price ranges work with fully sold-out products. Product detail pages include a frame-chart modal where applicable and bilingual size guidance across 1,789 seeded variants.
- Bilingual FAQ, contact cards, policy drafts and made-to-order notices reflect the approved terms. Social URLs use the exact confirmed formats. External destinations and ownership were outside local verification.
- Shipping is calculated server-side for all 27 governorates. Cairo and Giza are EGP 90. The other 25 are EGP 120. Delivery and production take 4–7 days. The order records the quoted shipping charge.
- Regular carts offer COD and full InstaPay. A cart with any prepayment component offers a deposit or full InstaPay. The deposit is half of the final qualifying merchandise share, rounded up to a piastre. The regular merchandise share and shipping remain part of the delivery balance. The signed quote uses a stable server-only secret. Transfer evidence is reviewed manually.
- Bundle prices are split into integer piastres using the standalone variant price times component quantity as weights. If every component has a zero price, quantity supplies the weights. Whole-cart discounts use charged line totals as weights and are then split within bundles by their allocated component charges. Both steps use largest remainders with line or component order as the tie-break, so allocated deductions exactly match the approved discount. The bundle price already incorporates any bundle discount. Existing sale and variant prices feed the calculation as stored.
- The direct request to port 4000 returned HTTP 503 with `DATABASE_UNAVAILABLE`. The checkout gate uses `CHECKOUT_DISABLED`, and policy inspection has its own validation and access errors. The owner watcher was left running. All order and media-write tests use disposable fixtures.

## Local checkout

To open an isolated replica set and storefront with the catalog populated, run from the repository root.

```powershell
$env:GALLERMO_FIXTURE_PORT='55184'
node apps/api/scripts/serve-fixture.js
```

Open `http://127.0.0.1:55184`. The fixture injects its own database URL and keeps email disabled. Use the fixture for test orders and evidence uploads.

For a persistent local development instance, point `apps/api/.env` at your own local replica set and add these settings. Generate the signing value with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and keep it stable across restarts.

```dotenv
NODE_ENV=development
PORT=4001
CLIENT_ORIGIN=http://localhost:5174
MONGODB_URI=mongodb://127.0.0.1:27017/gallermo_dev?replicaSet=rs0
CHECKOUT_ENABLED=true
CHECKOUT_QUOTE_SECRET=<generated-value>
STORAGE_DRIVER=local
LOCAL_PRIVATE_UPLOADS=true
EMAIL_ENABLED=false
```

For the separate web process use `PORT=5174`, `PUBLIC_SITE_URL=http://localhost:5174`, `API_INTERNAL_URL=http://127.0.0.1:4001`, `NO_INDEX=true`, and if needed a free `GALLERMO_HMR_PORT=24679`. Launch each workspace separately with `npm.cmd run dev -w @gallermo/api` and `npm.cmd run dev -w @gallermo/web`. Preserve the owner's legacy `mongodb://` Atlas connection.

## Gmail SMTP

Set the email variables from `apps/api/.env.production.example` on the API server. Use `gallermostore@gmail.com`, a Gmail app password, and port 465 with `SMTP_SECURE=true` or port 587 with `SMTP_SECURE=false` and required STARTTLS. Leave `EMAIL_ENABLED=false` until configured. Render Free blocks these outbound ports. An SMTP-sending Render service requires paid compute. [Render SMTP policy](https://render.com/articles/can-i-send-email-over-smtp-from-render) · [Google app passwords](https://support.google.com/mail/answer/185833)

```powershell
npm.cmd run email:test -w @gallermo/api -- --to recipient@example.com
```

The test command sends only to the explicitly supplied recipient. Transactional order jobs are deduplicated once per order event and retried up to five times with exponential delays. SMTP delivery is separate from the successful order transaction. Payment screenshots and artwork are absent from email payloads. A process failure after SMTP acceptance can cause a retry with the same message ID.

## Cloudflare R2 and URL migration

Create separate public catalog and private customer buckets. Expose the public catalog through an HTTPS custom media domain. Disable both the public development URL and custom domain on the private bucket. Scope credentials to those buckets, configure the `R2_*` variables on the API, and set `PUBLIC_MEDIA_BASE_URL` on API and SSR. Private objects are streamed after API authorization. For ongoing expiry of unused uploads, run `npm.cmd run uploads:cleanup -w @gallermo/api` as a scheduled job with storage and database settings. [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) · [R2 S3-compatible API](https://developers.cloudflare.com/r2/api/s3/api/)

```powershell
npm.cmd run media:catalog -w @gallermo/api
npm.cmd run media:catalog -w @gallermo/api -- --upload
$env:MEDIA_MIGRATION_MONGODB_URI='<explicit target standard mongodb:// URI>'
npm.cmd run media:catalog -w @gallermo/api -- --migrate media-rollback.json
npm.cmd run media:catalog -w @gallermo/api -- --rollback media-rollback.json
```

Dry run hashes local catalog and approved category media. Upload writes content-addressed keys and verifies checksums and first uploads via the public domain. The migration verifies destination bytes, saves a target-specific rollback manifest, and updates references transactionally only if the prior values still match. Keep the manifest with release records. Existing catalog URLs and objects remain available for rollback. Hero assets travel with the SSR frontend build.

## Deployment checklist

1. Keep `CHECKOUT_ENABLED=false` and `NO_INDEX=true` in production settings. This revision also disables order submission in production at the code level. Launch requires an explicitly reviewed change and owner authorization.
2. Use Node 22 with repository-root `npm ci`. Use a Render web service for the storefront. Build with `npm ci && npm run build`. Start with `npm run start -w @gallermo/web` to serve both Vite bundles through Express. Use a same-region private Render service with `npm run start -w @gallermo/api`. Set the SSR `API_INTERNAL_URL` to the actual Render internal service address and use `/api/ready` on the API. [Render web services](https://render.com/docs/web-services) · [Render private network](https://render.com/docs/private-network)
3. Confirm Atlas TLS, seed-list hosts, replica set, least-privilege service users and narrowly scoped network access. Back up the target database and verify indexes before rollout. [Atlas network access list](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/)
4. Run `npm.cmd run db:indexes -w @gallermo/api -- --verify`. Apply missing indexes explicitly with `--apply` using the approved migration identity. Run `--release-check` with production settings to verify required indexes, a writable replica set, server configuration and authenticated access to both R2 buckets.
5. Verify the public CDN byte-for-byte, private upload authorization and denied anonymous access. Check secure cookies, exact origin configuration, rate limiting behind the proxy, CSP, and bypass Cloudflare caching for HTML and API responses. Cache immutable public assets. Use an explicit recipient for the Gmail delivery smoke test.
6. Obtain legal approval for the bilingual drafts, including privacy retention/deletion, processor disclosures and any mandatory terms. Confirm launch authorization and all infrastructure checks before changing checkout or indexing.

## Verification and remaining checks

- API regression on disposable MongoDB replica sets passed (33 tests). Covered idempotency, transactional inventory and coupon release, both shipping zones, regular COD, full InstaPay, required deposit, zero deposit after full discount, mixed-bundle allocation, discount reconciliation, typed policy failures, private asset isolation, legacy snapshots, mocked email retry and mocked R2.
- Catalog seed verified at 336 products, 1,789 variants and eight categories with seven published. Nine new WebP images and the existing chart passed Sharp validation. Dry run validated 343 distinct upload sources.
- React Router updated to 7.18.7 and tested in the existing declarative BrowserRouter and StaticRouter setup. This picks up fixes for the published advisories affecting v6, including the redirect bypass. Dependency audit reported zero vulnerabilities. [React Router advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6)
- The production build and all 10 Playwright tests passed. Testing covered English and Arabic, light and dark, mobile widths from 320 to 440 px, and desktop at 1440 px. Five representative screenshots are under `test-results/production`.
- The representative mobile Lighthouse run scored 76 performance, 100 accessibility, 100 best practices and 69 SEO with staging indexing disabled. Simulated LCP was 7.0 s with CLS 0. The results prompted production compression and an explicitly high-priority hero preload. A follow-up browser smoke test verified gzip and the high-priority preload. The Lighthouse score predates those changes. [Lighthouse result](../test-results/lighthouse-v3.json)
- Index verification and idempotent application passed against a disposable replica set.
- Live Gmail, R2, Atlas write/index migration and production rollout remain unverified. No owner database writes, real email, commit, push or deployment were performed.

## Git status

HEAD is `af26c68`. The index is clean. The working tree contains 34 modified tracked files and 15 untracked entries, including the two owner-supplied image directories. Changes cover the API and storefront, fixture tests, lockfile, environment examples, release scripts and this handoff. The catalog seed and existing catalog artwork have no Git changes. Test outputs are ignored.
