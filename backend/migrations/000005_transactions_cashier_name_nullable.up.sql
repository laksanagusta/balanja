begin;

alter table transactions add column if not exists cashier_name text;
alter table transactions alter column cashier_name drop not null;

commit;
