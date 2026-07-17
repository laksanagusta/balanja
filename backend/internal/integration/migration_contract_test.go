package integration

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestInitialMigrationContainsTenantSafetyContract(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000001_init.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"create role balanja_api nologin nobypassrls",
		"create table products",
		"create table store_settings",
		"create table transactions",
		"create table checkout_idempotency",
		"create table tenant_counters",
		"enable row level security",
		"force row level security",
		"current_setting('app.org_id', true)",
		"grant usage on schema public to balanja_api",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("migration missing %q", fragment)
		}
	}

	forbidden := []string{"create or replace function checkout(", "protect_stock_column", "service_role"}
	for _, fragment := range forbidden {
		if strings.Contains(sql, fragment) {
			t.Errorf("migration contains obsolete privileged path %q", fragment)
		}
	}
}

func TestProductImageKeyMigration(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "migrations", "000009_product_image_key.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	if !strings.Contains(strings.ToLower(string(content)), "add column image_key text not null default ''") {
		t.Fatalf("migration does not add a non-null image_key with an empty default")
	}
}
