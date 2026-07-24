begin;

alter table stock_movements
  drop column if exists created_by_user_name;

commit;
