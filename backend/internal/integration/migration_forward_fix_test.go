package integration

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestForwardFixMigrationRepairsTransactionCashierColumns(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000002_transactions_cashier_columns.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"alter table transactions add column if not exists cashier_user_id text",
		"alter table transactions add column if not exists cashier_name text",
		"update transactions",
		"set cashier_user_id = 'unknown'",
		"alter table transactions alter column cashier_user_id set not null",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("forward fix migration missing %q", fragment)
		}
	}
}

func TestForwardFixMigrationRepairsCheckoutIdempotencyTable(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000003_checkout_idempotency.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"create role balanja_api nologin nobypassrls",
		"create table if not exists checkout_idempotency",
		"primary key (org_id, idempotency_key)",
		"references transactions(id)",
		"enable row level security",
		"force row level security",
		"create policy checkout_idempotency_tenant",
		"grant usage on schema public to balanja_api",
		"grant select, insert, update on checkout_idempotency to balanja_api",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("forward fix migration missing %q", fragment)
		}
	}
}

func TestForwardFixMigrationRepairsTenantCountersTable(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000004_tenant_counters.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"create role balanja_api nologin nobypassrls",
		"create table if not exists tenant_counters",
		"org_id text primary key",
		"next_transaction_number bigint not null default 1",
		"enable row level security",
		"force row level security",
		"create policy counters_tenant",
		"grant usage on schema public to balanja_api",
		"grant select, insert, update on tenant_counters to balanja_api",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("forward fix migration missing %q", fragment)
		}
	}
}

func TestForwardFixMigrationRepairsNullableCashierName(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000005_transactions_cashier_name_nullable.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"alter table transactions add column if not exists cashier_name text",
		"alter table transactions alter column cashier_name drop not null",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("forward fix migration missing %q", fragment)
		}
	}
}

func TestForwardFixMigrationRemovesObsoleteCheckoutRPC(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000006_remove_obsolete_checkout_rpc.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"drop trigger if exists products_protect_stock on products",
		"drop function if exists protect_stock_column()",
		"drop function if exists checkout(text, jsonb, text, integer, text)",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("forward fix migration missing %q", fragment)
		}
	}
}

func TestForwardFixMigrationAddsStockMovements(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000007_stock_movements.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"create table if not exists stock_movements",
		"product_id uuid not null references products(id)",
		"type text not null",
		"quantity_delta integer not null",
		"stock_before integer not null",
		"stock_after integer not null",
		"created_by_user_id text not null",
		"check (type in ('sale', 'restock', 'reduce', 'set_exact'))",
		"check (quantity_delta <> 0)",
		"alter table stock_movements enable row level security",
		"alter table stock_movements force row level security",
		"create index if not exists stock_movements_org_cursor_idx",
		"create index if not exists stock_movements_org_product_cursor_idx",
		"create index if not exists stock_movements_org_type_cursor_idx",
		"grant select, insert on stock_movements to balanja_api",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("forward fix migration missing %q", fragment)
		}
	}
}
