begin;

alter table stock_movements
  add column if not exists created_by_user_name text;

update stock_movements sm
set created_by_user_name = nullif(btrim(t.cashier_name), '')
from transactions t
where sm.org_id = t.org_id
  and sm.reference_type = 'checkout'
  and sm.reference_id = t.id
  and nullif(btrim(sm.created_by_user_name), '') is null;

commit;
