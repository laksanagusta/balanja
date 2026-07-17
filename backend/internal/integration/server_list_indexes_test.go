package integration

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServerListIndexesMigration(t *testing.T) {
	path := filepath.Join("..", "..", "migrations", "000010_category_unit_master_data.up.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%q) error = %v", path, err)
	}
	up := string(content)
	for _, fragment := range []string{
		"products_category_tenant_fk",
		"products_unit_tenant_fk",
		"create unique index categories_org_name_ci_key",
		"create unique index units_org_name_ci_key",
	} {
		if !strings.Contains(up, fragment) {
			t.Fatalf("migration missing %s", fragment)
		}
	}
}
