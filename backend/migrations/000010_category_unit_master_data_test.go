package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestCategoryUnitMasterDataMigrationContract(t *testing.T) {
	content, err := os.ReadFile("000010_category_unit_master_data.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, required := range []string{
		"create table categories",
		"create table units",
		"unique (org_id, id)",
		"lower(name)",
		"add column category_id uuid",
		"add column unit_id uuid",
		"foreign key (org_id, category_id)",
		"foreign key (org_id, unit_id)",
		"alter table categories force row level security",
		"alter table units force row level security",
		"drop column category",
		"drop column unit",
	} {
		if !strings.Contains(sql, required) {
			t.Errorf("migration missing %q", required)
		}
	}
}
