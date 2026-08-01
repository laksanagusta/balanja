begin;

do $$
begin
  create role balanja_api nologin nobypassrls;
exception
  when duplicate_object then null;
end $$;

alter table products
  add column if not exists attributes_config jsonb not null default '[]'::jsonb;

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  product_id uuid not null references products(id) on delete cascade,
  attributes jsonb not null default '{}'::jsonb,
  price integer not null check (price >= 1),
  stock integer not null default 0 check (stock >= 0),
  barcode text not null default '',
  image text not null default '',
  image_key text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_variants_org_barcode_idx
  on product_variants (org_id, barcode) where barcode <> '';

create index if not exists product_variants_org_product_idx
  on product_variants (org_id, product_id);

create trigger product_variants_set_updated_at before update on product_variants
for each row execute function set_updated_at();

-- backfill: one default variant per existing product
insert into product_variants (org_id, product_id, attributes, price, stock, barcode, image, image_key, active, created_at, updated_at)
select p.org_id, p.id, '{}'::jsonb, p.price, p.stock, p.barcode, p.image, coalesce(p.image_key, ''), p.active, p.created_at, p.updated_at
from products p
where not exists (
  select 1 from product_variants pv where pv.org_id = p.org_id and pv.product_id = p.id
);

alter table stock_movements
  add column if not exists product_variant_id uuid;

alter table stock_movements
  add constraint stock_movements_variant_fkey
  foreign key (product_variant_id)
  references product_variants (id) on delete set null;

alter table product_variants enable row level security;
alter table product_variants force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_variants' and policyname = 'product_variants_tenant'
  ) then
    create policy product_variants_tenant on product_variants
      using (org_id = current_setting('app.org_id', true))
      with check (org_id = current_setting('app.org_id', true));
  end if;
end $$;

grant select, insert, update on product_variants to balanja_api;
grant update (product_variant_id) on stock_movements to balanja_api;

commit;
