# Gallermo v2 acceptance audit

24 November 2026

## Decision

**Ready for a development baseline commit. Production launch remains blocked.** The worktree is still uncommitted. The acceptance recommendation applies to the reviewed source, tests and reports. The patch and ZIP are review exports. Production checkout and private uploads remain locked, and the owner catalog was accessed read-only.

The [requirement matrix](V2_REQUIREMENT_MATRIX.md) assesses the original implementation brief item by item. The [database diagnostics](V2_DATABASE_DIAGNOSTICS.md) record how the restricted environment reproduced a 503 and how the owner stack responded. The [implementation report](IMPLEMENTATION_V2.md) remains the historical implementation record.

## Findings and targeted fixes

| Finding | Evidence and change |
| --- | --- |
| 320 px mobile logo centered at 158.5 px | The owner storefront’s actual rendered logo was 1.5 px left of center. `styles.css` now uses equal zero-minimum side tracks and enough room for right-side controls. The browser test requires a center within 0.5 px and checks that logo and controls do not overlap. |
| Checkout accepted proof metadata after its image file was missing | The new fixture test initially created an order with HTTP 201 after the valid proof file was removed. `private-assets.js` now requires a nonempty regular private file before an upload can satisfy checkout. The regression expects 409, zero order creation and unchanged stock. |
| Session polling exhausted the credential throttle | Both extended browser runs surfaced a 429 on `GET /api/auth/me`. `index.js` now applies the 20-per-15-minute narrower budget to credential submissions. The general API budget remains. The new API regression performs 25 session checks and verifies that invalid login still takes the expected 401 path. |
| Product structured data could stay attached to the previous client-side product route | Shared structured-data construction now drives SSR and hydrated Product views. Product navigation replaces the JSON-LD and canonical, and leaving detail clears the script. Bundle detail updates title/description. The independent indexable browser probe verified product-to-product navigation and cleanup on Shop. |
| Footer copyright text had insufficient contrast | Lighthouse measured 3.48:1 for the normal-sized copyright text in both presets. Targeted colors make the copyright and the three social icons legible against the existing footer. The browser checks all four rendered foreground/background pairs against 4.5:1. |

Earlier runs exposed a missing synthetic description fixture, then the auth throttle failure. The audit added a description to the disposable browser fixture only. The source seed and owner catalog descriptions were untouched. Five stale earlier production test process trees were identified and stopped. The owner web and API continued listening.

## Final verification

| Check | Pass | Fail | Skip |
| --- | ---: | ---: | ---: |
| `npm.cmd run test`, API and catalog | 25 | 0 | 0 |
| Development Edge browser suite | 10 | 0 | 0 |
| Production-build Edge browser suite | 10 | 0 | 0 |
| Independent indexable fixture and outage assertions | 6 | 0 | 0 |

`npm.cmd run build` completed both client and SSR builds. Final gzip output was 84.41 kB for the storefront entry, 8.29 kB for CSS, 5.09 kB for the lazy admin chunk and 27.98 kB for the lazy GSAP chunk. The npm audit command returned its findings exit code. Git whitespace checks passed. The seed, catalog assets, logo and supplied size chart show no baseline diff.

The API verification covered concurrent stock, last-coupon redemption, duplicate submission and payment reference, stale signed quotes, direct COD rejection for flagged carts, mixed carts and bundles, exact piastre rounding, manual payment verification/replacement, two-customer isolation, immutable order snapshots, missing file and two concurrent cancellations. The production guard test verifies that checkout and private uploads remain off even when local fixture flags are set.

The final owner-facing listener still returns 503 because both its listener and watcher run under the network-restricted sandbox identity. The host-shell driver stayed healthy and revalidated the same read-only counts. The database report gives the API-only restart procedure from a normal Windows terminal.

The browser suite ran on Microsoft Edge with disposable MongoDB data. It covers cold SSR without JavaScript and with delayed hydration, 320–1440 px and landscape, English/Arabic, light/dark, keyboard dialog containment, search and filter drawers, product variant/price/comparison, proof and customization fixtures, cart and order role navigation. The archive includes full-page views for the requested screens plus representative viewport captures. Checkout screenshots use disposable fixture data and capture the form before entering a transfer reference or attaching evidence. Fixture descriptions and admin credentials exist only in regression fixtures.

The independent indexable fixture verified 346 sitemap URLs, canonical categories, private and filtered noindex, product metadata and Product/Offer JSON-LD, a sold-out 200, missing/unpublished 404, and an upstream-outage 503. It exercised the dedicated hero path and image priority using a temporary synthetic build-only WebP, then removed it. The owner hero asset is still pending. The staged E2E suite verified sitemap suppression in noindex mode.

## Performance and accessibility

Lighthouse 13.6.0 ran the indexable production-build fixture homepage in local Edge using its mobile and desktop presets. These are individual lab runs, with the gradient fallback and a local database.

| Preset | Performance | Accessibility | Best practices | SEO | LCP | Speed index | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile | 96 | 100 | 100 | 100 | 1.36 s | 4.85 s | 43 ms | 0.0000 |
| desktop | 100 | 100 | 100 | 100 | 0.34 s | 0.44 s | 0 ms | 0.0007 |

The final reports clear the measured color-contrast issue. The updated footer copyright resolves to approximately 9.16:1, and all three icon controls pass the browser contrast assertion. The mobile Speed Index remains 4.85 s. Lighthouse reported back/forward-cache exclusions from no-store responses and flagged the network dependency tree. These fixture runs do not replace field Core Web Vitals or a manual accessibility review.

## Security and dependencies

`npm.cmd audit --json` reported **two moderate affected package entries, zero high, zero critical**, for locked `react-router@6.30.6` and `react-router-dom@6.30.6`. The latter inherits the findings from the former. Lockfile contents were unchanged during the acceptance audit.

| Advisory | Directly affected package and range | First patched release | Gallermo assessment |
| --- | --- | --- | --- |
| [GHSA-wrjc-x8rr-h8h6 / CVE-2026-53669](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) | `react-router >=6.0.0 <7.18.0` | 7.18.0 | Gallermo uses Link and useNavigate. Review found fixed destinations and slug/validated-query paths, with no user-provided redirect target reaching those calls. The installed package remains in range. |
| [GHSA-337j-9hxr-rhxg / CVE-2026-53666](https://github.com/advisories/GHSA-337j-9hxr-rhxg) | `react-router >=6.4.0 <7.18.0` | 7.18.0 | The maintainer scopes this advisory to Framework Mode and manual Data Mode SSR. Gallermo uses declarative BrowserRouter/StaticRouter and its own escaped JSON bootstrap. |

Registry audit lists `react-router-dom@7.18.7` as the available semver-major remediation. Treat the Router 7 move as a scoped release change. Review SSR imports, the v6 future flags, client navigation and hydration, then rerun the full browser and SEO regression. [React Router v6 upgrade guide](https://reactrouter.com/upgrading/v6)

- Login uses bcrypt with a dummy comparison for unmapped accounts. Sessions use hashed opaque tokens, expiration, HTTP-only cookies and production Secure/`__Host-` settings. The audit exercised safe invalid login, logout, registration and role isolation. MFA and admin enrollment remain release prerequisites.
- State-changing requests use exact Origin or bounded Referer checks. Express body sizing and Zod reject oversized or malformed inputs. The proxy and API currently see upstream traffic as a shared origin address without an approved trusted-proxy configuration. Validate per-client login/API abuse protection in the actual ingress topology before launch. Keep direct API access and forwarded headers within the intended trust boundary.
- Upload streams are bounded, purpose-scoped, decoded and re-encoded. The server checks ownership, category/SKU, expiry, file presence and atomic binding. Payment evidence uses an admin-only read path. The audit did not include an independent penetration test, exhaustive abuse/load exercise or production object-store policy review.
- The production web emits CSP and inert escaped SSR JSON. Cookie-driven HTML and private API responses use no-store. Inline CSS is currently permitted for storefront styling and motion. HTML serialization and permission paths were inspected defensively. The actual owner inputs were never used in rendering test payloads.
- The diagnostic logs suppress connection values and private settings. The review package includes sanitized excerpts, synthetic screenshots, and example environment templates without real secrets.

## Remaining launch blockers

1. Durable private production storage for artwork and payment evidence, ownership-aware file access, encrypted backup/restore validation, retention and cleanup operations.
2. Owner approval for shipping coverage and fees, the proposed 50% whole-order deposit after discounts and shipping, collection of the remainder, cancellation/refund handling, and bilingual privacy, returns and terms. Draft pages remain noindex and outside footer navigation.
3. Scope and verify the React Router migration, ingress-aware rate limits, TLS and operational monitoring, and admin MFA/enrollment.
4. Provide and approve the actual hero image and verify social profiles. Complete manual screen-reader, broader browser and Arabic copy acceptance. Exact historical shop-scroll restoration remains unproven across browsers. The original reusable mutation spinner is still absent, with pending text/disabled controls in its place.
5. Keep production checkout off until the production gates are accepted. The historical login 504 remains unconfirmed, with current connectivity and the restricted 503 explained separately.

## Export verification

The complete patch includes every changed tracked and new source or report file relative to `82f556e`. The patch and evidence ZIP are self-excluded. The patch was replayed into a second temporary Git index and matched the source tree produced by indexing the current worktree. The real index was left untouched.

The ZIP contains the four reports, changed source, patch, sanitized logs, browser screenshots, npm findings, performance summary, final Git status and a SHA-256 manifest. Test traces, real environment files, private uploads, database content, dependency/build directories and copies of catalog assets are excluded. The archive was checked by opening every entry and verifying its checksum. The archive has 52 browser screenshots, including 28 full-page views. The manifest records hashes and the exact inventory.
