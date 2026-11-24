# Gallermo — Next Development Roadmap and Definition of Done

## Phase 1: Project foundation (included in v0.1 ZIP)

- [x] Asset audit: 360 images inc. logo; 23 duplicates; 336 unique catalog designs.
- [x] Preserve exact size/price variants from spreadsheet and source references.
- [x] Brand palette, homepage, category carousel, product cards, basic cart animation, EN/AR toggle, RTL, light/dark.
- [x] Guest track / customer orders / admin-only navigation, server role protection.
- [x] Admin CRUD structures and order management.
- [x] SSR SEO foundations and dynamic sitemap.
- [x] Disable checkout by default, with planned COD/InstaPay flows.
- [ ] **You run `npm install`, tests, and browser/mobile smoke tests** (network and DB unavailable during ZIP authoring).

## Phase 2: Catalog + polished commerce

- [ ] Review each provisional product name/image, all option-to-design associations, and actual item inventory.
- [ ] Confirm neon anime pricing, correct acrylic coaster images, approve any licensed designs.
- [ ] Add real Cloudflare R2 or equivalent media upload with private admin upload and public CDN transforms; asset integrity and optional image variants.
- [ ] Product photo gallery quality, SKU search, search facets, related products, size image mapping, rich Arabic design-specific copy.
- [ ] Bundle builder and stock component validation, coupon guardrails and redemption limits.
- [ ] Add a real bestseller ranking once orders exist (endpoint present, section conditional).
- [ ] Build shipping zones/rates per governorate, exact totals, policies and business contact pages.
- [ ] Real customer email communications and password reset/verification.

## Phase 3: Harden order workflow

- [ ] Transactional stock decrement and bundle reservations; concurrent coupon use, cancellation/restock and refund behavior.
- [ ] Checkout quote expiry and idempotent retry/recovery tested.
- [ ] InstaPay secure private transfer evidence, reference shown to user, manual reconciliation and bank verification; no screenshot-only approval.
- [ ] Admin MFA and audit logs, account protections, CSP, abuse prevention.
- [ ] User permission matrix tested: guest sees Track Order only; customer sees My Orders only; admin sees Admin only. Public shop/cart/checkout remain appropriately accessible to shoppers.
- [ ] Production operations: backups, rollback, health checks, logs, rate-limits, dependency scans.
- [ ] Owner approval of official payment number `+20 11 49504797`, shipping, stock, legal policies and intellectual-property licensing.
- [ ] **Explicit checkout release authorization** required before `CHECKOUT_ENABLED=true`.

## Phase 4: SEO, accessibility and visual QA

- [ ] Mobile p75 Core Web Vitals and Lighthouse performance verification; optimized hero, image srcset/CDN, code-split admin/GSAP.
- [ ] WCAG 2.2 AA manual/automated audit, Arabic RTL screen reader and keyboard testing, focus traps, reduced-motion and zoom 200/400%.
- [ ] Variant deep links, ProductGroup markup, Merchant Center feed, separate Arabic SEO URLs/hreflang, localized metadata.
- [ ] Return correct statuses for bad/empty categories; improve faceted pagination and canonical controls.
- [ ] Cross-browser flows: Chrome, Safari/iOS, Firefox, Android; small 320px and large monitors; low-end phone.
- [ ] Production preview/staging tests for search/social cards and security headers.
- [ ] Publish sitemap and Search Console after launch verification (no recurring SEO "renewal" needed).

## Information still required from merchant

Actual business delivery/shipping rates, coverage, production time, orders service contact channels, terms/policies, real inventory, the image-product associations, licensed rights, bundle definitions, coupon rules and official domain. These are not fabricated in the seed.
