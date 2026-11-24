# Gallermo v2 acceptance matrix

24 November 2026. The section numbers follow the original Gallermo v2 implementation prompt. **PASS** means relevant executable evidence or a direct code inspection supported the stated behavior. **FAIL** means review found an unmet requirement. **BLOCKED** means external materials, approval, historical evidence or a test environment prevented full acceptance. Fixture results establish function with synthetic data. The final tally is **68 PASS, 1 FAIL and 11 BLOCKED**.

## Evidence key

| Code | Evidence |
| --- | --- |
| DB | `V2_DATABASE_DIAGNOSTICS.md` and the sanitized direct, proxy and startup logs |
| API | `apps/api/test/catalog.test.js`, `runtime.test.js`, `v2.test.js`, `acceptance.test.js` and `api-final.log` |
| E2E | `apps/web/e2e/storefront.spec.js`, `acceptance.spec.js`, both browser logs and screenshots |
| SEO | Independent indexable fixture probe in `seo-performance.log`, supplemented by staged SSR assertions in E2E |
| Audit | `npm-audit.json`, the maintainer advisories and the security review in `V2_ACCEPTANCE_AUDIT.md` |
| Source | Direct inspection of the referenced files and the verified baseline patch |

## 0. Baseline, references, catalog and assets

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 0.1 | Preserve all current work, inspect branch, baseline, remotes, lock, scripts and changed/untracked files | PASS | Initial Git inventory and temporary-index patch verification. HEAD is `82f556e`. |
| 0.2 | Use Tap & Wrap patterns read-only | PASS | `docs/IMPLEMENTATION_V2.md` records `59651b89590b4bf664d221e6e7486c62581042a4`. Shop, gallery support, menu, footer and FAQ patterns are referenced in the implementation. |
| 0.3 | Use WAM product design reference | PASS | Local WAM gallery, purchase column and related-product reference at `23487d90c1ab4aa79efe6c24c0c1e7ab34458b2c`. E2E product screenshot shows the resulting layout. |
| 0.4 | Compare against the hosted WAM product and supplied screenshots | BLOCKED | The earlier hosted product fetch failed. No standalone WAM screenshots were available to the audit. Local reference evidence covers 0.3. |
| 0.5 | Preserve catalog, real prices/media/identifiers and unpublished coaster record without reseed | PASS | DB found 336 products and 1,789 variants, eight categories with seven published, and zero bundles. Git baseline comparison found no diff in seed, catalog assets, chart or logo. API seed and price assertions passed. |
| 0.6 | Publish approved Facebook, Instagram and phone channels. Keep InstaPay in payment context and WhatsApp out pending confirmation | PASS | `Information.jsx`, `Checkout.jsx` and `checkout.js`. E2E confirms exact footer phone and contact links, separate checkout context. |
| 0.7 | Verify live ownership and reachability of social destinations | BLOCKED | Social destination confirmation remains with the owner. Storefront uses the supplied handles. |
| 0.8 | Preserve actual logo and frame size-chart art | PASS | Baseline asset diff and E2E header/chart image assertions. |
| 0.9 | Verify the final owner hero photograph and crop | BLOCKED | `apps/web/public/hero/gallermo-hero.webp` has no owner file. The positive path and fallback are checked separately under 3.2. |

## 1. Runtime, authentication and SSR

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 1.1 | Diagnose earlier 504 and prove historical root cause | BLOCKED | No log matched that incident. DB current synthetic invalid login returned 401 direct and proxied. No inference of historical resolution. |
| 1.2 | Validate proxy/Origin/port, database selection, TLS and readiness with legacy URI | PASS | DB reproduced restricted egress `EACCES` and API 503. Host selected the configured primary and returned normal 200 readiness. |
| 1.3 | Verify valid/invalid auth, bcrypt, session write, logout and role | PASS | `security.js`, `index.js`, API and E2E synthetic account tests. Owner request used an unknown test account only. |
| 1.4 | Keep login throttling from turning normal browsing into session failure | PASS | Both pre-fix browser traces showed `/api/auth/me` 429. `index.js` limits credential submissions separately. API polls session 25 times and still receives a correct invalid-login 401. |
| 1.5 | Router future flags and representative hydration console | PASS | `entry-client.jsx`, `entry-server.jsx`, E2E cold SSR and clean home console checks. |
| 1.6 | Render-blocking styles, persisted LTR/RTL theme and legacy preference migration | PASS | `index.html`, `preferences-bootstrap.js`, `preferences.js`. Both builds pass no-JS and explicitly delayed-hydration browser checks. |
| 1.7 | API JSON/non-JSON handling, abort, pending/empty/error states and cache privacy | PASS | `App.jsx`, `Shop.jsx`, `ProductPage.jsx`, `index.js`. E2E empty catalog and cold hydrate; API and SEO 503 never become a misleading missing product; source aborts obsolete requests. |
| 1.8 | Current owner-facing listener ready after the audit | BLOCKED | Final port 4000 listener and watcher run under the restricted account and return 503. Host direct MongoDB remains healthy. See DB for the targeted restart action. |

## 2. Header and mobile menu

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 2.1 | Physical-left hamburger, centered mobile logo, right controls and 320 px containment | PASS | `styles.css` and `StaggeredMenu.jsx`. Initial 320 px center measured 158.5 px. Final E2E requires 160 px ±0.5 and zero overlap; width sweep covers 320/375/390/440/768/1024/1440 plus landscape. |
| 2.2 | Desktop brand image alone on the left, centered navigation | PASS | `App.jsx`, `styles.css`. E2E confirms blank brand text and logo physically left of navigation. |
| 2.3 | Icon-only trigger/close, branded layers, physically left in both directions | PASS | Native dialog in `StaggeredMenu.jsx`, animation in `styles.css`. E2E measures panel x=0 then toggles Arabic while open. |
| 2.4 | Language/theme changes preserve drawer and avoid restarting animation | PASS | E2E monitors animation-start count during language change, preserves left edge and exercises a theme change while open. |
| 2.5 | Keyboard focus isolation and return, backdrop, Escape, scroll, reduced motion and breakpoint | PASS | Native modal prevents focus behind it. E2E tests focus attempts, Tab, Escape, scroll restoration and reduced motion. Source covers backdrop click and breakpoint close. |
| 2.6 | Same-route navigation, rapid interaction and accordion links | PASS | `StaggeredMenu.jsx` closes on each link and location key, guards repeated exit and has one timeout. E2E checks the normal open/close cycle. No dedicated high-frequency stress benchmark was run. |
| 2.7 | Guest Track Order, customer My Orders, admin Admin, with UI and API guards | PASS | `App.jsx`, `Pages.jsx`, `security.js`, `index.js`. Browser role navigation and direct API authorization cases. |

## 3. Homepage and category carousel

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 3.1 | Requested section order, conditional bundles, no numbering | PASS | `Pages.jsx` section order and conditional published bundle rendering. Full-page E2E evidence; owner DB contains zero bundles. |
| 3.2 | Dedicated hero path, priority and brand fallback | PASS | `server.js`, `Pages.jsx`, `styles.css`. E2E fallback and SEO-probe build-only synthetic WebP at the configured URL. |
| 3.3 | Consistent contained category images and card sizing, touch, RTL, snap, keyboard and disabled edges | PASS | `Pages.jsx` and `styles.css`. E2E measures consistent 4:3 boxes and contained media, exercises both scroll directions; source includes keyboard and disabled boundaries. |
| 3.4 | Eight eligible products and accurately labeled featured or actual bestseller fallback | PASS | `catalog.js`, `Pages.jsx`. Real delivered-order aggregation with stable ranking, E2E eight cards and no Best Sellers label for a no-sales fixture. API covers delivered ranking. |
| 3.5 | View All centered beneath grid | PASS | `Pages.jsx`, `styles.css`; E2E checks position and center. |
| 3.6 | Customer-facing punctuation without em dashes | PASS | Catalog seed source review, display normalization in `App.jsx` and order labels, and E2E rendered home assertion. Arbitrary future owner text and legacy client cart records are outside this fixture evidence. |

## 4. Shop and product cards

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 4.1 | Contained images, aligned cards, labeled SKU picker, no overflow, out-of-stock and single variant handling | PASS | `App.jsx`, `styles.css`, `LoadingState.jsx`. E2E width sweep, computed contain and select bounds; source disables unavailable SKU. |
| 4.2 | Zigzag animation uses actual cart icon, only for accepted adds, with reduced-motion and cleanup | PASS | `FlyToCart` in `App.jsx`. E2E observes the temporary clone, transformed animation, and removal; code calculates icon-center destination and honors reduced motion. |
| 4.3 | Tap & Wrap-style search, desktop sidebar, mobile Filters/Sort, closed drawer cancels drafts | PASS | `Shop.jsx`, `styles.css`. Both drawers captured, and E2E dismissal/apply/active sort passed. |
| 4.4 | Category, availability, EGP minimum/maximum, clear and apply, real query sort | PASS | `Shop.jsx`, `catalog-query.js`, `catalog.js`. Browser draft and sort tests plus API strict filters and range tests. |
| 4.5 | Bounded validated requests, safe bilingual search, actual eligible variant price, count/limit/clamp and visibility | PASS | `catalog.js`, `index.js`. API exercises Arabic search, invalid/duplicate fields, hidden categories, usable prices, deterministic sort and pagination. Null stock retains the legacy unmanaged meaning. |
| 4.6 | Back, reload, SSR query parity and results focus | PASS | `Shop.jsx`, `catalog-query.js`, `server.js`. E2E applies filters, checks focus, paginates, goes back, reloads and checks hydration avoids a duplicate catalog fetch. |
| 4.7 | Reliable restoration of the exact historical results scroll offset in all clients | BLOCKED | History URL and intentional results focus passed. Cross-browser or exact offset restoration with async results was not independently signed off. |

## 5. Product details

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 5.1 | Gallery left and purchase details right, mobile stack, breadcrumb and access to SKU/extras/quantity | PASS | `ProductPage.jsx`, `styles.css`. Desktop product screenshot and responsive selector coverage. |
| 5.2 | Reactive price, dimension comparison and verified chart gating | PASS | `sizes.js`, `ProductPage.jsx`. API loops through every seeded variant in both languages. E2E changes SKU/price and observes A3 comparison and frame chart. |
| 5.3 | Description, Details, Size Guide, About This Size and returns accordions | PASS | `ProductPage.jsx`. Expanded description and chart captured with fixture-only description, verified sizing and returns copy. |
| 5.4 | Gallery thumbnails, arrows, swipe/keyboard and no duplicate controls for one photo | PASS | `ProductPage.jsx`. Single-photo behavior tested; multi-photo controls inspected. All owner catalog fixture images in the tested frame are single-photo. |
| 5.5 | Related results up to four eligible in category, excluding current product | PASS | `catalog.js`, `ProductPage.jsx`, `server.js`. API confirms same category and exclusions, E2E shows four. |
| 5.6 | Public absent, unavailable and in-progress states differ | PASS | `ProductPage.jsx`, `server.js`, `LoadingState.jsx`. SEO probe and E2E differentiate sold-out 200, missing/unpublished 404 and upstream 503. |

## 6–7. Category controls, checkout and orders

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 6.1 | Independent category booleans, strict input/defaults, admin edit and public projection | PASS | `models.js`, `index.js`, `AdminPage.jsx`, `catalog.js`. API covers default and independent values and rejects strings. E2E captures both controls and checks persisted edit. |
| 6.2 | Server checks actual published product/category and SKU even with stale client settings | PASS | `checkout.js` resolve and transaction paths. API stale policy and price, disabled category/customization and COD rejection tests. |
| 6.3 | Historical snapshots remain immutable when category settings change | PASS | Isolated API explicitly toggles both flags after an accepted customized deposit order and compares stored lines and required amount. |
| 6.4 | Preserve admin CRUD for products, categories, bundles, discounts and orders | PASS | `index.js`, `AdminPage.jsx`, `AdminOrders.jsx`. API exercises categories and orders, other CRUD route retention inspected. |
| 7.1 | Flagged, mixed and bundle orders reject direct COD. Regular orders allow COD and InstaPay | PASS | `checkout.js`. API direct submission and plan tests. E2E captures regular and deposit checkout separately. |
| 7.2 | Exact deposit after discount/shipping, integer piastres, remaining balance | PASS | `checkout.js`, `Checkout.jsx`. Independent half-piastre and total conservation tests and checkout screenshots. |
| 7.3 | Quotes expire and reject changed price or rule. Ownership and same-key recovery | PASS | `checkout.js`, `Checkout.jsx`. Test price change and rule change, same-key duplicate and cross-owner recovery. |
| 7.4 | Concurrent stock and coupon redemption with transactional rollback | PASS | `checkout.js`. API competing stock and last-coupon tests, persisted winning order and coupon count checks. |
| 7.5 | Concurrent idempotent submits and duplicate transfer references | PASS | `checkout.js`, `models.js`. API verifies concurrent identical requests return one order, reserve stock once and duplicate reference rollback. |
| 7.6 | Proof is pending until admin verifies amount/reference; remainder and delivery recorded separately | PASS | `checkout.js`, `AdminOrders.jsx`, `Checkout.jsx`. API asserts zero verified amount on upload, fulfillment denied before verification, admin mark and collection tests. |
| 7.7 | Rejection, replacement and recovery retain order identity, cancellation releases once | PASS | `checkout.js`. API replaces evidence for the same order and tests simultaneous admin cancellation with exact-once stock/coupon results. |
| 7.8 | Checkout and private upload production lock, fail-closed storage and shipping prerequisites | PASS | `checkout.js`, `private-assets.js`, `runtime.test.js`. Production mode stays locked even with test flags set. |
| 7.9 | Owner approves final deposit basis, remainder, full-prepay availability and shipping | BLOCKED | Commercial terms are proposed. Fixture local checkout does not establish merchant approval. |

## 8. Artwork and payment-file permissions

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 8.1 | Category-gated single artwork chooser, preview, cancel, replace/remove, standard purchase unaffected | PASS | `Artwork.jsx`, `ProductPage.jsx`, `Pages.jsx`. E2E uploads, replaces and removes fixture lines. Disabled category has no customization trigger. |
| 8.2 | Check type, byte/pixel limits, decode and re-encode private JPEG/PNG/WebP | PASS | `private-assets.js`; API invalid input and actual decode tests, E2E WebP preview. Local storage revalidates a nonempty regular file before checkout. |
| 8.3 | Owner/cookie scoping, origin validation, private stream, artwork and proof scopes | PASS | `private-assets.js`, `security.js`, `index.js`. API checks separate customers, unauthorized assets/orders, payment proof unavailable to its buyer, and sanitized own-order summaries. |
| 8.4 | Cart identity per artwork, safe persistence, bound order metadata and admin access | PASS | `App.jsx`, `Pages.jsx`, `checkout.js`, `AdminOrders.jsx`. E2E two artwork lines survive reload, replacement changes only one ID. API checks private link and stored snapshot. |
| 8.5 | Expiration and cleanup preserve order-bound evidence and artwork | PASS | Local TTL, cleanup command and order binding in `private-assets.js`, `cleanup-uploads.js`, `models.js`. Source review verifies unbound expiration and preservation of bound records. |
| 8.6 | Bundle customization scope remains explicit | PASS | `checkout.js` accepts standard bundles and rejects bundle-level artwork. No unsupported per-component selection published. |
| 8.7 | Durable production private storage, retention and restore | BLOCKED | Production storage intentionally disabled. Object-store operational evidence and final retention approval pending. |

## 9–10. FAQ, footer, accessibility, performance and SEO

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 9.1 | Categorized centered FAQ with rounded keyboard-accessible accordions and real content | PASS | `Information.jsx` and `styles.css`. E2E selects Payments tab, expands with Enter and captures full footer/FAQ. |
| 9.2 | Footer only logo, approved information/contact links and supported channels | PASS | `Information.jsx`. Contact route approved by supplied details, no Shop/Cart/Track links in footer. E2E confirms actual logo and permitted links. |
| 9.3 | Bilingual privacy/returns/shipping/terms and owner/legal approval | BLOCKED | Draft routes exist and are noindex. Public footer omits draft policy links pending approval. |
| 9.4 | Custom returns disclosure preserves statutory rights | PASS | `Information.jsx`, `Checkout.jsx` and [Egyptian Consumer Protection Agency FAQ](https://cpa.gov.eg/ar-EG/%D8%A7%D8%B3%D8%A6%D9%84%D8%A9-%D9%85%D8%AA%D9%83%D8%B1%D8%B1%D8%A9). No blanket waiver in implementation. Legal sign-off remains 9.3. |
| 10.1 | Branded shared loading and distinguish pending/empty/error/retry | PASS | `LoadingState.jsx`, route loaders and checkout feedback. E2E loading/empty navigation and isolated outage/no-JS records. |
| 10.2 | Reusable spinner on auth, form and checkout mutations | FAIL | Pending buttons use disabled states and localized status text. Source lacks the dedicated shared spinner requested by the original brief. |
| 10.3 | English/Arabic and both themes across audited layout/controls | PASS | E2E theme/language reload, 320–1440 checks, full-page representative screenshots, source translation and product formatting. |
| 10.4 | Full accessibility and translation sign-off | BLOCKED | Keyboard and accessible-role checks are evidence for the tested workflows. Full assistive-technology and cross-browser review, exhaustive contrast and owner Arabic copy approval remain outstanding. |
| 10.5 | Metadata, canonical, sitemap, robots/noindex, schema and navigation update | PASS | `server.js`, `product-metadata.js`, `ProductPage.jsx`, `Pages.jsx`; SEO probe and staged E2E exercise both indexability settings and navigation. |
| 10.6 | Language SEO avoids fabricated locale URLs/hreflang | PASS | `server.js` uses one canonical page and request preferences. No fabricated alternate URLs. |
| 10.7 | Optimized payload/asset handling and measured performance | PASS | Build sizes, code-split Admin and GSAP and performance lab evidence in the audit report. Production field metrics remain unmeasured. |
| 10.8 | Auth, authorization, CSRF, upload security, CSP and known dependency issues reviewed | PASS | API regression tests and manual review of `security.js`, `index.js`, `private-assets.js`, `checkout.js`, SSR state encoding and the lockfile. |
| 10.9 | Resolve production advisory and trusted proxy/security operational prerequisites | BLOCKED | React Router 6 advisories and deployment ingress controls require a scoped production decision. MFA, monitoring and backup/restore acceptance are outstanding. |
| 10.10 | Footer text and social control contrast | PASS | Lighthouse identified 3.48:1 copyright contrast. Final browser assertion covers rendered copyright and all three social controls at 4.5:1 or better. |

## 11. Verification, handoff and production protections

| ID | Requirement | Status | Source and observed evidence |
| --- | --- | --- | --- |
| 11.1 | Build, dev and production browser/API check counts and synthetic test fixtures | PASS | Final sanitized API, build, development and production runner logs. Owner stack used only for read-only diagnostics. |
| 11.2 | Complete diff including new files, changed source, evidence ZIP, final Git status | PASS | Temporary Git index and object store, verified patch tree and archive integrity/manifest described in `V2_ACCEPTANCE_AUDIT.md`. |
| 11.3 | No commit/push/deploy/reseed/live checkout activation | PASS | Unchanged baseline HEAD and actual read-only owner counts, tested production lock and unchanged real environment files. |
