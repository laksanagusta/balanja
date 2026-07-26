package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestOrganizationEntitlementMigrationContract(t *testing.T) {
	content, err := os.ReadFile("000012_organization_entitlements.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, required := range []string{
		"create table organization_entitlements",
		"status text not null",
		"transactions_used bigint not null default 0",
		"support_reference text not null",
		"create table organization_entitlement_audit",
		"create table entitlement_events",
		"force row level security",
		"current_setting('app.org_id', true)",
		"'paid_active'",
		"'migration-000012'",
	} {
		if !strings.Contains(sql, required) {
			t.Errorf("migration missing %q", required)
		}
	}
}
