begin;

drop trigger if exists products_protect_stock on products;
drop function if exists protect_stock_column();
drop function if exists checkout(text, jsonb, text, integer, text);

commit;
