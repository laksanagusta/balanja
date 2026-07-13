begin;

alter table transactions add column if not exists cashier_user_id text;
alter table transactions add column if not exists cashier_name text;

update transactions
set cashier_user_id = 'unknown'
where cashier_user_id is null or btrim(cashier_user_id) = '';

alter table transactions alter column cashier_user_id set default 'unknown';
alter table transactions alter column cashier_user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_cashier_user_id_check'
  ) then
    alter table transactions
      add constraint transactions_cashier_user_id_check
      check (btrim(cashier_user_id) <> '');
  end if;
end
$$;

commit;
