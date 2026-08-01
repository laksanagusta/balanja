begin;

-- Reason is optional for manual stock movements; only store-level
-- consistency matters. Relax the not-empty check.
alter table stock_movements
  drop constraint if exists stock_movements_reason_check;

commit;
