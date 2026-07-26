begin;

create table organization_entitlements (
  org_id text primary key,
  status text not null default 'trial'
    check (status in ('trial', 'paid_active', 'paid_suspended')),
  transaction_limit integer default 50
    check (transaction_limit is null or transaction_limit > 0),
  transactions_used bigint not null default 0
    check (transactions_used >= 0),
  support_reference text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  activated_at timestamptz,
  activated_by text,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'trial' and transaction_limit = 50)
    or (status in ('paid_active', 'paid_suspended') and transaction_limit is null)
  )
);

create table organization_entitlement_audit (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  actor text not null check (btrim(actor) <> ''),
  previous_status text
    check (previous_status is null or previous_status in ('trial', 'paid_active', 'paid_suspended')),
  new_status text not null
    check (new_status in ('trial', 'paid_active', 'paid_suspended')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index organization_entitlement_audit_org_created_idx
  on organization_entitlement_audit (org_id, created_at desc);

create table entitlement_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null check (name in (
    'transaction_10',
    'transaction_25',
    'transaction_40',
    'transaction_45',
    'transaction_50',
    'limit_rejected',
    'upgrade_whatsapp_clicked',
    'upgrade_email_clicked'
  )),
  created_at timestamptz not null default now()
);

create unique index entitlement_events_org_milestone_key
  on entitlement_events (org_id, name)
  where name like 'transaction_%';
create index entitlement_events_org_created_idx
  on entitlement_events (org_id, created_at desc);

with existing_orgs as (
  select org_id from products
  union select org_id from store_settings
  union select org_id from transactions
  union select org_id from tenant_counters
  union select org_id from categories
  union select org_id from units
  union select org_id from stock_movements
)
insert into organization_entitlements (
  org_id,
  status,
  transaction_limit,
  transactions_used,
  activated_at,
  activated_by
)
select
  existing_orgs.org_id,
  'paid_active',
  null,
  (select count(*) from transactions where transactions.org_id = existing_orgs.org_id),
  now(),
  'migration-000012'
from existing_orgs
on conflict (org_id) do nothing;

create trigger organization_entitlements_set_updated_at
before update on organization_entitlements
for each row execute function set_updated_at();

alter table organization_entitlements enable row level security;
alter table organization_entitlements force row level security;
alter table organization_entitlement_audit enable row level security;
alter table organization_entitlement_audit force row level security;
alter table entitlement_events enable row level security;
alter table entitlement_events force row level security;

create policy organization_entitlements_tenant
on organization_entitlements to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));

create policy entitlement_events_tenant
on entitlement_events to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));

grant select, insert, update on organization_entitlements to balanja_api;
grant select, insert on entitlement_events to balanja_api;

commit;
