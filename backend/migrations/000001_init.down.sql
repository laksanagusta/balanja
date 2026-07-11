begin;

drop table if exists checkout_idempotency;
drop table if exists transactions;
drop table if exists tenant_counters;
drop table if exists store_settings;
drop table if exists products;
drop function if exists set_updated_at();
revoke usage on schema public from balanja_api;
drop role if exists balanja_api;

commit;
