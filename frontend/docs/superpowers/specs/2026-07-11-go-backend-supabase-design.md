# Go Backend + Supabase Design

**Date:** 2026-07-11  
**Status:** Approved  
**Scope:** Full pre-production cutover from direct frontend Supabase access to a Go Fiber API

## Context

Balanja is a React/Vite multi-tenant POS application. The current frontend uses Clerk for authentication and `@supabase/supabase-js` for products, transactions, settings, and Realtime subscriptions. Checkout is handled by a Supabase Edge Function backed by a PostgreSQL RPC.

The application has not been deployed, so the architecture can be replaced in one cutover without dual writes, feature flags, or backward compatibility. The initial target is at most 10 stores with at most 5 concurrently active cashiers per store. The production API will run as a long-lived process on a 2-vCPU, 2-GB VPS. Supabase remains the managed PostgreSQL provider.

## Goals

- Route every shared-data operation through a Go Fiber API.
- Remove all direct Supabase database, Edge Function, and Realtime access from the frontend.
- Keep Clerk as the identity provider and Clerk organization ID as the tenant identifier.
- Preserve strict tenant isolation with repository filtering and PostgreSQL RLS.
- Make checkout atomic, concurrency-safe, and idempotent.
- Keep the initial deployment appropriate for a small VPS and approximately 50 concurrent sessions.

## Non-goals

- Realtime synchronization between devices.
- Offline operation or queued writes.
- Redis, message queues, Kubernetes, or a separate observability stack.
- Moving authentication from Clerk to Supabase Auth.
- Hosting PostgreSQL on the VPS.
- Supporting the old direct-Supabase frontend after cutover.
- Introducing inventory adjustment, audit log, or multi-store-per-organization features.

## Architecture

```text
React/Vite
   │ HTTPS + Clerk session JWT
   ▼
Caddy
   │ /api/*
   ▼
Go Fiber API
   ├── Clerk JWT verification
   ├── tenant-aware use cases
   ├── validation and error mapping
   └── pgxpool (max 10 connections initially)
          │
          ▼
Supabase Supavisor session pooler
          │
          ▼
Supabase PostgreSQL
```

The frontend never imports a Supabase client. It obtains a Clerk session token and sends it as a Bearer token to the API. The API verifies the token and derives `user_id` and `org_id` from verified claims. Tenant identity supplied in a body, header, path, or query parameter is ignored.

The Go service connects through the Supabase session pooler using `pgxpool`. The initial maximum is 10 database connections because 50 user sessions do not require 50 persistent connections. Pool size remains configurable.

The database connection uses a dedicated application role with least privilege. The application must not use the `postgres` user, a Supabase service-role key, or any role with `BYPASSRLS` for normal requests.

Cart state remains in React state and browser `localStorage`. It is not shared data and does not pass through the API until checkout.

## Repository Layout

The existing Git repository root is currently `frontend/`. During implementation, it will become the application repository root in practice, while retaining the existing frontend files. The new backend and deployment directories are placed alongside `src/`:

```text
frontend/
├── src/                         # existing React/Vite application
├── backend/
│   ├── cmd/api/
│   ├── internal/
│   │   ├── auth/
│   │   ├── database/
│   │   ├── domain/
│   │   ├── product/
│   │   ├── checkout/
│   │   ├── transaction/
│   │   ├── settings/
│   │   ├── dashboard/
│   │   ├── repository/postgres/
│   │   └── transport/http/
│   ├── migrations/
│   ├── go.mod
│   └── go.sum
├── deploy/
│   └── compose.yaml
└── docs/
```

Transport code only parses HTTP input and maps output. Use cases own business rules. PostgreSQL repositories own SQL and row mapping. Domain and use-case packages do not depend on Fiber, so they can be tested without an HTTP server.

## API Contract

All business endpoints use the `/api/v1` prefix and require a valid Clerk JWT.

```text
GET    /healthz
GET    /readyz

GET    /api/v1/products
POST   /api/v1/products
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id

GET    /api/v1/transactions
POST   /api/v1/checkouts

GET    /api/v1/settings
PUT    /api/v1/settings

GET    /api/v1/dashboard/summary
```

### Response envelope

Successful responses use:

```json
{
  "data": {},
  "meta": {}
}
```

Failed responses use:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stok produk tidak mencukupi",
    "requestId": "request-id"
  }
}
```

Expected status mappings are:

- `400` for malformed JSON or invalid fields.
- `401` for absent, expired, or invalid authentication.
- `403` for a missing active organization or insufficient permission.
- `404` when a resource does not exist in the authenticated tenant.
- `409` for uniqueness, stock, idempotency, or concurrent-update conflicts.
- `422` for business-rule failures.
- `429` for rate limiting.
- `500` for internal errors with no database detail exposed.

### Products

The backend normalizes barcodes, validates price and initial stock, and enforces barcode uniqueness within the authenticated tenant. Product deletion is a soft delete (`active = false`) so historical transaction snapshots remain valid.

General product edits cannot modify stock. Initial stock may be provided only when creating a product. Subsequent stock changes occur through checkout; a dedicated inventory-adjustment capability is deferred.

### Transactions

Transaction listing is read-only and cursor-paginated, initially defaulting to 50 records per page. The cursor is opaque to the frontend. Tenant filtering occurs in both the repository query and RLS.

### Dashboard

The dashboard summary endpoint returns server-side aggregates required by the current dashboard. The frontend does not download the complete transaction history merely to calculate KPIs.

### Settings

Settings remain a singleton per organization. `GET` returns the tenant's settings, creating defaults only through an explicit server-controlled initialization path. `PUT` validates the complete supported settings payload and updates only the authenticated tenant.

## Checkout

The checkout request contains only identifiers, quantities, and payment input:

```json
{
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2
    }
  ],
  "payment": {
    "method": "cash",
    "cashReceived": 100000
  }
}
```

The client is not authoritative for product name, barcode, price, tax, totals, cashier identity, or tenant identity. The backend obtains these from verified claims, settings, and locked database rows.

Checkout runs in one PostgreSQL transaction:

1. Establish the transaction-scoped tenant and user context.
2. Validate request shape, quantities, and payment method.
3. Select all requested products for the tenant with `FOR UPDATE` in deterministic product-ID order.
4. Reject missing, inactive, or insufficient-stock products.
5. Calculate subtotal and tax from current database values and tenant settings.
6. Validate cash received and calculate change.
7. Decrement stock.
8. Insert the transaction with an immutable JSON snapshot of purchased items.
9. Store the idempotency result.
10. Commit and return the complete transaction.

Any failure rolls back every change. Deterministic lock ordering prevents avoidable deadlocks when carts contain overlapping products.

The endpoint requires an `Idempotency-Key` header. A key is unique within `org_id` and is stored with a request fingerprint and the resulting transaction ID. Reusing the same key with the same fingerprint returns the original successful result. Reusing it with a different payload returns `409 IDEMPOTENCY_KEY_REUSED`.

The authenticated Clerk user ID is stored as `cashier_user_id`. A display name may be stored only when obtained from a verified Clerk claim; otherwise UI presentation falls back to the user ID until profile synchronization is introduced.

## Authentication and Tenant Isolation

The JWT middleware verifies:

- signature against Clerk JWKS;
- token expiry and not-before time;
- configured issuer;
- configured audience;
- subject/user ID;
- active organization ID.

Verified request identity is stored in request context. Raw JWTs are never logged.

Every database operation uses a transaction helper, including reads. The helper begins a transaction, sets transaction-local verified claims, invokes repository work, and commits or rolls back. Transaction-local configuration cannot leak into the next pooled request.

Every tenant-owned repository query also includes an explicit `org_id` predicate. PostgreSQL RLS uses the transaction-local claim and serves as defense in depth. The application role has only the CRUD privileges required by the API and does not bypass RLS.

The precise claim-setting SQL and RLS expression will be defined in the implementation plan and migration together, then tested with two tenants. The required invariant is unambiguous: a request authenticated for organization A cannot read, create, update, deactivate, aggregate, or check out data owned by organization B.

## Frontend Data Flow

The frontend gains one API client responsible for:

- obtaining the current Clerk token;
- attaching Authorization, Content-Type, request ID, and idempotency headers;
- enforcing request timeouts and abort handling;
- parsing the response envelope;
- converting API errors into stable application errors.

On application load, the frontend fetches products, transactions, and settings. After a successful mutation, it uses the returned server representation to update local state immediately. A refetch reconciles state after mutations and when a browser tab becomes active after a configurable stale interval.

Realtime subscriptions are removed. Cross-device changes become visible on the next refetch or page focus. Realtime through the Go backend is deferred until usage demonstrates a need.

## Database Changes

Existing Supabase tables and valid data are retained. Migrations add or revise:

- the least-privilege application role and grants;
- RLS policies compatible with the transaction-local Clerk claims;
- `cashier_user_id` on transactions if absent;
- an idempotency table keyed by organization and idempotency key;
- supporting tenant and pagination indexes;
- constraints required by the API contract.

The existing PostgreSQL checkout RPC and Supabase Edge Function are removed after the Go checkout tests pass. No frontend-accessible service role or database credential remains.

## Error Handling and Operational Safety

PostgreSQL and internal errors are mapped to stable domain/API error codes. Raw constraint names, SQL, stack traces, connection strings, tokens, and payment details are not returned or written to normal logs.

Fiber uses centralized error handling, panic recovery, strict CORS allowlisting, request/body size limits, server timeouts, request IDs, and light rate limiting. Checkout receives stricter rate limiting than read endpoints.

Concurrent purchases of the last available unit are serialized by row locks. One request succeeds and the other receives `409 INSUFFICIENT_STOCK`; the failed client refetches product data.

## Testing Strategy

### Backend

- Unit tests for validation, totals, tax, change, and error mapping.
- Handler tests for authentication, status codes, and JSON contracts.
- Repository integration tests against PostgreSQL.
- Checkout tests for success, empty cart, invalid quantities, inactive products, insufficient stock, short cash, QRIS, rollback, and deterministic lock behavior.
- Concurrent checkout test proving that only one purchase can consume the final stock.
- Idempotency tests for same-key replay and conflicting-key reuse.
- JWT tests for valid, absent, expired, wrong-issuer, wrong-audience, and no-organization tokens.
- Tenant-isolation tests covering every tenant-owned operation with organization A and B.
- Migration test from an empty test database.

### Frontend

- API-client tests for token attachment, timeouts, aborts, envelopes, and API errors.
- Store tests using a fake API client rather than a mocked Supabase client.
- UI tests for loading, retry, empty state, and checkout errors.
- Existing pure domain and cart-localStorage tests are retained where still applicable.

### Cutover verification

- Static search finds no `supabase.from`, `supabase.rpc`, `/functions/v1`, Realtime subscription, or frontend Supabase client import.
- `@supabase/supabase-js` is absent from frontend dependencies.
- A two-tenant smoke test confirms isolation.
- Parallel checkout against final stock confirms atomicity.
- Frontend and backend test suites and production builds pass.

## Full Pre-production Cutover

Because the product is not deployed, implementation is a single clean replacement:

1. Retain the correct Supabase schema and development data.
2. Add database role, RLS, idempotency, constraints, and indexes.
3. Build and test the complete Go API.
4. Replace all frontend shared-data access with the Go API client.
5. Remove the frontend Supabase client and Realtime code.
6. Remove the Supabase checkout Edge Function and obsolete PostgreSQL RPC.
7. Remove `@supabase/supabase-js`.
8. Run all automated and manual isolation/concurrency checks.
9. Deploy frontend and backend together as the first production release.

No dual-write, compatibility adapter, feature flag, or old-architecture rollback path is required.

## Deployment

```text
Internet :443
    │
    ▼
Caddy
    ├── /api/*  → Go Fiber :8080
    └── /*       → built Vite static files
```

Docker Compose is the preferred initial deployment. The VPS runs only Caddy and the Go application; PostgreSQL remains in Supabase.

Server-only configuration includes:

- `DATABASE_URL` for the Supabase session pooler;
- Clerk issuer/JWKS configuration;
- Clerk audience;
- allowed frontend origins;
- pool limits and HTTP/database timeouts;
- log level and environment name.

The browser receives only the Clerk publishable key and API base URL.

Minimum production operations include automatic TLS, health/readiness checks, structured logs with rotation, graceful shutdown, a restart policy, Supabase database backups, VPS snapshots before major changes, immutable deployment image tags, and retention of one previous image for rollback.

Initial monitoring covers uptime, CPU, memory, disk, API latency, HTTP 5xx rate, database pool saturation, and checkout failures. Redis, queues, tracing infrastructure, and a metrics cluster are deferred.

## Capacity Assumption

The initial 2-vCPU, 2-GB VPS is sufficient for the defined scope of at most 10 stores and approximately 50 concurrent cashier sessions because PostgreSQL is external and the Go service is lightweight. The design permits vertical VPS upgrades and pool tuning without changing API or domain boundaries.

## Success Criteria

- The browser has no direct Supabase database, Realtime, or Edge Function access.
- Every protected API operation derives tenant identity from a verified Clerk JWT.
- Cross-tenant access is rejected by both explicit query scope and RLS tests.
- Checkout is atomic under concurrency and safe to retry.
- Existing product, transaction, settings, dashboard, cart, and checkout user flows remain functional.
- Backend and frontend tests and production builds pass.
- The application runs within the initial VPS constraints with health checks and graceful shutdown.
