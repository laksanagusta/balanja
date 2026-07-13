begin;

do $$
begin
  create role balanja_api nologin nobypassrls;
exception
  when duplicate_object then null;
end $$;

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  product_id uuid not null references products(id),
  type text not null,
  quantity_delta integer not null,
  stock_before integer not null,
  stock_after integer not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  check (type in ('sale', 'restock', 'reduce', 'set_exact')),
  check (quantity_delta <> 0),
  check (stock_before >= 0),
  check (stock_after >= 0),
  check (btrim(reason) <> '')
);

create index if not exists stock_movements_org_cursor_idx
  on stock_movements (org_id, created_at desc, id desc);

create index if not exists stock_movements_org_product_cursor_idx
  on stock_movements (org_id, product_id, created_at desc, id desc);

create index if not exists stock_movements_org_type_cursor_idx
  on stock_movements (org_id, type, created_at desc, id desc);

alter table stock_movements enable row level security;
alter table stock_movements force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_movements'
      and policyname = 'stock_movements_org_isolation'
  ) then
    create policy stock_movements_org_isolation on stock_movements
      using (org_id = current_setting('app.org_id', true))
      with check (org_id = current_setting('app.org_id', true));
  end if;
end $$;

grant usage on schema public to balanja_api;
grant select, insert on stock_movements to balanja_api;

commit;
