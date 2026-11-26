# Gallermo V3.1 handoff

This builds on `af26c68` and the uncommitted V3 working tree. React Router 7.18.7 and Vite SSR’s `module-sync` resolution remain in use.

## Root causes and changes

- The mobile menu used independent CSS keyframes, a delayed panel, a fixed closing timer and a separate close cluster. It now uses reversible transitions, a synchronized shade and a top-layer hamburger/X anchored to the navbar button. Native dialog focus trapping, Escape, backdrop dismissal, focus restoration and right-side positioning work in both directions.
- React 18 warned about the camel-case DOM prop. The hero and category images now use lowercase `fetchpriority`. The responsive preload still prioritizes only the matching hero. Offscreen reveals load GSAP only when needed. Navbar and footer use a 144 px derivative of the approved logo, with the original retained.
- The announcement and benefits strips are static until hydration and support pausing and reduced motion. Why Gallermo, alternating theme surfaces, primary browse buttons, compact purchase controls, payment cards and dismissible bilingual feedback are in place. Public policies use confirmed rules and direct support links. Legal review for privacy disclosures, processor terms, retention and statutory requirements remains internal.
- The owner’s local API had checkout switched off, local uploads unset and no stable signing key. The ignored API `.env` now enables checkout and local storage with a generated stable signing value. The existing Atlas URI was preserved.
- Production checkout now requires explicit launch authorization, external R2 privacy attestation, a strong signing secret, an HTTPS storefront origin, the approved shipping zones, a writable transaction-capable replica set, required indexes and authenticated access to both configured R2 buckets. Submission refreshes the infrastructure check. Production example flags default to false.

## Changed files

- Storefront under `apps/web/src`, including `App.jsx`, `StaggeredMenu.jsx`, `HomeHighlights.jsx`, `AnimatedContent.jsx`, `QuantityControl.jsx`, `CategoryCarousel.jsx`, `Information.jsx`, `Artwork.jsx`, `Pages.jsx`, `ProductPage.jsx`, `Checkout.jsx`, admin pages and `styles.css`. Also `apps/web/server.js` and `apps/web/public/gallermo-logo-small.webp`.
- API checkout readiness, checkout routing, index verification and R2 bucket checks under `apps/api`. Updated the production example and targeted API and Playwright regressions.
- Local settings are in the ignored `apps/api/.env`. No credentials are in the tracked examples.

## Local checkout

The regular owner watcher reads these values from `apps/api/.env`. Keep the existing `MONGODB_URI=mongodb://...` and current client origin. Keep the signing value stable across restarts.

```dotenv
NODE_ENV=development
CHECKOUT_ENABLED=true
STORAGE_DRIVER=local
LOCAL_PRIVATE_UPLOADS=true
CHECKOUT_QUOTE_SECRET=<stable server-only value>
```

For a new installation, generate a 32-byte random hex value privately and save it in the ignored environment file. Restart the developer-owned API from its terminal only if a configuration change has yet to load. Check the proxied `/api/config` for `checkoutEnabled` and `customizationAvailable`, and `/api/ready` for database readiness. Sample orders and transfer evidence belong in disposable fixtures.

## Remaining production prerequisites

1. Leave `CHECKOUT_ENABLED=false`, `CHECKOUT_LAUNCH_AUTHORIZED=false` and `R2_PRIVATE_ACCESS_VERIFIED=false` until owner approval and successful infrastructure smoke checks.
2. Configure the exact `CLIENT_ORIGIN=https://<storefront>` and a stable 64-hex-character quote key shared by API instances. Use `STORAGE_DRIVER=r2` and the R2 credentials, two distinct bucket names and public CDN URL from the production example. Disable all public access for the private bucket and verify authenticated read/write/delete and denied anonymous access before attesting to it.
3. Run the existing index migration and `npm.cmd run db:indexes -w @gallermo/api -- --release-check` with checkout disabled, and confirm MongoDB health and shipping. Use the existing Gmail settings if enabling email, with a paid Render service and an explicit delivery smoke test. No live SMTP or R2 activation was performed.
4. Review the policies and obtain release authorization. Only then set the production gate values under an approved rollout and verify a controlled checkout before general traffic.

## Verification

- 35 API tests passed with disposable replica sets, including COD, full InstaPay, deposits, mixed bundles, private evidence and a production gate that closes when the idempotency index is absent.
- Four targeted development browser checks passed. Client and SSR builds passed. Dependency audit reported zero vulnerabilities.
- A first development browser run put three fixture artwork files in the local upload directory. Those exact files were identified from the fixture’s preview requests and removed. The first run used a disposable database, and subsequent browser runs isolated both database and files.

- The full production-build browser suite passed all 11 checks. Three production SSR smoke checks also passed after the final performance edits, including preference migration under the production Content Security Policy.
- The owner’s normal storefront returned HTTP 200 for the homepage, checkout, API readiness and public configuration. The running API reported checkout and private uploads enabled. No order was submitted against the owner’s database.

## Mobile Lighthouse

The final local production build, backed by a disposable fixture, scored **87 performance, 100 accessibility, 100 best practices and 69 SEO** with simulated mobile throttling. The staging noindex directive contributes to the SEO score. LCP was **4.1 s**, FCP **0.8 s**, total blocking time **20 ms** and CLS **0**. The first V3.1 run measured 84 performance and 4.5 s LCP. Both final performance targets remain open.

The hero was discovered in the initial document and requested at high priority. The final trace showed 300 ms server response, 16 ms hero load delay, 16 ms transfer and 108 ms render delay before simulated throttling. Inlining the small preferences bootstrap with a CSP hash removed its blocking request. The single measured render-blocking stylesheet accounted for an estimated 157 ms. The mobile hero remained the approved 149 KB WebP. The existing owner web process will read the server-side bootstrap change on its next normal restart.

## Git status

HEAD remains at `af26c68`. The combined V3 and V3.1 worktree has 37 modified tracked files and 20 untracked entries, with nothing staged. The catalog seed and approved catalog artwork are outside the V3.1 diff. No commit, push or deployment was made. Production checkout remains disabled.
