# Gallermo v2 database diagnostics

24 November 2026

## Finding

The owner-facing API was initially ready and later returned `503 DATABASE_UNAVAILABLE` after the listener changed. Windows process ancestry confirmed that the final listener and its watcher run under the restricted sandbox identity. A new API started in that same restricted environment reproduced the catalog 503 on the existing standard `mongodb://` settings. Each database socket was denied with `EACCES`. Independent host-shell driver probes authenticated and selected a primary both before and during the recurrence. The evidence identifies the restricted launch context as the cause of the reproduced and recurring 503. The older login 504 has no contemporaneous proxy/API log, so its cause remains unconfirmed.

## Listener and proxy evidence

| Surface | Owner-stack result during probe |
| --- | --- |
| Web and Vite HMR | Web listening on 5173, HMR on 24678. Both belonged to the same web server process. |
| API | Loopback port 4000. Web’s configured target uses localhost and the same API port. The configured client Origin matches the web port. |
| Direct health and readiness | `GET /api/health` 200 with `db:true`. `GET /api/ready` 200 with `ready:true`. |
| Catalog and bundles | Direct products 200 with 336 total, categories 200 with seven exposed categories, bundles 200 with zero. Proxied products and readiness also returned 200. |
| Auth | A synthetic unregistered account and the configured Origin returned 401. Host timings were 396 ms direct and 361 ms through the web proxy. The restricted shell could reach the existing host API over loopback and also received 401 on both paths. |
| Test-only processes | Five stale production web listeners used ports 55174, 55184, 55194, 55204 and 55214. Process ancestry tied each to an earlier disposable fixture server. The audit stopped only those five verified test process trees. The owner web, HMR and API ports remained listening. |

The final listener on port 4000 was PID 8448 under watcher PID 16108. Both ran under the sandbox identity and the listening process had zero established MongoDB sockets. Direct and proxied readiness/catalog/login all returned 503. An independent host-shell reread during the outage completed in 2,375 ms and returned the same counts and replica-set identity. The owner processes exposed no persisted startup log in the app directories. The startup probe captured the API’s own sanitized messages from a separately bound diagnostic child. The audit did not stop the owner stack. Its existing processes can restart on source changes.

## DNS, TLS, replica set and startup

- The URI remained a standard seedlist with three hosts, TLS and an explicit replica-set setting. Hostnames, the URI, authentication fields and the database name are omitted. The URI path itself did not explicitly select a database. The driver’s configured default selected the same catalog surfaced through the owner API.
- All three seeds resolved through the system resolver. The restricted shell failed each TLS connection before certificate verification with socket `EACCES`. The MongoDB driver reported `MongoServerSelectionError`, topology `ReplicaSetNoPrimary`, and three unknown servers with `MongoNetworkError/EACCES`.
- The isolated diagnostic API used the existing settings, a separate loopback port, checkout/uploads disabled and production startup mode to disable automatic index building. Its log showed `Gallermo API listening`, followed by `Gallermo database unavailable: MongooseServerSelectionError`. While unavailable, liveness stayed 200, readiness stayed 503 and catalog consistently returned `DATABASE_UNAVAILABLE`. The runtime uses 4.5 s selection, 4 s connect, 5 s socket and 3.5 s wait-queue limits and schedules another initial connect attempt after ten seconds. See `apps/api/src/index.js`.
- The same configured credentials used through a read-only MongoDB-driver probe outside the restriction authenticated successfully. All three seeds completed authorized TLS 1.3 handshakes in 200–209 ms. The driver selected a writable primary, the replica-set identifier matched the URI and `hello` reported three members. The read-only verification completed in about 1.5 s. Atlas network settings were untouched.

## Read-only counts

| Record | Actual owner database |
| --- | ---: |
| Products | 336 |
| Published products | 336 |
| Variants across products | 1,789 |
| Categories | 8 |
| Published categories | 7 |
| Bundles | 0 |
| Published bundles | 0 |

The driver ran `hello`, one aggregation restricted to totals, and document counts. No product/customer records, credentials, host addresses or private values were printed. The baseline diff independently shows unchanged seed, catalog images, logo and chart.

## Operational interpretation

The host’s Atlas path requires no DNS, TLS, replica-set or access-list change. To restore port 4000, stop the identified restricted API watcher from its controlling terminal, then start the API from a normal Windows terminal in the repository with `npm.cmd run dev -w @gallermo/api`. Leave the existing standard URI and checkout settings in place. The existing web listener can stay up because its configured proxy already targets port 4000. Verify direct and proxied `/api/ready` return 200 before a browser sign-in. The audit left the owner-facing watcher running. If an owner-host failure recurs, capture the exact request timestamp, direct and proxied status, and redacted API server-selection/topology errors before restarting. A historical proxy 504 still needs a matching web proxy event and API timing trace across user lookup, bcrypt and session creation. Valid login, session cookies and logout were verified only with disposable credentials.

Sanitized evidence in the ZIP includes `database-host.log`, `database-sandbox.log`, `startup-sandbox.log` , `database-recurring.log`, `database-final-http.log` and `processes.log`.
