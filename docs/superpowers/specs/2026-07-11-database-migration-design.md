# Database Migration Design — Supabase + Clerk + Edge Functions

**Date:** 2026-07-11
**Status:** Approved (pending spec review)
**Scope:** MVP — migrate existing localStorage data layer to Supabase + Clerk auth + Edge Function checkout. No new features.

---

## Context

Balanja POS is a Vite SPA (React 19, Tailwind 4) currently persisting all state (products, cart, transactions, settings) to `localStorage` via `src/pos/storage.js`. The app works as a single-device demo but cannot support multi-device sync, multi-user auth, or SaaS multi-tenant isolation.

`@clerk/react` is already in `package.json` but unused.

## Requirements

- Multi-device sync — data same across all devices
- Data persistence — survives cache clear, backed up, restorable
- Multi-user / auth — multiple cashiers with login, role-based access
- Multi-tenant SaaS — sold to multiple stores, each store's data isolated
- Real-time updates — stock, transactions sync live without refresh
- Online-only — no offline support needed
- Clerk for auth (already installed)
- Vite SPA stays — no migration to Next.js/Remix
- Cart persists to localStorage (survives refresh, no cross-device sync)

## Architecture

```
Vite SPA (React 19)
  ├── Clerk (auth, JWT, org membership)
  ├── Supabase Client (CRUD + realtime, RLS via Clerk JWT)
  └── Edge Function /checkout (atomic stock decrement + transaction insert)

Supabase PostgreSQL
  ├── RLS policies filter all queries by clerk org_id from JWT
  └── Edge Function uses service role key (bypasses RLS, server-side only)
```

Three communication paths:
1. **Clerk → Frontend**: Auth state, JWT tokens, `org_id` as tenant identifier
2. **Supabase Client → Supabase PG**: CRUD for products, settings, transactions (read). Realtime via WebSocket. RLS filters by `clerk_org_id`.
3. **Edge Function → Supabase PG**: Checkout atomic transaction. Server-side validation via ported domain logic.

## Database Schema

```sql
-- Products
create table products (
  id uuid default gen_random_uuid() primary key,
  org_id text not null,
  name text not null,
  barcode text not null,
  category text not null,
  price integer not null check (price >= 1),
  stock integer not null default 0 check (stock >= 0),
  unit text not null,
  image text default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, barcode)
);

-- Transactions
create table transactions (
  id uuid default gen_random_uuid() primary key,
  org_id text not null,
  number text not null,
  cashier_name text not null,
  items jsonb not null,
  subtotal integer not null,
  tax integer not null default 0,
  total integer not null,
  payment_method text not null,
  cash_received integer not null default 0,
  change_due integer not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

-- Store settings (singleton per org)
create table store_settings (
  org_id text primary key,
  store_name text not null default 'Toko Balanja',
  store_address text not null default '',
  tax_enabled boolean not null default false,
  tax_rate integer not null default 11,
  qris_label text not null default 'QRIS Toko Balanja',
  updated_at timestamptz not null default now()
);
```

Cart is NOT stored in the database. It remains ephemeral + localStorage only.

### RLS Policies

All tables have RLS enabled. Policies filter by `clerk_org_id` extracted from the Clerk JWT:

```sql
-- Example for products
create policy "products_select" on products
  for select to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'));

create policy "products_insert" on products
  for insert to authenticated
  with check (org_id = (auth.jwt() ->> 'org_id'));

create policy "products_update" on products
  for update to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'));
```

Same pattern for `transactions` and `store_settings`.

**Column-level restriction on `products.stock`:** Direct client writes to `stock` are denied. Only the Edge Function (via service role key) can decrement stock during checkout. Implemented via a `BEFORE UPDATE` trigger on `products` that rejects `stock` column changes unless the current role is `service_role`.

## Edge Function: Checkout

`supabase/functions/checkout/index.ts`

Input: `{ cart, payment, cashierName }` + Clerk JWT in `Authorization` header.

Flow:
1. Verify JWT, extract `org_id`
2. Validate cart + payment (port of `domain.js` validation)
3. `BEGIN TRANSACTION`
   - `SELECT ... FOR UPDATE` on product rows
   - Check `stock >= qty` for each cart item
   - `UPDATE products SET stock = stock - qty`
   - `INSERT INTO transactions (...)`
4. `COMMIT`
5. Return `{ ok: true, transaction }` or `{ ok: false, error }`

Service role key stored in Supabase secrets (env var, server-side only). Never exposed to client.

## Frontend State Migration

### Current → Target

| Concern | Current | Target |
|---------|---------|--------|
| products | localStorage | Supabase SELECT + Realtime |
| cart | localStorage | localStorage (unchanged) |
| transactions | localStorage | Supabase SELECT + Realtime |
| settings | localStorage | Supabase SELECT/UPSERT |
| `saveProduct` | setState + localStorage | Supabase INSERT/UPDATE + optimistic setState |
| `checkout` | setState + domain.js | POST Edge Function + update state from response |
| `addToCart` | setState | setState (unchanged, local) |
| `updateSettings` | setState + localStorage | Supabase UPSERT + optimistic setState |
| `resetDemoData` | localStorage.removeItem | Removed — seed via SQL migration |

### New files

- `src/pos/supabase-client.js` — Supabase client factory, injects Clerk JWT as Authorization header
- `src/pos/cart-storage.js` — localStorage for cart only (extracted from `storage.js`)

### Removed files

- `src/pos/storage.js` — replaced by `supabase-client.js` + `cart-storage.js`

### Domain logic split

- **Client-side** (stays in `domain.js`): `formatIDR`, `calculateCartTotals`, `validateProduct`, `normalizeBarcode` — used for form validation and optimistic UI
- **Server-side** (ported to Edge Function): `checkoutCart` logic — atomic stock decrement + transaction insert via SQL transaction

### Optimistic update pattern

For every Supabase write:
1. Update local state immediately
2. Fire Supabase query
3. On error → rollback state + show notice
4. On success → realtime subscription confirms (other devices auto-update)

### Cart behavior

Cart persists to localStorage (survives browser refresh). Not synced across devices. Reset to `[]` after checkout. No database table for cart.

## Security Considerations

1. **RLS correctness is critical** — one misconfigured policy = cross-tenant data leak. Comprehensive RLS tests required.
2. **Client writes restricted** — `products.stock` column not writable by client directly. Only Edge Function via service role.
3. **Edge Function must re-validate all input** — don't trust client payload. Port `domain.js` validation 1:1.
4. **Service role key** — stored in Supabase secrets (server-side), never committed to git, never sent to client.
5. **Rate limiting** — Clerk rate limiting for auth. Edge Function can implement Deno KV-based rate limiting.
6. **Audit log** — parked for v2. Not in MVP scope.

## Testing Strategy

### Pure function tests (unchanged)
`domain.test.js`, `store.test.js` — `node --test`. No changes for pure functions.

### RLS policy tests (new)
`supabase/migrations/001_rls.test.sql` — test with two anon roles (different `org_id` JWTs):
- Cross-org SELECT → denied
- Cross-org INSERT/UPDATE → denied
- Same-org operations → allowed

### Edge Function tests (new)
`supabase/functions/checkout/checkout.test.ts`:
- Empty cart → error
- Insufficient stock → error, no decrement, no transaction
- Cash short → error
- Successful checkout → stock decremented, transaction inserted

### Store integration tests (adapted)
`store.test.js` — mock Supabase client:
- `saveProduct` calls Supabase INSERT + optimistic state update
- `checkout` calls Edge Function + state update from response
- `addToCart` remains local only

### Manual E2E security test
- Login as Clerk user A (org A), user B (org B)
- Verify A cannot see B's data
- Update stock as A, verify B does not see it

## Project Structure

```
frontend/
├── src/
│   ├── pos/
│   │   ├── domain.js          # unchanged pure functions
│   │   ├── domain.test.js
│   │   ├── store.jsx          # adapted — Supabase + Clerk
│   │   ├── store.test.js      # adapted
│   │   ├── product-save.js    # unchanged
│   │   ├── supabase-client.js # NEW
│   │   └── cart-storage.js    # NEW
│   ├── components/            # unchanged
│   ├── pages/                 # unchanged
│   ├── dashboard/             # unchanged
│   └── index.css              # unchanged
├── supabase/
│   ├── migrations/
│   │   ├── 001_init_schema.sql
│   │   └── 002_seed_demo_data.sql
│   └── functions/
│       └── checkout/
│           ├── index.ts
│           └── checkout.test.ts
├── .env                       # SUPABASE_URL, SUPABASE_ANON_KEY, CLERK_PUBLISHABLE_KEY
└── package.json
```

## MVP Scope

**Included:**
- Migrate existing features to Supabase + Clerk + Edge Function checkout
- RLS policies with clerk org_id isolation
- Realtime subscriptions for products + transactions
- Cart stays in localStorage

**Excluded (v2):**
- Audit log table
- Multi-store (one org = multiple stores)
- Rate limiting in Edge Functions
- Offline support
- New features beyond existing functionality