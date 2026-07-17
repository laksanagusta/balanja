begin;

create table categories (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null check (name = btrim(name) and name <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create unique index categories_org_name_ci_key on categories (org_id, lower(name));

create table units (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null check (name = btrim(name) and name <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create unique index units_org_name_ci_key on units (org_id, lower(name));

insert into categories (org_id, name, created_at)
select org_id, category, created_at
from (
  select org_id, btrim(category) as category, created_at, id,
         row_number() over (partition by org_id, lower(btrim(category)) order by created_at, id) as position
  from products
) values_to_keep
where position = 1;

insert into units (org_id, name, created_at)
select org_id, unit, created_at
from (
  select org_id, btrim(unit) as unit, created_at, id,
         row_number() over (partition by org_id, lower(btrim(unit)) order by created_at, id) as position
  from products
) values_to_keep
where position = 1;

alter table products add column category_id uuid;
alter table products add column unit_id uuid;
update products p set category_id = c.id from categories c
where c.org_id = p.org_id and lower(c.name) = lower(btrim(p.category));
update products p set unit_id = u.id from units u
where u.org_id = p.org_id and lower(u.name) = lower(btrim(p.unit));
alter table products alter column category_id set not null;
alter table products alter column unit_id set not null;
alter table products add constraint products_category_tenant_fk
  foreign key (org_id, category_id) references categories (org_id, id);
alter table products add constraint products_unit_tenant_fk
  foreign key (org_id, unit_id) references units (org_id, id);
alter table products drop column category;
alter table products drop column unit;

create trigger categories_set_updated_at before update on categories
for each row execute function set_updated_at();
create trigger units_set_updated_at before update on units
for each row execute function set_updated_at();
alter table categories enable row level security;
alter table categories force row level security;
alter table units enable row level security;
alter table units force row level security;
create policy categories_tenant on categories to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
create policy units_tenant on units to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
grant select, insert, update on categories, units to balanja_api;

commit;
