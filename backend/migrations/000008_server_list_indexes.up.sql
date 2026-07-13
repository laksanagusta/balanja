create index if not exists products_org_name_id_idx
	on products (org_id, name, id);

create index if not exists products_org_category_id_idx
	on products (org_id, category, id);

create index if not exists products_org_price_id_idx
	on products (org_id, price, id);

create index if not exists products_org_stock_id_idx
	on products (org_id, stock, id);

create index if not exists transactions_org_number_id_idx
	on transactions (org_id, number, id);

create index if not exists transactions_org_payment_method_id_idx
	on transactions (org_id, payment_method, id);

create index if not exists transactions_org_total_id_idx
	on transactions (org_id, total, id);

create index if not exists stock_movements_org_quantity_delta_id_idx
	on stock_movements (org_id, quantity_delta, id);

create index if not exists stock_movements_org_stock_after_id_idx
	on stock_movements (org_id, stock_after, id);
