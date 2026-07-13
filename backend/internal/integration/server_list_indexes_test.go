package integration

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServerListIndexesMigration(t *testing.T) {
	path := filepath.Join("..", "..", "migrations", "000008_server_list_indexes.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	up := string(content)
	for _, fragment := range []string{
		"products_org_name_id_idx",
		"products_org_category_id_idx",
		"products_org_price_id_idx",
		"products_org_stock_id_idx",
		"transactions_org_number_id_idx",
		"transactions_org_payment_method_id_idx",
		"transactions_org_total_id_idx",
		"stock_movements_org_quantity_delta_id_idx",
		"stock_movements_org_stock_after_id_idx",
	} {
		if !strings.Contains(up, fragment) {
			t.Fatalf("migration missing %s", fragment)
		}
	}
}
