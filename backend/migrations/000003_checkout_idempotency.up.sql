begin;

do $$
begin
  create role balanja_api nologin nobypassrls;
exception
  when duplicate_object then null;
end
$$;

create table if not exists checkout_idempotency (
  org_id text not null,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  request_fingerprint text not null check (length(request_fingerprint) = 64),
  transaction_id uuid references transactions(id),
  created_at timestamptz not null default now(),
  primary key (org_id, idempotency_key)
);

create index if not exists checkout_idempotency_created_idx on checkout_idempotency (created_at);

alter table checkout_idempotency enable row level security;
alter table checkout_idempotency force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'checkout_idempotency'
      and policyname = 'checkout_idempotency_tenant'
  ) then
    create policy checkout_idempotency_tenant on checkout_idempotency to balanja_api
    using (org_id = current_setting('app.org_id', true))
    with check (org_id = current_setting('app.org_id', true));
  end if;
end
$$;

grant usage on schema public to balanja_api;
grant select, insert, update on checkout_idempotency to balanja_api;

commit;
