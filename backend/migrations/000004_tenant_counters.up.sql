begin;

do $$
begin
  create role balanja_api nologin nobypassrls;
exception
  when duplicate_object then null;
end
$$;

create table if not exists tenant_counters (
  org_id text primary key,
  next_transaction_number bigint not null default 1 check (next_transaction_number >= 1)
);

alter table tenant_counters enable row level security;
alter table tenant_counters force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tenant_counters'
      and policyname = 'counters_tenant'
  ) then
    create policy counters_tenant on tenant_counters to balanja_api
    using (org_id = current_setting('app.org_id', true))
    with check (org_id = current_setting('app.org_id', true));
  end if;
end
$$;

grant usage on schema public to balanja_api;
grant select, insert, update on tenant_counters to balanja_api;

commit;
