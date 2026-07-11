begin;

do $$
begin
  create role balanja_api nologin nobypassrls;
exception
  when duplicate_object then null;
end
$$;

create table products (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null check (btrim(name) <> ''),
  barcode text not null check (btrim(barcode) <> ''),
  category text not null check (btrim(category) <> ''),
  price integer not null check (price >= 1),
  stock integer not null default 0 check (stock >= 0),
  unit text not null check (btrim(unit) <> ''),
  image text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, barcode)
);

create table store_settings (
  org_id text primary key,
  store_name text not null default 'Toko Balanja' check (btrim(store_name) <> ''),
  store_address text not null default '',
  tax_enabled boolean not null default false,
  tax_rate integer not null default 11 check (tax_rate between 0 and 100),
  qris_label text not null default 'QRIS Toko Balanja',
  updated_at timestamptz not null default now()
);

create table tenant_counters (
  org_id text primary key,
  next_transaction_number bigint not null default 1 check (next_transaction_number >= 1)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  number text not null check (btrim(number) <> ''),
  cashier_user_id text not null check (btrim(cashier_user_id) <> ''),
  cashier_name text,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  subtotal integer not null check (subtotal >= 0),
  tax integer not null default 0 check (tax >= 0),
  total integer not null check (total >= 0 and total = subtotal + tax),
  payment_method text not null check (payment_method in ('cash', 'qris')),
  cash_received integer not null default 0 check (cash_received >= 0),
  change_due integer not null default 0 check (change_due >= 0),
  status text not null default 'completed' check (status in ('completed', 'voided')),
  created_at timestamptz not null default now(),
  unique (org_id, number)
);

create table checkout_idempotency (
  org_id text not null,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  request_fingerprint text not null check (length(request_fingerprint) = 64),
  transaction_id uuid references transactions(id),
  created_at timestamptz not null default now(),
  primary key (org_id, idempotency_key)
);

create index products_active_org_idx on products (org_id, created_at, id) where active;
create index products_low_stock_org_idx on products (org_id, stock, name) where active;
create index transactions_org_cursor_idx on transactions (org_id, created_at desc, id desc);
create index checkout_idempotency_created_idx on checkout_idempotency (created_at);

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger products_set_updated_at before update on products
for each row execute function set_updated_at();
create trigger settings_set_updated_at before update on store_settings
for each row execute function set_updated_at();

alter table products enable row level security;
alter table products force row level security;
alter table store_settings enable row level security;
alter table store_settings force row level security;
alter table tenant_counters enable row level security;
alter table tenant_counters force row level security;
alter table transactions enable row level security;
alter table transactions force row level security;
alter table checkout_idempotency enable row level security;
alter table checkout_idempotency force row level security;

create policy products_tenant on products to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
create policy settings_tenant on store_settings to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
create policy counters_tenant on tenant_counters to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
create policy transactions_tenant on transactions to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
create policy checkout_idempotency_tenant on checkout_idempotency to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));

grant usage on schema public to balanja_api;
grant select, insert, update on products, store_settings, tenant_counters, transactions, checkout_idempotency to balanja_api;

commit;
