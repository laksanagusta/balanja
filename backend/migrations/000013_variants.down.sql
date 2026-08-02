begin;

alter table stock_movements
  drop constraint if exists stock_movements_variant_fkey;

alter table stock_movements
  drop column if exists product_variant_id;

drop trigger if exists product_variants_set_updated_at on product_variants;
drop table if exists product_variants;

alter table products
  drop column if exists attributes_config;

commit;
