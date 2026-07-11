//go:build integration

package integration

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5"
)

func TestTenantRLS(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	ctx := context.Background()
	connection, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer connection.Close(ctx)

	up := readMigration(t, "000001_init.up.sql")
	down := readMigration(t, "000001_init.down.sql")
	if _, err := connection.Exec(ctx, up); err != nil {
		t.Fatalf("apply up migration: %v", err)
	}
	t.Cleanup(func() {
		if _, err := connection.Exec(context.Background(), down); err != nil {
			t.Errorf("apply down migration: %v", err)
		}
	})

	if _, err := connection.Exec(ctx, `
		insert into products (org_id,name,barcode,category,price,stock,unit)
		values ('org_a','A product','a','test',100,1,'pcs'),
		       ('org_b','B product','b','test',100,1,'pcs')`); err != nil {
		t.Fatalf("seed products: %v", err)
	}

	tx, err := connection.Begin(ctx)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "set local role balanja_api"); err != nil {
		t.Fatalf("set role: %v", err)
	}
	if _, err := tx.Exec(ctx, "select set_config('app.org_id', 'org_a', true)"); err != nil {
		t.Fatalf("set org: %v", err)
	}

	var count int
	if err := tx.QueryRow(ctx, "select count(*) from products").Scan(&count); err != nil {
		t.Fatalf("count visible products: %v", err)
	}
	if count != 1 {
		t.Fatalf("visible products = %d, want 1", count)
	}
	if _, err := tx.Exec(ctx, "insert into products (org_id,name,barcode,category,price,stock,unit) values ('org_b','forbidden','x','test',100,1,'pcs')"); err == nil {
		t.Fatal("cross-tenant insert succeeded")
	}
}

func readMigration(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join("..", "..", "migrations", name)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration %s: %v", name, err)
	}
	return string(content)
}
