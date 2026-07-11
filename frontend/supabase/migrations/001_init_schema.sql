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

-- products: select, insert, update
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

-- Block direct client UPDATE of products.stock.
-- The checkout() RPC function sets app.allow_stock_update to 'true'
-- before decrementing stock, which the trigger reads to allow the update.

create or replace function protect_stock_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow stock update when authorized by checkout() RPC function
  if current_setting('app.allow_stock_update', true) = 'true' then
    return new;
  end if;

  -- For client updates: block if stock changed
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

  -- Authorize stock update and decrement
  perform set_config('app.allow_stock_update', 'true', true);
  for v_item in select * from jsonb_array_elements(p_cart) loop
    update products
    set stock = stock - (v_item ->> 'qty')::integer,
        updated_at = now()
    where id = (v_item ->> 'productId')::uuid
      and org_id = p_org_id;
  end loop;

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
