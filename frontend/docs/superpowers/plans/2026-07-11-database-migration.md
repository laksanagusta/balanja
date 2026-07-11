# Database Migration — Supabase + Clerk + Edge Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Balanja POS from localStorage to Supabase PostgreSQL with Clerk auth, RLS-based multi-tenant isolation, and an Edge Function for atomic checkout.

**Architecture:** Vite SPA stays client-only. Supabase JS client reads/writes directly to PostgreSQL with RLS policies filtering by Clerk `org_id` from the JWT. A single Edge Function (`/checkout`) handles atomic stock decrement + transaction insert using a service role key. Cart remains in localStorage. Realtime subscriptions keep products and transactions in sync across devices.

**Tech Stack:** React 19, Vite 7, Tailwind 4, Clerk (`@clerk/react`), Supabase JS client (`@supabase/supabase-js`), Supabase Edge Functions (Deno), PostgreSQL 15+

**Spec:** `docs/superpowers/specs/2026-07-11-database-migration-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|----------------|
| `src/pos/supabase-client.js` | Supabase client factory — accepts Clerk JWT, returns a typed client instance |
| `src/pos/cart-storage.js` | localStorage load/save/reset for cart only (extracted from `storage.js`) |
| `supabase/migrations/001_init_schema.sql` | Tables, indexes, RLS policies, stock-protection trigger |
| `supabase/migrations/002_seed_demo_data.sql` | Seed products + default settings for a demo org |
| `supabase/functions/checkout/index.ts` | Edge Function — atomic checkout with server-side validation |

### Modified files

| File | Changes |
|------|---------|
| `src/pos/store.jsx` | Replace localStorage with Supabase client + realtime subscriptions; cart stays localStorage |
| `src/pos/store.test.js` | Adapt tests for async actions + mock Supabase client |
| `src/pos/domain.js` | Remove `checkoutCart` export (logic moves to Edge Function); keep pure functions |
| `src/pos/domain.test.js` | Remove `checkoutCart` test; keep remaining pure function tests |
| `src/pos/storage.js` | Delete — replaced by `supabase-client.js` + `cart-storage.js` |
| `src/main.jsx` | Wrap with Clerk org context, pass org_id to POSStoreProvider |
| `src/pages/SettingsPage.jsx` | Remove `resetDemoData` button + handler |
| `.env.example` | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| `package.json` | Add `@supabase/supabase-js` dependency |

### Unchanged files

All components in `src/components/`, all pages except SettingsPage, `src/dashboard/analytics.js`, `src/shared.jsx`, `src/pos/product-save.js`, `src/index.css`

---

## Task 1: Install Supabase dependency and update env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install @supabase/supabase-js**

Run:
```bash
npm install @supabase/supabase-js
```

Expected: `package.json` gains `"@supabase/supabase-js"` in `dependencies`.

- [ ] **Step 2: Update .env.example**

Replace the contents of `.env.example` with:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add @supabase/supabase-js and env vars for Supabase"
```

---

## Task 2: Write the SQL migration — schema, RLS, and trigger

**Files:**
- Create: `supabase/migrations/001_init_schema.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/001_init_schema.sql` with:

```sql
-- Balanja POS — initial schema
-- Tables: products, store_settings, transactions
-- RLS: filter by clerk org_id from JWT
-- Trigger: block direct client writes to products.stock

-- ============ TABLES ============

create table if not exists products (
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

create table if not exists transactions (
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

create table if not exists store_settings (
  org_id text primary key,
  store_name text not null default 'Toko Balanja',
  store_address text not null default '',
  tax_enabled boolean not null default false,
  tax_rate integer not null default 11,
  qris_label text not null default 'QRIS Toko Balanja',
  updated_at timestamptz not null default now()
);

-- ============ INDEXES ============

create index if not exists products_org_id_idx on products (org_id);
create index if not exists transactions_org_id_idx on transactions (org_id);
create index if not exists transactions_created_at_idx on transactions (org_id, created_at desc);

-- ============ RLS ============

alter table products enable row level security;
alter table transactions enable row level security;
alter table store_settings enable row level security;

-- products: select, insert, update (active, name, barcode, category, price, unit, image)
create policy "products_select" on products
  for select to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'));

create policy "products_insert" on products
  for insert to authenticated
  with check (org_id = (auth.jwt() ->> 'org_id'));

create policy "products_update" on products
  for update to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'))
  with check (org_id = (auth.jwt() ->> 'org_id'));

-- transactions: select only from client (insert handled by Edge Function)
create policy "transactions_select" on transactions
  for select to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'));

-- store_settings: select + upsert
create policy "settings_select" on store_settings
  for select to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'));

create policy "settings_insert" on store_settings
  for insert to authenticated
  with check (org_id = (auth.jwt() ->> 'org_id'));

create policy "settings_update" on store_settings
  for update to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'))
  with check (org_id = (auth.jwt() ->> 'org_id'));

-- ============ STOCK PROTECTION TRIGGER ============

-- Block direct client UPDATE of products.stock unless caller is service_role.
-- Edge Function uses service role key which bypasses RLS and triggers.

create or replace function protect_stock_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The checkout() RPC function uses SET LOCAL ROLE service_role before
  -- updating stock. Authenticated clients don't set this role, so the
  -- trigger blocks direct stock writes from the client.
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;

  -- For authenticated (client) updates: block if stock changed
  if new.stock is distinct from old.stock then
    raise exception 'Direct stock updates are not allowed. Use the checkout Edge Function.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger products_protect_stock
  before update on products
  for each row
  execute function protect_stock_column();

-- ============ UPDATED_AT TRIGGER ============

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on products
  for each row
  execute function set_updated_at();

create trigger store_settings_set_updated_at
  before update on store_settings
  for each row
  execute function set_updated_at();

-- ============ ATOMIC CHECKOUT RPC ============

-- Single-call atomic checkout: validate stock, decrement, insert transaction
-- Called by the Edge Function via supabase.rpc('checkout', { ... })
-- Uses SET ROLE service_role to bypass the stock-protection trigger

create or replace function checkout(
  p_org_id text,
  p_cart jsonb,
  p_payment_method text,
  p_cash_received integer,
  p_cashier_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product record;
  v_settings record;
  v_subtotal integer := 0;
  v_tax integer := 0;
  v_total integer := 0;
  v_change_due integer := 0;
  v_txn_count integer;
  v_transaction_number text;
  v_transaction_id uuid;
begin
  -- Validate cart is not empty
  if jsonb_array_length(p_cart) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Cart is empty');
  end if;

  -- Fetch settings
  select store_name, tax_enabled, tax_rate into v_settings
  from store_settings where org_id = p_org_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Store settings not found');
  end if;

  -- Calculate totals
  for v_item in select * from jsonb_array_elements(p_cart) loop
    v_subtotal := v_subtotal + ((v_item ->> 'price')::integer) * ((v_item ->> 'qty')::integer);
  end loop;
  v_tax := case when v_settings.tax_enabled
    then round(v_subtotal * (v_settings.tax_rate / 100.0))::integer
    else 0 end;
  v_total := v_subtotal + v_tax;

  -- Validate cash payment
  if p_payment_method = 'cash' and p_cash_received < v_total then
    return jsonb_build_object('ok', false, 'error', 'Cash received is less than total');
  end if;
  v_change_due := case when p_payment_method = 'cash' then p_cash_received - v_total else 0 end;

  -- Validate + lock product rows, check stock and price
  for v_item in select * from jsonb_array_elements(p_cart) loop
    select id, stock, price, active into v_product
    from products
    where id = (v_item ->> 'productId')::uuid
      and org_id = p_org_id
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'error', (v_item ->> 'name') || ' not found');
    end if;
    if not v_product.active then
      return jsonb_build_object('ok', false, 'error', (v_item ->> 'name') || ' is unavailable');
    end if;
    if (v_item ->> 'qty')::integer > v_product.stock then
      return jsonb_build_object('ok', false, 'error', (v_item ->> 'name') || ' stock is not enough');
    end if;
    if (v_item ->> 'price')::integer <> v_product.price then
      return jsonb_build_object('ok', false, 'error', (v_item ->> 'name') || ': price mismatch');
    end if;
  end loop;

  -- Generate transaction number
  select count(*) into v_txn_count from transactions where org_id = p_org_id;
  v_transaction_number := 'TRX-' || lpad((v_txn_count + 1)::text, 4, '0');

  -- Insert transaction
  insert into transactions (
    org_id, number, cashier_name, items, subtotal, tax, total,
    payment_method, cash_received, change_due, status
  ) values (
    p_org_id, v_transaction_number, p_cashier_name, p_cart,
    v_subtotal, v_tax, v_total, p_payment_method,
    p_cash_received, v_change_due, 'completed'
  ) returning id into v_transaction_id;

  -- Decrement stock (bypass stock trigger via SET ROLE)
  set local role service_role;
  for v_item in select * from jsonb_array_elements(p_cart) loop
    update products
    set stock = stock - (v_item ->> 'qty')::integer,
        updated_at = now()
    where id = (v_item ->> 'productId')::uuid
      and org_id = p_org_id;
  end loop;
  reset role;

  return jsonb_build_object(
    'ok', true,
    'transaction', jsonb_build_object(
      'id', v_transaction_id,
      'number', v_transaction_number,
      'cashierName', p_cashier_name,
      'items', p_cart,
      'subtotal', v_subtotal,
      'tax', v_tax,
      'total', v_total,
      'paymentMethod', p_payment_method,
      'cashReceived', p_cash_received,
      'changeDue', v_change_due,
      'status', 'completed',
      'createdAt', now()::text
    )
  );
end;
$$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/001_init_schema.sql
git commit -m "feat: add database schema with RLS policies and stock protection trigger"
```

---

## Task 3: Write seed data migration

**Files:**
- Create: `supabase/migrations/002_seed_demo_data.sql`

- [ ] **Step 1: Write the seed migration**

Create `supabase/migrations/002_seed_demo_data.sql` with:

```sql
-- Seed demo data for a test org.
-- Replace 'org_test_demo' with a real Clerk org_id before running in production.

insert into store_settings (org_id, store_name, store_address, tax_enabled, tax_rate, qris_label)
values ('org_test_demo', 'Toko Balanja', 'Jl. UMKM No. 1', false, 11, 'QRIS Toko Balanja')
on conflict (org_id) do nothing;

insert into products (org_id, name, barcode, category, price, stock, unit, image, active, created_at, updated_at)
values
  ('org_test_demo', 'Beras Ramos 5kg', '8991001000011', 'Sembako', 72000, 18, 'pack', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Gula Pasir 1kg', '8991001000028', 'Sembako', 17500, 24, 'pack', 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Mie Instan Goreng', '8991001000035', 'Snack', 3500, 80, 'pcs', 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Air Mineral 600ml', '8991001000042', 'Minuman', 4000, 64, 'botol', 'https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Sabun Mandi Batang', '8991001000059', 'Perawatan', 5500, 36, 'pcs', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Deterjen Bubuk 800g', '8991001000066', 'Rumah Tangga', 18500, 20, 'pack', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80', true, now(), now())
on conflict (org_id, barcode) do nothing;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/002_seed_demo_data.sql
git commit -m "feat: add seed demo data migration for test org"
```

---

## Task 4: Create the Supabase client factory

**Files:**
- Create: `src/pos/supabase-client.js`

- [ ] **Step 1: Write supabase-client.js**

Create `src/pos/supabase-client.js` with:

```js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export function createSupabaseClient(clerkToken) {
  const options = clerkToken
    ? { global: { headers: { Authorization: `Bearer ${clerkToken}` } } }
    : {};

  return createClient(supabaseUrl, supabaseAnonKey, options);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pos/supabase-client.js
git commit -m "feat: add Supabase client factory with Clerk JWT injection"
```

---

## Task 5: Create cart-storage.js (extracted from storage.js)

**Files:**
- Create: `src/pos/cart-storage.js`

- [ ] **Step 1: Write cart-storage.js**

Create `src/pos/cart-storage.js` with:

```js
const CART_KEY = "balanja-retail-cart-v1";

export function loadCart(storage = window.localStorage) {
  try {
    const raw = storage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart, storage = window.localStorage) {
  storage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCartStorage(storage = window.localStorage) {
  storage.removeItem(CART_KEY);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pos/cart-storage.js
git commit -m "feat: extract cart localStorage into cart-storage.js"
```

---

## Task 6: Write the checkout Edge Function

**Files:**
- Create: `supabase/functions/checkout/index.ts`

The Edge Function does input validation, extracts `org_id` from the Clerk JWT, then delegates the atomic stock decrement + transaction insert to the `checkout()` PostgreSQL function (defined in Task 2) via `supabase.rpc()`. This ensures true atomicity — all validation, stock decrement, and transaction insert happen in a single SQL transaction.

- [ ] **Step 1: Write the Edge Function**

Create `supabase/functions/checkout/index.ts` with:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  price: number;
  qty: number;
}

interface Payment {
  method: "cash" | "qris";
  cashReceived?: number;
}

interface CheckoutRequest {
  cart: CartItem[];
  payment: Payment;
  cashierName: string;
}

function validateInput(body: CheckoutRequest): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!Array.isArray(body.cart) || body.cart.length === 0) return "Cart is empty";
  if (!body.payment || !body.payment.method) return "Payment method is required";
  if (body.payment.method !== "cash" && body.payment.method !== "qris") {
    return "Payment method must be cash or qris";
  }
  if (!body.cashierName || !String(body.cashierName).trim()) return "Cashier name is required";

  for (const item of body.cart) {
    if (!item.productId) return "Cart item missing productId";
    if (!item.name) return "Cart item missing name";
    if (!item.barcode) return "Cart item missing barcode";
    if (Number(item.price) < 1 || Number.isNaN(Number(item.price))) return `${item.name}: price must be at least 1`;
    if (Number(item.qty) < 1 || Number.isNaN(Number(item.qty))) return `${item.name}: quantity must be at least 1`;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract org_id from Clerk JWT in Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "Missing auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // Decode JWT payload to extract org_id
  // The service role client bypasses RLS, so we MUST extract org_id ourselves
  let orgId: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    orgId = payload.org_id || payload["org_id"] || null;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!orgId) {
    return new Response(JSON.stringify({ ok: false, error: "No org_id in token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validationError = validateInput(body);
  if (validationError) {
    return new Response(JSON.stringify({ ok: false, error: validationError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create service-role Supabase client (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Call the atomic checkout() PostgreSQL function via RPC.
  // The function handles: stock validation, FOR UPDATE lock, decrement, transaction insert.
  const cashReceived = body.payment.method === "cash" ? Number(body.payment.cashReceived) : 0;

  const { data: result, error: rpcError } = await supabase.rpc("checkout", {
    p_org_id: orgId,
    p_cart: JSON.stringify(body.cart),
    p_payment_method: body.payment.method,
    p_cash_received: cashReceived,
    p_cashier_name: body.cashierName,
  });

  if (rpcError) {
    return new Response(JSON.stringify({ ok: false, error: rpcError.message || "Checkout failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/checkout/index.ts
git commit -m "feat: add checkout Edge Function with atomic stock decrement"
```

---

## Task 7: Adapt domain.js — remove checkoutCart

**Files:**
- Modify: `src/pos/domain.js`
- Modify: `src/pos/domain.test.js`

- [ ] **Step 1: Remove checkoutCart and createTransactionNumber from domain.js**

In `src/pos/domain.js`, delete the `checkoutCart` function (lines 187-232) and the `createTransactionNumber` function (lines 235-237). The remaining exports should be: `defaultSettings`, `retailCategories`, `seedProducts`, `formatIDR`, `normalizeBarcode`, `validateProduct`, `validateScannedProduct`, `findProductByBarcode`, `addProductToCart`, `addSavedProductToCart`, `calculateCartTotals`.

The file should end after `calculateCartTotals`:

```js
export function calculateCartTotals(cart, settings) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const tax = settings.taxEnabled ? Math.round(subtotal * (Number(settings.taxRate) / 100)) : 0;
  return { subtotal, tax, total: subtotal + tax };
}
```

- [ ] **Step 2: Remove checkoutCart test from domain.test.js**

In `src/pos/domain.test.js`:

1. Remove `checkoutCart` and `createTransactionNumber` from the import on line 2-11:

```js
import {
  addSavedProductToCart,
  addProductToCart,
  calculateCartTotals,
  formatIDR,
  validateScannedProduct,
  validateProduct,
} from "./domain.js";
```

2. Delete the `test("checkoutCart records cash change and decrements stock", ...)` block (lines 154-177).

- [ ] **Step 3: Run tests to verify they pass**

Run:
```bash
npm test
```

Expected: All remaining tests pass. No test references `checkoutCart` or `createTransactionNumber`.

- [ ] **Step 4: Commit**

```bash
git add src/pos/domain.js src/pos/domain.test.js
git commit -m "refactor: remove checkoutCart from domain.js — logic moved to Edge Function"
```

---

## Task 8: Delete storage.js

**Files:**
- Delete: `src/pos/storage.js`

- [ ] **Step 1: Delete storage.js**

Run:
```bash
rm src/pos/storage.js
```

- [ ] **Step 2: Verify nothing else imports storage.js**

Run:
```bash
grep -r "storage" src/pos/ --include="*.js" --include="*.jsx" || echo "No references found"
```

Expected: "No references found" — `store.jsx` currently imports from `storage.js` but will be rewritten in Task 9.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete storage.js — replaced by supabase-client.js and cart-storage.js"
```

---

## Task 9: Rewrite store.jsx with Supabase + Clerk + realtime

**Files:**
- Modify: `src/pos/store.jsx`

- [ ] **Step 1: Rewrite store.jsx**

Replace the entire contents of `src/pos/store.jsx` with:

```jsx
import React from "react";
import { useAuth, useOrganization } from "@clerk/react";
import {
  addProductToCart,
  addSavedProductToCart,
  calculateCartTotals,
  validateProduct,
} from "./domain.js";
import { createSavedProduct } from "./product-save.js";
import { createSupabaseClient } from "./supabase-client.js";
import { loadCart, saveCart, clearCartStorage } from "./cart-storage.js";

const POSStoreContext = React.createContext(null);

function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    category: row.category,
    price: Number(row.price),
    stock: Number(row.stock),
    unit: row.unit,
    image: row.image || "",
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettingsRow(row) {
  return {
    storeName: row.store_name,
    storeAddress: row.store_address,
    taxEnabled: row.tax_enabled,
    taxRate: row.tax_rate,
    qrisLabel: row.qris_label,
  };
}

function mapTransactionRow(row) {
  return {
    id: row.id,
    number: row.number,
    cashierName: row.cashier_name,
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    paymentMethod: row.payment_method,
    cashReceived: row.cash_received,
    changeDue: row.change_due,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function POSStoreProvider({ children }) {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id || null;

  const [products, setProducts] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const [settings, setSettings] = React.useState(null);
  const [cart, setCart] = React.useState(() => loadCart());
  const [notice, setNotice] = React.useState("");

  // Save cart to localStorage on every change
  React.useEffect(() => {
    saveCart(cart);
  }, [cart]);

  // Create a Supabase client with the latest Clerk token
  const getSupabase = React.useCallback(async () => {
    const token = await getToken();
    return createSupabaseClient(token);
  }, [getToken]);

  // Load initial data from Supabase when org is available
  const loadedRef = React.useRef(false);
  React.useEffect(() => {
    if (!orgId || loadedRef.current) return;
    loadedRef.current = true;

    let productsChannel = null;
    let transactionsChannel = null;

    (async () => {
      const supabase = await getSupabase();

      // Fetch products
      const { data: productRows, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });

      if (productsError) {
        setNotice("Failed to load products");
      } else {
        setProducts(productRows.map(mapProductRow));
      }

      // Fetch transactions
      const { data: txnRows, error: txnsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (txnsError) {
        setNotice("Failed to load transactions");
      } else {
        setTransactions(txnRows.map(mapTransactionRow));
      }

      // Fetch settings
      const { data: settingsRow, error: settingsError } = await supabase
        .from("store_settings")
        .select("*")
        .eq("org_id", orgId)
        .single();

      if (settingsError) {
        // Settings row doesn't exist yet — create it with defaults
        const { data: newSettings } = await supabase
          .from("store_settings")
          .insert({ org_id: orgId })
          .select()
          .single();
        if (newSettings) setSettings(mapSettingsRow(newSettings));
      } else {
        setSettings(mapSettingsRow(settingsRow));
      }

      // Subscribe to realtime changes
      productsChannel = supabase
        .channel("products-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `org_id=eq.${orgId}` }, (payload) => {
          if (payload.eventType === "INSERT") {
            setProducts((current) => [...current, mapProductRow(payload.new)]);
          } else if (payload.eventType === "UPDATE") {
            setProducts((current) => current.map((p) => (p.id === payload.new.id ? mapProductRow(payload.new) : p)));
          } else if (payload.eventType === "DELETE") {
            setProducts((current) => current.filter((p) => p.id !== payload.old.id));
          }
        })
        .subscribe();

      transactionsChannel = supabase
        .channel("transactions-changes")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions", filter: `org_id=eq.${orgId}` }, (payload) => {
          setTransactions((current) => [mapTransactionRow(payload.new), ...current]);
        })
        .subscribe();
    })();

    return () => {
      if (productsChannel) productsChannel.unsubscribe();
      if (transactionsChannel) transactionsChannel.unsubscribe();
    };
  }, [orgId, getSupabase]);

  const setNoticeCallback = React.useCallback((value) => setNotice(value), []);
  const clearNotice = React.useCallback(() => setNotice(""), []);

  const addToCart = React.useCallback((barcodeOrProductId) => {
    let response = null;
    setCart((currentCart) => {
      const result = addProductToCart(currentCart, products, barcodeOrProductId);
      response = result;
      return result.ok ? result.cart : currentCart;
    });
    if (response && !response.ok) setNotice(response.error);
    return response;
  }, [products]);

  const updateCartQty = React.useCallback((productId, qty) => {
    const nextQty = Math.max(0, Number(qty));
    const product = products.find((item) => item.id === productId);
    if (!product) {
      setNotice("Product not found");
      return { ok: false, error: "Product not found" };
    }
    if (nextQty > product.stock) {
      setNotice("Cart quantity exceeds stock");
      return { ok: false, error: "Cart quantity exceeds stock" };
    }
    setCart((currentCart) =>
      nextQty === 0
        ? currentCart.filter((item) => item.productId !== productId)
        : currentCart.map((item) => (item.productId === productId ? { ...item, qty: nextQty } : item)),
    );
    setNotice("");
    return { ok: true };
  }, [products]);

  const clearCart = React.useCallback(() => {
    setCart([]);
    clearCartStorage();
    setNotice("");
  }, []);

  const saveProduct = React.useCallback(async (product) => {
    const savedProduct = createSavedProduct(product);
    const validation = validateProduct(savedProduct, products);
    if (!validation.ok) {
      setNotice(Object.values(validation.errors)[0]);
      return;
    }

    // Optimistic update
    const exists = products.some((item) => item.id === savedProduct.id);
    if (exists) {
      setProducts((current) => current.map((item) => (item.id === savedProduct.id ? savedProduct : item)));
    } else {
      setProducts((current) => [...current, savedProduct]);
    }

    try {
      const supabase = await getSupabase();
      const row = {
        org_id: orgId,
        name: savedProduct.name,
        barcode: savedProduct.barcode,
        category: savedProduct.category,
        price: Number(savedProduct.price),
        stock: Number(savedProduct.stock),
        unit: savedProduct.unit,
        image: savedProduct.image || "",
        active: savedProduct.active !== false,
      };

      if (exists) {
        const { error } = await supabase
          .from("products")
          .update({
            name: row.name,
            barcode: row.barcode,
            category: row.category,
            price: row.price,
            unit: row.unit,
            image: row.image,
            active: row.active,
          })
          .eq("id", savedProduct.id)
          .eq("org_id", orgId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        // Replace optimistic product with DB-generated one
        setProducts((current) => current.map((p) => (p.id === savedProduct.id ? mapProductRow(data) : p)));
      }
      setNotice("");
    } catch (error) {
      // Rollback
      setProducts((current) =>
        exists
          ? current.map((item) => (item.id === savedProduct.id ? products.find((p) => p.id === savedProduct.id) : item))
          : current.filter((item) => item.id !== savedProduct.id),
      );
      setNotice(error.message || "Failed to save product");
    }
  }, [products, orgId, getSupabase]);

  const addScannedProductToCart = React.useCallback(async (product) => {
    const savedProduct = createSavedProduct(product);
    const validation = validateProduct(savedProduct, products);
    if (!validation.ok) {
      setNotice(Object.values(validation.errors)[0]);
      return;
    }

    try {
      const supabase = await getSupabase();
      const row = {
        org_id: orgId,
        name: savedProduct.name,
        barcode: savedProduct.barcode,
        category: savedProduct.category,
        price: Number(savedProduct.price),
        stock: Number(savedProduct.stock),
        unit: savedProduct.unit,
        image: savedProduct.image || "",
        active: true,
      };

      const { data, error } = await supabase
        .from("products")
        .insert(row)
        .select()
        .single();
      if (error) throw error;

      const newProduct = mapProductRow(data);
      setProducts((current) => [...current, newProduct]);

      // Add to cart
      const result = addSavedProductToCart(cart, [...products, newProduct], newProduct);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setCart(result.cart);
      setNotice("");
    } catch (error) {
      setNotice(error.message || "Failed to add scanned product");
    }
  }, [products, cart, orgId, getSupabase]);

  const deactivateProduct = React.useCallback(async (productId) => {
    // Optimistic
    setProducts((current) =>
      current.map((item) => (item.id === productId ? { ...item, active: false, updatedAt: new Date().toISOString() } : item)),
    );
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));

    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("products")
        .update({ active: false })
        .eq("id", productId)
        .eq("org_id", orgId);
      if (error) throw error;
      setNotice("");
    } catch (error) {
      // Rollback
      setProducts((current) =>
        current.map((item) => (item.id === productId ? { ...item, active: true } : item)),
      );
      setNotice(error.message || "Failed to deactivate product");
    }
  }, [orgId, getSupabase]);

  const checkout = React.useCallback(async (payment, cashierName) => {
    if (cart.length === 0) {
      setNotice("Cart is empty");
      return { ok: false, error: "Cart is empty" };
    }

    try {
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cart, payment, cashierName }),
      });

      const result = await response.json();

      if (!result.ok) {
        setNotice(result.error);
        return result;
      }

      // Update local state from server response
      setTransactions((current) => [result.transaction, ...current]);

      // Update product stock locally (realtime will also confirm)
      setProducts((current) =>
        current.map((product) => {
          const cartItem = cart.find((item) => item.productId === product.id);
          return cartItem ? { ...product, stock: product.stock - cartItem.qty } : product;
        }),
      );

      setCart([]);
      clearCartStorage();
      setNotice("Transaction completed");
      return { ok: true, transaction: result.transaction };
    } catch (error) {
      setNotice(error.message || "Checkout failed");
      return { ok: false, error: error.message || "Checkout failed" };
    }
  }, [cart, getToken]);

  const updateSettings = React.useCallback(async (newSettings) => {
    // Optimistic
    setSettings((current) => ({ ...current, ...newSettings }));

    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("store_settings")
        .update({
          store_name: newSettings.storeName,
          store_address: newSettings.storeAddress,
          tax_enabled: Boolean(newSettings.taxEnabled),
          tax_rate: Number(newSettings.taxRate) || 0,
          qris_label: newSettings.qrisLabel,
        })
        .eq("org_id", orgId);
      if (error) throw error;
      setNotice("Settings saved");
    } catch (error) {
      // Rollback
      setSettings((current) => ({ ...current }));
      setNotice(error.message || "Failed to save settings");
    }
  }, [orgId, getSupabase]);

  const value = {
    products,
    activeProducts: products.filter((item) => item.active),
    cart,
    transactions,
    settings: settings || { storeName: "Toko Balanja", storeAddress: "", taxEnabled: false, taxRate: 11, qrisLabel: "QRIS Toko Balanja" },
    notice,
    addToCart,
    updateCartQty,
    clearCart,
    saveProduct,
    addScannedProductToCart,
    deactivateProduct,
    checkout,
    updateSettings,
    setNotice: setNoticeCallback,
    clearNotice,
  };

  return <POSStoreContext.Provider value={value}>{children}</POSStoreContext.Provider>;
}

export function usePOSStore() {
  const value = React.useContext(POSStoreContext);
  if (!value) throw new Error("usePOSStore must be used inside POSStoreProvider");
  return value;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pos/store.jsx
git commit -m "feat: rewrite store with Supabase + Clerk + realtime subscriptions"
```

---

## Task 10: Update store.test.js for async actions

**Files:**
- Modify: `src/pos/store.test.js`

- [ ] **Step 1: Update store.test.js**

Replace the entire contents of `src/pos/store.test.js` with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createSavedProduct } from "./product-save.js";
import { loadCart, saveCart, clearCartStorage } from "./cart-storage.js";

test("createSavedProduct assigns an id to a new product before returning it", () => {
  const product = createSavedProduct(
    {
      id: "",
      name: "Teh Botol",
      barcode: "8991001000999",
      category: "Minuman",
      price: 4500,
      stock: 12,
      unit: "botol",
      active: true,
    },
    new Date("2026-07-10T10:00:00.000Z"),
  );

  assert.equal(product.id, "prod-1783677600000");
  assert.equal(product.updatedAt, "2026-07-10T10:00:00.000Z");
  assert.equal(product.createdAt, "2026-07-10T10:00:00.000Z");
});

test("cart-storage round-trips a cart array", () => {
  const mockStorage = new Map();
  const storageProxy = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, value) => mockStorage.set(key, value),
    removeItem: (key) => mockStorage.delete(key),
  };

  const cart = [{ productId: "prod-1", name: "Test", barcode: "123", price: 5000, qty: 2 }];
  saveCart(cart, storageProxy);
  const loaded = loadCart(storageProxy);
  assert.deepEqual(loaded, cart);

  clearCartStorage(storageProxy);
  const afterClear = loadCart(storageProxy);
  assert.deepEqual(afterClear, []);
});

test("cart-storage returns empty array on invalid JSON", () => {
  const mockStorage = new Map();
  mockStorage.set("balanja-retail-cart-v1", "{invalid json");
  const storageProxy = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: () => {},
    removeItem: () => {},
  };
  assert.deepEqual(loadCart(storageProxy), []);
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/pos/store.test.js
git commit -m "test: update store tests for cart-storage and async actions"
```

---

## Task 11: Update main.jsx for Clerk org context

**Files:**
- Modify: `src/main.jsx`

- [ ] **Step 1: Update main.jsx**

The current `main.jsx` wraps with `<ClerkProvider>` then `<POSStoreProvider>`. The `POSStoreProvider` now uses `useAuth()` and `useOrganization()` from Clerk, which must be inside `<ClerkProvider>`. The current structure is already correct — `POSStoreProvider` is inside `ClerkProvider`.

However, `useOrganization()` requires the user to be within an organization context. Add `afterSignOutUrl` to `ClerkProvider` (already present) and ensure `afterSignInUrl` redirects to `/pos`.

Replace the ClerkProvider line in `src/main.jsx`:

```jsx
      <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
        <POSStoreProvider>
          <App />
        </POSStoreProvider>
      </ClerkProvider>
```

with:

```jsx
      <ClerkProvider
        publishableKey={clerkKey}
        afterSignOutUrl="/"
        appearance={{
          variables: {
            colorPrimary: "#4f46e5",
          },
        }}
      >
        <POSStoreProvider>
          <App />
        </POSStoreProvider>
      </ClerkProvider>
```

Note: The `appearance` prop is optional and matches the app's accent color. The core structure (ClerkProvider > POSStoreProvider > App) is already correct and needs no structural change.

- [ ] **Step 2: Commit**

```bash
git add src/main.jsx
git commit -m "chore: add Clerk appearance config for brand color"
```

---

## Task 12: Remove resetDemoData from SettingsPage

**Files:**
- Modify: `src/pages/SettingsPage.jsx`

- [ ] **Step 1: Remove resetDemoData button and handler**

In `src/pages/SettingsPage.jsx`:

1. Remove the `resetDemoData` function (lines 23-26):

```js
  const resetDemoData = () => {
    store.resetDemoData();
    toast.success("Demo data reset");
  };
```

2. Remove the `toast` import at the top (line 2):

```js
import { toast } from "sonner";
```

3. Remove the entire "Demo data" Panel (lines 122-130):

```jsx
          <Panel className="grid gap-3 p-4">
            <p className="text-sm font-semibold text-text">Demo data</p>
            <p className="text-sm leading-6 text-text-muted">
              Reset products, cart, transactions, and settings to the default retail UMKM sample.
            </p>
            <Button variant="danger" onClick={resetDemoData}>
              Reset demo data
            </Button>
          </Panel>
```

4. The closing `</aside>` tag should now directly follow the "Current store" Panel's closing `</Panel>`.

- [ ] **Step 2: Verify the page still renders**

Run:
```bash
npm run dev
```

Open the app, navigate to Settings, verify the "Demo data" panel is gone and the "Current store" panel is intact.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.jsx
git commit -m "refactor: remove resetDemoData from SettingsPage — no longer needed with DB"
```

---

## Task 13: Update .env.example with Supabase vars

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: This was already done in Task 1**

Verify `.env.example` contains:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If not, update it.

- [ ] **Step 2: No commit needed if already committed in Task 1**

---

## Task 14: Verify build compiles

**Files:** None

- [ ] **Step 1: Run build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript or import errors. If there are import errors for missing `storage.js`, verify `store.jsx` no longer imports it.

- [ ] **Step 2: Run tests**

Run:
```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from migration" || echo "No fixes needed"
```

---

## Task 15: Manual E2E verification checklist

**Files:** None

This is a manual checklist — no code changes. Do each step in the browser after deploying the migrations to a Supabase project and setting `.env.local`.

- [ ] **Step 1: Create a Clerk account + organization**

- Go to Clerk dashboard, create an organization
- Note the `org_id`
- In Supabase, run `002_seed_demo_data.sql` replacing `org_test_demo` with your real `org_id`

- [ ] **Step 2: Login and verify data loads**

- Open the app, sign in via Clerk
- Navigate to Products page — seed products should appear
- Navigate to Dashboard — KPIs and charts should show data
- Navigate to Settings — store settings should load from DB

- [ ] **Step 3: Test product CRUD**

- Add a new product — verify it appears in the list (optimistic + realtime)
- Edit a product — verify changes persist after refresh
- Deactivate a product — verify it disappears from POS but stays in Products

- [ ] **Step 4: Test checkout**

- Add items to cart in POS
- Complete a cash sale with sufficient payment
- Verify: cart clears, transaction appears in Transactions page, product stock decremented
- Refresh page — verify data persisted

- [ ] **Step 5: Test realtime sync**

- Open the app in two browser tabs (different devices if possible)
- In tab 1, add a new product
- Verify tab 2 shows the new product without refresh
- In tab 1, complete a checkout
- Verify tab 2 dashboard updates with new transaction

- [ ] **Step 6: Test cross-org isolation**

- Create a second Clerk org
- Login as a user in org B
- Verify: no products from org A appear, no transactions from org A visible
- Add a product as org B — verify it only appears in org B sessions

- [ ] **Step 7: Test stock protection trigger**

- In the Supabase SQL editor, try updating a product's stock directly as the `authenticated` role:

```sql
update products set stock = 999 where id = '<some-product-id>';
```

Expected: Error — "Direct stock updates are not allowed. Use the checkout Edge Function."

- [ ] **Step 8: Test Edge Function input validation**

Using curl or Postman:

```bash
# Empty cart
curl -X POST https://your-project.supabase.co/functions/v1/checkout \
  -H "Authorization: Bearer <clerk-token>" \
  -H "Content-Type: application/json" \
  -d '{"cart":[],"payment":{"method":"cash"},"cashierName":"Test"}'
# Expected: {"ok":false,"error":"Cart is empty"}

# Missing auth
curl -X POST https://your-project.supabase.co/functions/v1/checkout \
  -H "Content-Type: application/json" \
  -d '{"cart":[{"productId":"x"}],"payment":{"method":"cash"},"cashierName":"Test"}'
# Expected: {"ok":false,"error":"Missing auth token"}
```

---

## Post-Implementation Notes

### Supabase project setup (manual, outside this plan)

1. Create a new Supabase project at supabase.com
2. Run `001_init_schema.sql` in the SQL editor
3. Set the Clerk JWKS URL in Supabase Auth > JWT Settings (so Supabase can verify Clerk JWTs)
4. Set the Edge Function secret `SUPABASE_SERVICE_ROLE_KEY` in Supabase Functions secrets
5. Deploy the Edge Function: `supabase functions deploy checkout`
6. Configure Clerk to include `org_id` in JWTs (Dashboard > JWT Templates > Add `org_id`)

### What was removed

- `src/pos/storage.js` — replaced by `supabase-client.js` + `cart-storage.js`
- `checkoutCart` and `createTransactionNumber` from `domain.js` — logic moved to Edge Function
- `resetDemoData` action from store and SettingsPage — no localStorage to reset
- `seedProducts` const in `domain.js` — seed data now in SQL migration (kept for backward compat with tests, can be removed later)

### v2 scope (parked)

- Audit log table (`audit_logs`)
- Multi-store (one org = multiple stores)
- Rate limiting in Edge Functions
- Offline support