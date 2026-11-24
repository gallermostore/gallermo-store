# Gallermo v2 implementation report

24 November 2026

## Scope and baseline

Implementation is in the existing Gallermo worktree on `main`, based on `82f556e`. The configured upstream is `origin/main` at the Gallermo Store repository. Tap & Wrap’s local `main` was inspected read-only at `59651b89590b4bf664d221e6e7486c62581042a4`. Its shop, filter drawer, pagination, header, footer, product card, loading, FAQ, and payment workflow tests informed interaction and lifecycle choices. The hosted WAM Banana Figure URL did not load through the research tool. The local WAM product page and gallery at `23487d90c1ab4aa79efe6c24c0c1e7ab34458b2c` supplied the gallery, purchase column, and related-product layout reference.

The seed still has 336 products and unique design images, 1,789 variants, and eight category records with seven published. The unpublished coasters record stays unpublished. The seed and tracked catalog assets have no diff. Category flags default to false for existing documents on read and new categories on create. Existing categories do not require a backfill. New orders store policy, payment, inventory, and upload snapshots. Older orders keep their historical values. No owner database writes, reseed, GitHub push, deployment, or production checkout activation were performed.

## Runtime findings

- With the previously running local stack, health returned 200 from both `localhost:4000` and `127.0.0.1:4000`. A synthetic unknown account with the expected Origin returned 401 directly in 314 ms and through port 5173 in 1,107 ms. The historical login 504 did not reproduce. A later public read-only catalog probe on the existing API returned 503 for catalog, categories, bundles and bestsellers. The owner database counts were therefore not re-audited. Fixture data and the source seed are the evidence for the catalog counts.
- The original startup and build failed under the hosted Windows sandbox when esbuild’s Vite config bundler tried to enumerate a parent directory. Vite’s runner config loader fixed that build failure. The first revised run on the default ports encountered existing listeners on 4000, 5173, and the Vite WebSocket port. Separate fixture ports avoided the collisions. Development browser runs required access outside the directory-enumeration restriction for Vite’s client dependency optimization.
- The original HTML lacked a stylesheet link in development. The route now renders CSS before hydration. Production emits a hashed stylesheet. Server-readable preferences drive the first HTML. A same-origin head script migrates allowed legacy values. BrowserRouter and StaticRouter use the React Router 6 future flags applicable to each.
- API liveness is separate from readiness. Database, proxy and browser requests have bounded timeouts. The client distinguishes unavailability from a guest session, a missing resource, and empty results. Auth responses and private data are marked no-store. Public catalog reads do not look up a user session. Existing origin validation and HTTP-only cookie controls remain in place.

## What changed

| Area | Implementation |
| --- | --- |
| Storefront and presentation | Physical-left mobile drawer with native top-layer dialog, burgundy/gold layers, keyboard dismissal, scroll locking and role-specific links. Centered mobile logo, regular desktop navigation, contained product imagery, directional category carousel, eight-product showcase when eight eligible products exist, categorized FAQ, contact footer, and bilingual draft information pages. |
| Shop and detail | URL-driven search and sort, bilingual catalog matching, draft filters, native dialogs, actual purchasable-variant price filtering/sorting, clamped pagination, bounded related-product results, reactive sizes/extras/quantity, qualified size comparisons, native artwork selection and preview. |
| Server and SEO | Same catalog query in SSR and on the client, public detail outage/404 distinction, staged noindex handling, canonical category URLs, sitemap, server-rendered product metadata, and delayed GSAP and admin JavaScript. Place the owner hero at `apps/web/public/hero/gallermo-hero.webp`. It was absent, so the hero uses a Gallermo gradient. The existing frame chart at `apps/web/public/size-charts/frames-sizechart.webp` is shown only for applicable known frame sizes. |
| Category rules and checkout | Independent admin booleans `requiresPrepayment` and `customizationEnabled`. The API resolves published categories and bundle components for quotes and submissions. Server-signed quotes, owner-scoped submit and recovery, transactional stock and coupon changes, explicit shipping validation, and exact-once cancellation release. |
| Payment and design | Integer piastres for payment amounts, manual InstaPay verification, independent fulfillment status, replacement proof, duplicate-reference protection, delivery balance recording, and transaction-bound artwork/evidence. JPEG, PNG and WebP are signature-checked, bounded, decoded and re-encoded. Uploads use opaque IDs, owner/role checks, separate artwork and payment scopes, and private storage. Different artwork IDs remain separate cart lines. Standard bundle orders work, with category prepayment inherited from their components. Bundle-level design upload was left out because it lacks per-component semantics. |

The modeled deposit is 50% of the full server-calculated order total after discounts and including shipping. Half a piastre rounds up. The remaining balance is due at delivery. Flagged orders offer the deposit plan in the local checkout. Normal orders retain COD and full InstaPay. The deposit basis, remainder collection terms and availability of full upfront payment for flagged orders require owner approval. A submitted image moves payment to review. Actual receipt and amount require admin verification.

Contact uses the owner-supplied Facebook, Instagram and public phone number. The social pages did not load through the research tool, so live destinations are unverified. WhatsApp has no storefront link. InstaPay appears in the payment flow. Information policy pages are clearly marked drafts and excluded from indexing. The footer links to the confirmed contact route while the policies await sign-off. The returns draft distinguishes the generally applicable 14-day window, applicable custom-made exceptions, and the 30-day defective-goods window. [Egyptian Consumer Protection Agency FAQs](https://cpa.gov.eg/ar-EG/%D8%A7%D8%B3%D8%A6%D9%84%D8%A9-%D9%85%D8%AA%D9%83%D8%B1%D8%B1%D8%A9)

## Verification

| Check | Result |
| --- | --- |
| Baseline `npm.cmd run test` | 4 passed |
| Final `npm.cmd run test` | 18 passed, 0 failed, 0 skipped |
| `npm.cmd run build` | Client and SSR builds passed |
| Development Edge `npm.cmd run test:e2e` | 7 passed |
| Built SSR in production mode, Edge `npm.cmd run test:e2e` | 7 passed |
| Isolated outage probe | Liveness 200 in 39 ms. Readiness 503 in 5 ms. Direct login 503 in 30 ms and proxied login 503 in 22 ms with `DATABASE_UNAVAILABLE`. Product SSR returned a retry page with 503 in 209 ms. An unreachable API returned clean JSON 503 with `API_UNAVAILABLE` in 6 ms. |
| `npm.cmd audit --omit=dev` | 2 moderate, 0 high or critical |
| `git diff --check` and catalog asset diff | Clean whitespace check. Zero changes to seed, catalog images, logo or supplied chart. |

The API consumer tests exercise valid and failed login, logout, registration, roles, signed quotes, COD rejection, proof reupload, replay prevention, ownership and asset isolation, discount use, overlapping requests, cancellation and actual delivery settlement. The browser suite checks Arabic/English and dark/light preferences, SSR with JavaScript disabled or delayed, 320/375/390/440/768/1024/1440 px widths and landscape, drawer focus and reduced motion, catalog filters, product variants, real artwork uploads and replacement, a synthetic deposit order, category flag persistence, and role navigation.

Final production assets measured 84.00 kB gzip for the storefront entry, 8.26 kB for CSS, and separately loaded 27.98 kB for GSAP and 5.09 kB for admin. Development and production fixture runs can emit the existing Node proxy dependency’s `DEP0060` compatibility notice and the test runner’s contradictory color environment notice.

The browser suites use real Edge against the development and built SSR web servers and a disposable MongoDB 8.2.6 replica set. Screenshots contain synthetic checkout data. They remain local under `test-results/`. The product and category records used in tests come from the source seed with explicit test-only policy, stock, coupon, and bundle fixtures. Automated keyboard and responsive checks are included. A full screen-reader walkthrough, cross-browser certification, Lighthouse or field Core Web Vitals, and testing against the owner database were outside the verified results.

## Launch blockers and remaining issues

- Approve the exact deposit basis, remaining-balance collection, cancellations/refunds, shipping coverage and fees, and bilingual terms, privacy, and returns wording. The draft makes no blanket waiver or claim that the deposit is nonrefundable. Check the public social destinations before listing them as verified.
- Add a durable private production storage adapter, encrypted backups, restore drills, retention and deletion policy, trusted-proxy rate-limit configuration, production monitoring, and stronger admin enrollment and MFA. Production checkout and production private uploads are hard-disabled in v2. On the local adapter, unbound artwork and payment evidence expire after 24 hours, and cleanup removes expired metadata/files. Order-bound artwork and payment evidence remain available to authorized staff after cancellation for review. A production retention schedule and object-store reconciliation are still required. No automatic bank integration or refund flow was added.
- The runtime npm audit reports two moderate dependency entries associated with React Router 6. The patched version identified by npm is in the next major release. Gallermo uses BrowserRouter/StaticRouter, internal destinations and its own inert SSR JSON, with an inert JSON data payload. Router major-version migration and a fresh audit are still required before release. The previous high Zod advisory was removed by the targeted Zod 4 update.
- The historical 504 still needs a timestamped web proxy log and sanitized API/DB telemetry from an affected login if it recurs. The captured invalid direct and proxied responses alone cannot establish that earlier root cause. No test used the owner’s credentials.
- Localization uses the approved seed fields with the existing fallback to English where an Arabic catalog field is missing. No translated product copy was invented. Arabic and English share canonical URLs. There are no language-specific alternate URLs.

## Changed files and Git status

Branch `main` and its local tracking ref `origin/main` are 0 ahead and 0 behind. Changes are unstaged, with no implementation commit. Git reports **18 files changed, 2019 insertions(+), 530 deletions(-)** for tracked files and **24 new files** outside that statistic.

| Changed files | Paths |
| --- | --- |
| Root and report | `.gitignore`, `README.md`, `package.json`, `package-lock.json`, `playwright.config.js`, `docs/IMPLEMENTATION_V2.md` |
| API runtime and config | `apps/api/.env.example`, `apps/api/package.json`, `apps/api/src/index.js`, `apps/api/src/models.js`, `apps/api/src/catalog.js`, `apps/api/src/checkout.js`, `apps/api/src/private-assets.js` |
| API scripts and tests | `apps/api/scripts/cleanup-uploads.js`, `apps/api/scripts/serve-fixture.js`, `apps/api/test/fixtures.js`, `apps/api/test/runtime.test.js`, `apps/api/test/v2.test.js` |
| Web server, entry points and config | `apps/web/.env.example`, `apps/web/index.html`, `apps/web/package.json`, `apps/web/server.js`, `apps/web/start.js`, `apps/web/public/preferences-bootstrap.js`, `apps/web/src/entry-client.jsx`, `apps/web/src/entry-server.jsx` |
| Storefront and styles | `apps/web/src/App.jsx`, `apps/web/src/catalog-query.js`, `apps/web/src/preferences.js`, `apps/web/src/sizes.js`, `apps/web/src/styles.css`, `apps/web/src/components/Artwork.jsx`, `apps/web/src/components/Information.jsx`, `apps/web/src/components/LoadingState.jsx`, `apps/web/src/components/StaggeredMenu.jsx` |
| Pages and browser tests | `apps/web/src/pages/AdminOrders.jsx`, `apps/web/src/pages/AdminPage.jsx`, `apps/web/src/pages/Checkout.jsx`, `apps/web/src/pages/Pages.jsx`, `apps/web/src/pages/ProductPage.jsx`, `apps/web/src/pages/Shop.jsx`, `apps/web/e2e/storefront.spec.js` |

The lockfile adds Sharp and its platform packages, isolated MongoDB tooling, and Playwright. The API package also updates Zod to address the reported high-severity advisory. No package-wide upgrade was run.
