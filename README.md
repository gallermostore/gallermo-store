# Gallermo Store v2

Gallermo is a React/Vite storefront with Express server-side rendering and a separate Express/Mongoose API. Production checkout is disabled. See [the v2 implementation report](docs/IMPLEMENTATION_V2.md) for verification results, release blockers, and business assumptions.

## Local development

Use Node.js 22.19+ and npm. Keep the existing private environment files when working in an existing checkout. For a fresh setup, copy each workspace’s `.env.example` and configure the API with a private **standard `mongodb://` seedlist URI**. Keep `CHECKOUT_ENABLED=false` while reviewing the storefront. MongoDB 5.2+ supports the catalog aggregation operators and the isolated tests run on a disposable MongoDB 8.2.6 replica set.

```powershell
npm.cmd ci
npm.cmd run dev
```

The default storefront is `http://localhost:5173`. The API exposes liveness at `/api/health` and MongoDB readiness at `/api/ready`. Start each workspace separately if you need different shell environments. The seed and admin scripts are separate, explicit commands. Existing catalog data requires no reseed for v2.

## Verification

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
$env:GALLERMO_WEB_BUILD = 'production'
npm.cmd run test:e2e
```

The test harness creates disposable catalog, account, order and upload fixtures. It overrides local commerce settings inside the test API process. The first run downloads the isolated MongoDB binary if it is missing. Browser tests use Microsoft Edge on Windows when available. Install Chromium with Playwright when no local Edge executable is available. Set `GALLERMO_FIXTURE_PORT` to an unused port if a default fixture port is occupied. Browser screenshots and traces are saved under ignored `test-results/`.

## Production-mode start and storage

```powershell
npm.cmd run build
npm.cmd run start -w @gallermo/web
```

Start the API independently with `npm.cmd run start -w @gallermo/api`. Configure `API_INTERNAL_URL`, `CLIENT_ORIGIN`, `PUBLIC_SITE_URL`, TLS, and `NO_INDEX=true` for staging. Production-mode web serves the generated client assets and SSR bundle.

The development private upload adapter requires `LOCAL_PRIVATE_UPLOADS=true`. It stores re-encoded images in the API’s ignored `.private/` directory. With an isolated local replica set, the commerce fixture uses `LOCAL_SHIPPING_GOVERNORATES` and `SHIPPING_FEE_EGP` for shipping validation. Run `npm.cmd run uploads:cleanup -w @gallermo/api` against the associated local database to remove expired, unbound uploads. See the implementation report for production storage requirements and retention considerations.
