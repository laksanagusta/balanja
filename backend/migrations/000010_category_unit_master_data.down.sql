begin;
alter table products add column category text;
alter table products add column unit text;
update products p set category=c.name from categories c
where c.org_id=p.org_id and c.id=p.category_id;
update products p set unit=u.name from units u
where u.org_id=p.org_id and u.id=p.unit_id;
alter table products alter column category set not null;
alter table products alter column unit set not null;
alter table products add constraint products_category_not_blank check (btrim(category) <> '');
alter table products add constraint products_unit_not_blank check (btrim(unit) <> '');
create index products_org_category_id_idx on products (org_id,category,id);
alter table products drop constraint products_category_tenant_fk;
alter table products drop constraint products_unit_tenant_fk;
alter table products drop column category_id;
alter table products drop column unit_id;
drop policy categories_tenant on categories;
drop policy units_tenant on units;
drop table categories;
drop table units;
commit;
