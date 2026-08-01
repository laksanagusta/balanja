package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestVariantsMigrationContract(t *testing.T) {
	content, err := os.ReadFile("000013_variants.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, required := range []string{
		"create table if not exists product_variants",
		"attributes_config jsonb not null default '[]'::jsonb",
		"create unique index product_variants_org_barcode_idx",
		"on product_variants (org_id, barcode) where barcode <> ''",
		"insert into product_variants",
		"product_variants_set_updated_at",
		"force row level security",
		"current_setting('app.org_id', true)",
		"product_variants_tenant",
		"alter table stock_movements",
		"product_variant_id uuid",
	} {
		if !strings.Contains(sql, required) {
			t.Errorf("migration missing %q", required)
		}
	}
}
