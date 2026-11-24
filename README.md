# Gallermo Store — MERN Storefront v0.1 (Development Foundation)

**Status:** Development foundation; NOT cleared for public sales. This is a newly generated application, not a production deployment. Dependencies could not be downloaded or executed in the build environment because external npm DNS/network access was unavailable. Source files and native Node catalog tests are present; finish install/build/browser/API integration verification locally before deployment.

## Scope delivered

- React + Vite + React Router storefront, Express SSR and separate Express/Mongoose API.
- Gallermo brand palette sampled from uploaded logo: burgundy approximately `#700018`, gold `#f9c900`, with warm white and near-black light/dark surfaces.
- English / Arabic strings, right-to-left direction support, browser-persisted theme/language.
- Homepage 50–75% viewport hero, conditional bundles, carousel categories, featured designs (replaced with *genuine* delivered-order bestsellers when available), Why Gallermo, four FAQs, footer.
- Shop with category filters and search, product variants/prices, cart, zigzag GSAP fly-to-cart on product cards and details.
- Separate login/register, customer orders, guest order lookup, role-gated admin.
- Admin CRUD: products, categories, bundles, discount codes; order status/payment administration. Image URLs use pre-imported local files, not yet an upload service.
- 336 unique design images with normalized provisional product names and spreadsheet-based variant prices; 8th category Acrylic Coasters remains unpublished because supplied images are duplicates.
- COD and InstaPay checkout models; InstaPay recipient set to `+201149504797` by default. **Checkout disabled by default; no payment screenshot workflow implemented yet.**
- SSR public routes, SEO metadata, canonical URLs, dynamic robots/sitemap, product JSON-LD only when checkout is enabled.
- Mongoose session auth with opaque HTTP-only cookies, password hashing, Zod body schemas, origin validation, role checks and rate limits.

## Requirements

- Node.js 22+
- npm 10+
- Local MongoDB or MongoDB Atlas **legacy `mongodb://` (standard host/replica-set connection string)**; do NOT use `mongodb+srv://` if your DNS environment fails on SRV lookups.
- Internet connection on your Windows machine to install packages via npm.

## Windows PowerShell: fresh start

1. Extract the ZIP. Open PowerShell **in the `gallermo-store` folder** (the one containing the root `package.json`).

```powershell
npm install
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
```

2. Edit `apps/api/.env`: put your actual private legacy `MONGODB_URI=mongodb://...` and keep `CHECKOUT_ENABLED=false`. **Do not share or commit your URI, password, or admin login.**

3. Start your local MongoDB server if you are not using Atlas, then run:

```powershell
npm run seed
npm run create:admin
npm run test
npm run dev
```

4. Open **http://localhost:5173**. API is at **http://localhost:4000/api/health**.

5. You can also run each service separately:

```powershell
npm run dev -w @gallermo/api
npm run dev -w @gallermo/web
```

`npm run create:admin` asks for an email and a password in an interactive terminal. The password is currently visible as typed; do this privately. This creates an admin without any default/public credentials. Production setup must include MFA and stronger admin enrollment controls.

## Production build (after launch readiness verification)

```powershell
npm run build
```

The API is an independent service (start from `apps/api` with `npm run start`). The web frontend is an SSR Node service (run `node server.js` inside `apps/web` with `NODE_ENV=production`, configured `PORT`, `PUBLIC_SITE_URL` and `API_INTERNAL_URL`). On Windows PowerShell, set `$env:NODE_ENV='production'` before running the web process. Do NOT deploy the web folder as static-only hosting; that disables SSR and dynamic SEO.

A production deployment requires TLS, a real `PUBLIC_SITE_URL`, secure internal API routing, database backups, observation and launch blockers in `docs/ROADMAP.md` resolved. The `robots.txt` endpoint deliberately disallows all crawling on localhost or when `NO_INDEX=true`.

## Folder map

```text
gallermo-store/
├── apps/
│   ├── api/                  Express REST API, MongoDB models, seed, admin account creation
│   └── web/                  React, Vite SSR, GSAP mobile menu, style system, storefront
│       └── public/catalog/   336 uploaded design images (WebP)
├── data/
│   ├── catalog.seed.json     Category, product, variants and source-file traceability
│   └── asset-audit.json      Counts, prices, issues
├── docs/
│   ├── PRODUCT_AUDIT.md
│   ├── QUALITY_PLAN.md
│   └── ROADMAP.md
└── package.json             npm workspaces
```

## Explicit limits / not yet verified

- No actual `npm install`, production build, end-to-end browser verification or MongoDB integration was possible in the authoring container. Do not treat this as release-tested.
- Image-by-image final merchandising titles, Arabic design-specific names, exact gallery associations and IP ownership still need review; filenames were used as *provisional* titles.
- No bundles or real bestseller statistics supplied. No fake data added.
- Stock source not provided; stock is `null` (unmanaged), and checkout remains disabled.
- Shipping fees/zones, refund/returns/privacy policy, contact details, invoice/tax details missing.
- InstaPay evidence upload, server-side evidence validation, payment reconciliation, cancellation/refund flow, concurrent stock reservation, coupon redemption accounting, transactional operations and admin MFA are unfinished. **Do not enable checkout in production.**
- No media upload UI or Cloudflare R2 connection yet; existing imported images are bundled locally.
- SEO infrastructure is implemented but rankings, accessibility audits and Core Web Vitals cannot be guaranteed without published-domain testing.

## Source research

See `docs/QUALITY_PLAN.md` for official Google, WCAG, web.dev, Nielsen Norman and OWASP reference URLs.
