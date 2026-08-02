begin;

alter table stock_movements
  add constraint stock_movements_reason_check check (btrim(reason) <> '');

commit;
