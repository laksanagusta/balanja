# Go Backend + Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every direct frontend Supabase operation with a tenant-safe Go Fiber API while preserving the existing POS behavior.

**Architecture:** React sends Clerk JWTs to `/api/v1`; Fiber verifies identity and invokes focused use cases backed by pgxpool. Every database operation uses explicit `org_id` scope plus transaction-local RLS claims; checkout locks rows and writes an idempotent transaction atomically.

**Tech Stack:** Go, Fiber v3, pgx v5, Clerk JWT/JWKS, Supabase PostgreSQL/Supavisor, React 19, Vite 7, Docker Compose, Caddy

---

## Locked file structure

- `backend/cmd/api/main.go`: startup and graceful shutdown.
- `backend/internal/config/`: typed environment configuration.
- `backend/internal/auth/`: Clerk verification and request identity.
- `backend/internal/platform/{database,apperror,respond,httpserver}/`: shared infrastructure.
- `backend/internal/{product,settings,transaction,dashboard,checkout}/`: one model, service, repository, handler, and tests per feature.
- `backend/internal/integration/`: PostgreSQL RLS and checkout tests.
- `backend/migrations/`: the only active database migrations.
- `src/pos/api-client.js`: the only frontend shared-data transport.
- `src/pos/store.jsx`: UI/cart state and API orchestration; no database SDK.
- `deploy/`: Caddy, Compose, and smoke checks.

## Task 1: Bootstrap Fiber, config, and health checks

**Files:** Create `backend/go.mod`, `backend/cmd/api/main.go`, `backend/internal/config/config.go`, `backend/internal/config/config_test.go`, `backend/internal/platform/httpserver/server.go`, `backend/internal/platform/httpserver/server_test.go`.

- [ ] **Step 1: Initialize dependencies**

```bash
mkdir -p backend && cd backend
go mod init balanja/backend
go get github.com/gofiber/fiber/v3 github.com/jackc/pgx/v5/pgxpool github.com/golang-jwt/jwt/v5 github.com/MicahParks/keyfunc/v3 github.com/stretchr/testify
```

- [ ] **Step 2: Write failing tests** for missing required `DATABASE_URL`, `CLERK_ISSUER_URL`, `CLERK_AUDIENCE`; defaults `PORT=8080`, `DB_MAX_CONNS=10`, `SHUTDOWN_TIMEOUT=10s`; `/healthz` 200; `/readyz` 200 or 503 according to an injected readiness callback.

```go
app := httpserver.New(httpserver.Dependencies{Ready: func(context.Context) error { return nil }})
res, err := app.Test(httptest.NewRequest(http.MethodGet, "/healthz", nil))
require.NoError(t, err)
assert.Equal(t, 200, res.StatusCode)
```

- [ ] **Step 3: Verify RED**

Run: `cd backend && go test ./internal/config ./internal/platform/httpserver`

Expected: FAIL because `Load` and `New` are undefined.

- [ ] **Step 4: Implement minimal code**

```go
type Config struct {
    Port, DatabaseURL, ClerkIssuerURL, ClerkAudience string
    AllowedOrigins []string
    DBMaxConns int32
    ShutdownTimeout time.Duration
}
func Load(getenv func(string) string) (Config, error)
```

`main` loads config, creates Fiber, listens, catches `SIGINT/SIGTERM`, and shuts down within the configured timeout. Server construction adds recovery, request ID, JSON envelopes, `/healthz`, and `/readyz`.

- [ ] **Step 5: Verify GREEN and commit**

```bash
cd backend && go test ./internal/config ./internal/platform/httpserver
cd .. && git add backend && git commit -m "feat: bootstrap Go Fiber API"
```

## Task 2: Add pgxpool and tenant transactions

**Files:** Create `backend/internal/platform/database/pool.go`, `tenant.go`, `tenant_test.go`; modify `backend/cmd/api/main.go`.

- [ ] **Step 1: Write failing fake-transaction tests** for begin failure, parameterized claim setup, callback rollback, commit failure, and empty identity rejection.

```go
type Identity struct { OrgID, UserID string }
func WithinTenant(ctx context.Context, db Beginner, id Identity, fn func(pgx.Tx) error) error
```

Expected first statements:

```sql
select set_config('app.org_id', $1, true)
select set_config('app.user_id', $1, true)
```

- [ ] **Step 2: Verify RED:** `cd backend && go test ./internal/platform/database -v` must fail.

- [ ] **Step 3: Implement pool and helper.** Pool settings: `MaxConns` from config, `MinConns=1`, lifetime `1h`, idle `15m`, health check `1m`; ping on startup. `WithinTenant` begins, defers rollback, sets claims, calls the callback, and commits.

- [ ] **Step 4: Wire pool ping to readiness and verify**

```bash
cd backend && go test ./internal/platform/database ./internal/platform/httpserver -v
cd .. && git add backend && git commit -m "feat: add tenant database transactions"
```

## Task 3: Verify Clerk JWTs

**Files:** Create `backend/internal/auth/{identity,verifier,middleware,middleware_test}.go`, `backend/internal/platform/{apperror,error.go,respond/respond.go}`; modify server wiring.

- [ ] **Step 1: Write failing middleware tests** for absent/malformed Bearer token, verifier rejection, missing organization, and successful context identity.

```go
type Identity struct { UserID, OrgID string }
type Verifier interface { Verify(context.Context, string) (Identity, error) }
```

- [ ] **Step 2: Verify RED:** `cd backend && go test ./internal/auth -v` fails.

- [ ] **Step 3: Implement verifier** using cached Clerk JWKS. Require allowed algorithm, valid signature, `exp`, `nbf`, exact issuer/audience, `sub`, and `org_id`. Expose `NewClerkVerifier`, `Middleware`, and `FromContext`. Never log tokens or expose crypto errors.

- [ ] **Step 4: Mount protected group and verify**

```go
api := app.Group("/api/v1", deps.Auth)
```

Run `cd backend && go test ./internal/auth ./internal/platform/...`, expect PASS, then commit `feat: authenticate API requests with Clerk`.

## Task 4: Replace schema and prove RLS

**Files:** Create `backend/migrations/000001_init.up.sql`, `.down.sql`, `backend/internal/integration/rls_test.go`.

- [ ] **Step 1: Write failing integration tests** gated by `TEST_DATABASE_URL`. With org A/B transactions, prove own-row CRUD succeeds, cross-tenant reads return zero rows, cross-tenant writes fail, and runtime `rolbypassrls=false`.

- [ ] **Step 2: Verify RED:** run `cd backend && TEST_DATABASE_URL="$TEST_DATABASE_URL" go test ./internal/integration -run TestTenantRLS -v`; expect missing migration failure.

- [ ] **Step 3: Write complete migration** for `products`, `store_settings`, `transactions`, `checkout_idempotency`, and `tenant_counters`. Transactions add `cashier_user_id`, optional verified `cashier_name`, item JSON checks, payment/status checks, and unique `(org_id, number)`. Add active-product and keyset-pagination indexes and updated-at triggers.

```sql
create role balanja_api nologin nobypassrls;
alter table products enable row level security;
alter table products force row level security;
create policy products_tenant on products to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
```

Repeat an equivalent explicit policy for every tenant table, then grant only required schema/table/sequence privileges. Do not recreate the Edge Function checkout RPC or stock-protection trigger.

- [ ] **Step 4: Write full development down migration** in reverse dependency order.

- [ ] **Step 5: Provision login role once as database owner**

```sql
create role balanja_runtime login inherit;
grant balanja_api to balanja_runtime;
alter role balanja_runtime set role balanja_api;
\password balanja_runtime
```

At the interactive `\password` prompt, enter a newly generated password twice; the secret never appears in shell history or Git. Use the Supavisor session-pooler URL for `balanja_runtime` as `DATABASE_URL`.

- [ ] **Step 6: Verify GREEN and commit**

```bash
cd backend && TEST_DATABASE_URL="$TEST_DATABASE_URL" go test ./internal/integration -run TestTenantRLS -v
cd .. && git add backend/migrations backend/internal/integration && git commit -m "feat: add tenant-safe schema"
```

## Task 5: Products and settings APIs

**Files:** Create model/service/repository/handler/test files under `backend/internal/product/` and `settings/`; modify server routes.

- [ ] **Step 1: Write failing product tests** for trimming, required fields, price ≥1, initial stock ≥0, forbidden update stock, barcode conflict, and soft deactivation.

```go
type ProductRepository interface {
    List(context.Context, pgx.Tx, string) ([]Product, error)
    Create(context.Context, pgx.Tx, string, CreateInput) (Product, error)
    Update(context.Context, pgx.Tx, string, uuid.UUID, UpdateInput) (Product, error)
    Deactivate(context.Context, pgx.Tx, string, uuid.UUID) (Product, error)
}
```

- [ ] **Step 2: Write failing settings tests** for default initialization, required store name, tax rate `0..100`, and server-returned updates.

- [ ] **Step 3: Verify RED:** `cd backend && go test ./internal/product ./internal/settings -v` fails.

- [ ] **Step 4: Implement services/repositories.** Every SQL statement includes `org_id`; every method uses `WithinTenant`; product update excludes stock; settings get performs `insert ... on conflict do nothing` then select.

- [ ] **Step 5: Implement exact routes**

```text
GET/POST /api/v1/products
PUT/DELETE /api/v1/products/:id
GET/PUT /api/v1/settings
```

Reject unknown JSON fields and invalid UUIDs. Return 201 for create and stable envelopes/errors.

- [ ] **Step 6: Verify and commit:** run focused tests, then commit `feat: add product and settings APIs`.

## Task 6: Transactions and dashboard

**Files:** Create model/service/repository/handler/test files under `backend/internal/transaction/` and `dashboard/`; modify routes.

- [ ] **Step 1: Write failing pagination tests** for default 50, max 100, malformed opaque cursor, stable `(created_at,id)` descending order, and next cursor.

- [ ] **Step 2: Write failing dashboard tests** matching existing frontend fixtures: 7/30-day current and prior windows, revenue/count/average comparisons, zero-filled trend, payment mix, top five products, low-stock count/list, timezone `Asia/Jakarta`.

- [ ] **Step 3: Verify RED:** `cd backend && go test ./internal/transaction ./internal/dashboard -v` fails.

- [ ] **Step 4: Implement keyset query**

```sql
where org_id=$1 and ($2::timestamptz is null or (created_at,id)<($2,$3))
order by created_at desc,id desc limit $4
```

Fetch `limit+1`; encode cursor as base64url RFC3339Nano + UUID.

- [ ] **Step 5: Implement aggregate queries and routes** `GET /transactions` and `GET /dashboard/summary?days=7|30`, preserving current dashboard camelCase response fields.

- [ ] **Step 6: Verify and commit:** tests PASS; commit `feat: add transaction and dashboard APIs`.

## Task 7: Atomic idempotent checkout

**Files:** Create all checkout files and `backend/internal/integration/checkout_test.go`; modify migrations/routes.

- [ ] **Step 1: Write failing service tests** for empty/duplicate items, quantity <1, payment method, server-authoritative price, inactive/missing/insufficient stock, tax rounding, short cash, QRIS, and immutable snapshot.

```go
type Input struct {
    Items []struct { ProductID uuid.UUID `json:"productId"`; Quantity int `json:"quantity"` } `json:"items"`
    Payment struct { Method string `json:"method"`; CashReceived int `json:"cashReceived"` } `json:"payment"`
}
```

- [ ] **Step 2: Write failing idempotency tests**: same key/fingerprint returns original transaction; different fingerprint returns `IDEMPOTENCY_KEY_REUSED`; concurrent same key creates one transaction.

- [ ] **Step 3: Verify RED:** `cd backend && go test ./internal/checkout -v` fails.

- [ ] **Step 4: Implement one-transaction algorithm:** canonical SHA-256 fingerprint; reserve idempotency row `FOR UPDATE`; combine duplicates; sort UUIDs; lock tenant products in deterministic order; load settings; validate; compute totals; lock/increment tenant counter; insert transaction; decrement stock; attach result; commit.

- [ ] **Step 5: Add handler** requiring 8–128-character `Idempotency-Key`; first success 201, replay 200; default checkout rate limit 30/IP/minute.

- [ ] **Step 6: Prove concurrency**

```bash
cd backend
TEST_DATABASE_URL="$TEST_DATABASE_URL" go test ./internal/integration -run TestCheckout -race -v
go test ./... -race
```

Expected: one of two final-stock checkouts succeeds, one gets 409, stock becomes zero, one transaction exists; idempotent concurrency returns one transaction.

- [ ] **Step 7: Commit:** `git commit -m "feat: add atomic idempotent checkout"` with checkout, integration, migration, and route files.

## Task 8: Frontend API client

**Files:** Create `src/pos/api-client.js`, `.test.js`, `.env.example`; modify `vite.config.js`.

- [ ] **Step 1: Write failing injected-fetch tests** for token header, JSON, success envelope, `APIError`, malformed JSON, 204, abort/timeout, and checkout idempotency key.

```js
export class APIError extends Error {
  constructor({ code, message, requestId, status }) {
    super(message); Object.assign(this, { code, requestId, status });
  }
}
export function createAPIClient({ baseURL, getToken, fetchImpl = fetch }) {}
```

- [ ] **Step 2: Verify RED:** `npm test -- src/pos/api-client.test.js` fails.

- [ ] **Step 3: Implement one private request function** with fresh token per request, 10-second timeout, shared envelope parsing, and methods for products, transactions, settings, dashboard, and checkout. Checkout sends only `{productId, quantity}` plus payment and generates `crypto.randomUUID()` when needed.

- [ ] **Step 4: Add Vite `/api` dev proxy and env template** with browser-safe `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`, and blank server variables clearly marked server-only.

- [ ] **Step 5: Verify and commit:** client tests PASS; commit `feat: add frontend API client`.

## Task 9: Full frontend cutover

**Files:** Modify `src/pos/store.jsx`, replace `store.test.js`, modify `src/main.jsx`, `src/pages/DashboardPage.jsx`, and its test.

- [ ] **Step 1: Write failing store tests** using a fake API: initial parallel load, returned product mutations, checkout payload, authoritative response, cart clears only on success, APIError notice, and stale focus refetch. Keep cart localStorage behavior.

- [ ] **Step 2: Write failing dashboard test** proving 7/30 selection calls `getDashboardSummary` and no longer aggregates all transactions locally.

- [ ] **Step 3: Verify RED:** run both focused Node tests.

- [ ] **Step 4: Inject API under ClerkProvider.** Memoize client from `useAuth().getToken`, pass `api` to `POSStoreProvider`, delete `getSupabase`, org query filters, channels, and Edge Function fetch. Load products/transactions/settings with `Promise.all`; reconcile after mutations and after visible focus when older than 30 seconds.

- [ ] **Step 5: Switch dashboard data source** while preserving current loading/error/chart UI.

- [ ] **Step 6: Verify**

```bash
npm test
npm run build
```

- [ ] **Step 7: Commit only intended hunks.** Preserve existing user edits in `primitives.jsx`, `PosPage.jsx`, `SettingsPage.jsx`, and overlapping `store.jsx`; commit `feat: route frontend through Go API`.

## Task 10: Remove obsolete Supabase runtime paths

**Files:** Delete `src/pos/supabase-client.js`, `supabase/functions/checkout/index.ts`, old Supabase migrations; modify lock/package files; create `src/pos/no-direct-supabase.test.js`.

- [ ] **Step 1: Write failing static test** scanning `src/` and rejecting runtime `@supabase/supabase-js`, `supabase.from`, `supabase.rpc`, `/functions/v1`, `.channel(`, and `postgres_changes`.

- [ ] **Step 2: Verify RED:** `npm test -- src/pos/no-direct-supabase.test.js` reports current files.

- [ ] **Step 3: Remove code and dependency**

```bash
npm uninstall @supabase/supabase-js
```

Delete obsolete source/function/migrations; retain historical docs.

- [ ] **Step 4: Verify GREEN**

```bash
rg -n "@supabase/supabase-js|supabase\.from|supabase\.rpc|functions/v1|postgres_changes|\.channel\(" src package.json
npm test && npm run build
cd backend && go test ./... -race
```

Expected: `rg` has no matches; suites PASS.

- [ ] **Step 5: Commit:** `refactor: remove direct Supabase frontend access`.

## Task 11: VPS containers and Caddy

**Files:** Create `backend/Dockerfile`, `Dockerfile.frontend`, `.dockerignore`, `deploy/Caddyfile`, `deploy/compose.yaml`, `deploy/smoke.sh`.

- [ ] **Step 1: Write smoke script** asserting `/healthz` 200, `/readyz` 200, unauthenticated `/api/v1/products` 401, and `/` returns app HTML.

- [ ] **Step 2: Create pinned multi-stage images.** Backend builds static `api` and runs non-root; frontend runs `npm ci && npm run build` then copies `dist` into Caddy.

- [ ] **Step 3: Configure Caddy/Compose.** Preserve `/api` prefix, SPA fallback, TLS/compression/security headers; expose only 80/443; health checks, `restart: unless-stopped`, log rotation 10 MB ×3, and memory headroom for 2 GB.

- [ ] **Step 4: Verify**

```bash
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up -d
./deploy/smoke.sh http://localhost
docker compose -f deploy/compose.yaml down
```

- [ ] **Step 5: Commit:** `chore: add VPS deployment stack`.

## Task 12: Acceptance and operations documentation

**Files:** Create `backend/README.md`, `docs/deployment.md`; create/modify root `README.md`.

- [ ] **Step 1: Document** exact env variables, migrations, external runtime-role provisioning, local startup/tests, DNS, firewall 22/80/443, `.env` mode 600, first deploy, logs, rollback, Supabase backup, and Clerk production issuer/audience.

- [ ] **Step 2: Run automated acceptance**

```bash
cd backend && gofmt -w ./cmd ./internal && go vet ./... && go test ./... -race
cd .. && npm test && npm run build && git diff --check
TEST_DATABASE_URL="$TEST_DATABASE_URL" go test ./backend/internal/integration -race -count=1 -v
```

Expected: every command PASS.

- [ ] **Step 3: Scan boundaries and secrets**

```bash
rg -n "@supabase/supabase-js|SUPABASE_SERVICE_ROLE_KEY|supabase\.from|supabase\.rpc|functions/v1|postgres_changes" src backend package.json deploy
rg -n "DATABASE_URL=.+|BEGIN (RSA|OPENSSH) PRIVATE KEY" --glob '!*.md' --glob '!.env.example' .
```

Expected: no runtime direct-client or credential matches.

- [ ] **Step 4: Manually test two tenants:** own-only data, product CRUD/deactivate, local cart persistence, cash/QRIS checkout, concurrent final stock, idempotent replay, org switch isolation, and focus refetch.

- [ ] **Step 5: Commit docs only after inspecting status:** `docs: document backend operations and deployment`.

- [ ] **Step 6: Handoff evidence** with exact commands/counts, skipped integration/Docker checks and reason, external DNS/credential actions, and preserved user-owned working-tree changes.

## Completion definition

- All shared data passes through authenticated Fiber routes.
- Verified Clerk claims are the only tenant source.
- Runtime DB role cannot bypass RLS; cross-tenant integration tests pass.
- Checkout concurrency and idempotency pass against PostgreSQL.
- Frontend has no Supabase runtime SDK, Edge Function, RPC, or Realtime path.
- Backend/frontend tests and builds pass.
- Containers build and smoke checks pass, unless a reported local Docker limitation is the sole external blocker.
- Existing unrelated user edits remain preserved.
