# Gallermo — UX, Security, SEO and Performance Quality Plan

Research checked on November 15, 2026. Targets and requirements are **quality goals**, not verified grades.

## HCI and usability

Apply Norman's principles of discoverability, signifiers, feedback, conceptual models, mappings and constraints, plus Nielsen's heuristics:

- Visibility of status: cart count changes, updated selected variant prices, confirmed order state, loading states, explicit errors.
- Recognition over recall: category names and sizes visible; customer can verify order subtotal before checkout; no hidden size/pricing rules.
- Error prevention: product option selection, input validation on both sides, confirm before deletion, rate-limited tracking.
- Consistency and real-world match: clear Egyptian EGP labels, familiar order process, localized Arabic labels and RTL.
- User control: undo/discard future admin changes, cart edit/remove, graceful menu close on Escape; configurable motion preference.
- Accessible interaction: WCAG 2.2 AA target, 24×24 CSS pixel minimum interactive targets (prefer 44×44 in touch areas), labels, focus outlines, screen reader status, keyboard menu navigation, reduced-motion alternative.
- Performance is UX: prioritise content over animations; GSAP flight is progressive enhancement that must never block cart success.

Source: Nielsen Norman Group's 10 heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
Source: WCAG 2.2: https://www.w3.org/TR/WCAG22/

## SEO plan

- React SSR with accessible HTML links for core product discovery, descriptive product slugs, canonical URLs, title/description per route.
- Product structured data (`Product`, `Offer`, then `ProductGroup` for variants) must accurately reflect prices, purchase eligibility, availability, shipping, currency and returns. Current markup only emitted when checkout has been deliberately enabled.
- Generate `/sitemap.xml` dynamically and `/robots.txt`. Keep admin, checkout, login, cart and account pages noindex; use sitewide noindex on staging.
- Every variant must eventually support deep linking via `?variant=SKU`, with ProductGroup structured markup according to Google's requirements. Confirm canonical strategy.
- Add translated `/ar/` URLs and correct `hreflang` once full bilingual catalog and SEO translations are approved; a client-only language toggle does NOT yet provide multilingual SEO.
- Add merchant feed, Merchant Center and Search Console once verified and officially live.
- No "SEO renewal" job or rebuild per deploy is required: SSR and dynamic sitemaps are normal request-time features, with real Search Console monitoring.

Sources:
https://developers.google.com/search/docs/specialty/ecommerce
https://developers.google.com/search/docs/appearance/structured-data/product-variants
https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites

## Performance budgets

Core Web Vitals p75 mobile and desktop target:

- **LCP ≤ 2.5 s**, **INP ≤ 200 ms**, **CLS ≤ 0.1**.
- Hero gets an optimized responsive WebP/AVIF image, strong overlay contrast, `fetchpriority=high` and preload if appropriate.
- Product thumbnails responsive sizes and lazy loading; dimensioned images; do not preload all product images.
- Client/server cache sensible; CDN media with long immutable cache, static hashed bundles, no client-only hydration of entire catalog.
- Code-split expensive admin, checkout and GSAP animation where appropriate; prefetch only useful navigation.
- Verify in Chrome Lighthouse/PageSpeed and real user metrics, on Egypt mobile networks.

Source: https://developers.google.com/search/docs/appearance/core-web-vitals

## Security architecture / launch gates

**Implemented as foundation:** password bcrypt work-factor 12, HTTP-only opaque session cookie, SHA-256 verifier stored in Mongo, session expiry and logout, SameSite Lax, Secure cookie in production, strict request Origin check for mutations, Helmet headers, brute-force rate limits, Zod payload validation, RBAC in API not only UI, no default admin, server-priced orders.

**Required before production checkout:**

1. Confirm domain, TLS, proxy trust and cookie/same-origin correctness, add hardened CSP and nonce where SSR inline payloads are used.
2. Admin MFA, account recovery, email verification, abuse throttling per account + per IP, audit log of changes.
3. Atomic stock reservations / bundle component stock and exact coupon-use accounting under concurrent requests; transaction/retry strategy with Atlas replica set.
4. Payment confirmation independent of screenshots, secured private evidence upload with server MIME signatures and anti-malware scanning, manual InstaPay reconciliation with receiving bank records, supported refunds/disputes.
5. Shipping rules by governorate, inventory truth, merchant terms, return/refund/privacy/shipping policies, contact and invoicing.
6. Tests: auth/role matrix, IDOR, CSRF, guest tracking guessing, cart price tampering, coupon races, transaction idempotency, race conditions, asset upload security, admin audit, abandoned cart behavior.
7. Pen-test and dependency/code scanning, security headers scan, backup/restore and disaster recovery, rate-limits suited to deployment and trusted proxy.
8. Explicit final authorization before changing `CHECKOUT_ENABLED` to true.

Sources:
https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

## Reliability

- Quote and order calculations must use server authoritative prices; never use local cart price as final payment amount.
- Define transactional order + stock + code reservation, retries, idempotent payments, webhook/payment reconciliation as applicable, secure order snapshots.
- Monitor API availability, database connection health, error rates, checkout failure types, slow queries and SEO crawls.
- Back up the MongoDB database, test restores, and use least-privilege DB credentials.
- Track schema/data migrations and image asset provenance; don't reseed over edited customer data.
- Use staging with synthetic test products and no live payment credentials; production enablement is a separate step.
