//go:build integration

package integration

import (
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/report"
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
)

func TestSalesReportAggregatesTenantData(t *testing.T) {
	adminURL := os.Getenv("TEST_DATABASE_URL")
	runtimeURL := os.Getenv("TEST_RUNTIME_DATABASE_URL")
	if adminURL == "" || runtimeURL == "" {
		t.Skip("TEST_DATABASE_URL and TEST_RUNTIME_DATABASE_URL are required")
	}

	ctx := context.Background()
	admin, err := pgx.Connect(ctx, adminURL)
	if err != nil {
		t.Fatalf("connect admin: %v", err)
	}
	defer admin.Close(ctx)
	for _, migration := range []string{
		"000001_init.up.sql",
		"000002_transactions_cashier_columns.up.sql",
		"000003_checkout_idempotency.up.sql",
		"000004_tenant_counters.up.sql",
		"000005_transactions_cashier_name_nullable.up.sql",
		"000006_remove_obsolete_checkout_rpc.up.sql",
		"000007_stock_movements.up.sql",
	} {
		if _, err := admin.Exec(ctx, readMigration(t, migration)); err != nil {
			t.Fatalf("apply migration %s: %v", migration, err)
		}
	}

	seed := `insert into transactions
		(org_id,number,cashier_user_id,cashier_name,items,subtotal,tax,total,payment_method,status,created_at)
		values
		('org_report_a','A-1','user-a','Ayu','[{"productId":"p-1","name":"Kopi","qty":1,"price":10000}]',10000,1000,11000,'cash','completed','2026-07-14T10:00:00+07:00'),
		('org_report_a','A-2','user-a','Ayu','[{"productId":"p-1","name":"Kopi","qty":2,"price":10000}]',20000,2000,22000,'cash','completed','2026-07-16T11:00:00+07:00'),
		('org_report_a','A-3','user-a','Ayu','[{"productId":"p-2","name":"Teh","qty":1,"price":8000}]',8000,0,8000,'qris','voided','2026-07-15T12:00:00+07:00'),
		('org_report_a','A-4','user-a','Ayu','[{"productId":"p-1","name":"Kopi","qty":1,"price":5000}]',5000,500,5500,'cash','completed','2026-07-11T09:00:00+07:00'),
		('org_report_b','B-1','user-b','Budi','[{"productId":"secret","name":"Rahasia","qty":9,"price":100000}]',900000,0,900000,'cash','completed','2026-07-14T10:00:00+07:00')`
	if _, err := admin.Exec(ctx, seed); err != nil {
		t.Fatalf("seed transactions: %v", err)
	}

	pool, err := database.NewPool(ctx, runtimeURL, 2)
	if err != nil {
		t.Fatalf("create runtime pool: %v", err)
	}
	defer pool.Close()
	service := report.NewService(database.Runner{DB: pool}, report.PostgresRepository{})
	got, err := service.Report(ctx, database.Identity{OrgID: "org_report_a", UserID: "reader-a"}, report.FilterInput{
		DateFrom: "2026-07-14", DateTo: "2026-07-16",
	}, time.Date(2026, 7, 17, 9, 0, 0, 0, report.WIBLocation()))
	if err != nil {
		t.Fatal(err)
	}
	if got.Metrics.NetSales != 30000 || got.Metrics.Tax != 3000 || got.Metrics.TotalReceived != 33000 {
		t.Fatalf("metrics=%#v", got.Metrics)
	}
	if got.Metrics.CompletedTransactions != 2 || got.Metrics.ItemsSold != 3 || got.Metrics.AverageTransaction != 16500 {
		t.Fatalf("metrics=%#v", got.Metrics)
	}
	if got.PreviousMetrics.TotalReceived != 5500 {
		t.Fatalf("previous metrics=%#v", got.PreviousMetrics)
	}
	if got.Voids.Count != 1 || got.Voids.OriginalValue != 8000 {
		t.Fatalf("voids=%#v", got.Voids)
	}
	if len(got.Trend) != 3 || got.Trend[1].TotalReceived != 0 {
		t.Fatalf("trend=%#v", got.Trend)
	}
	if len(got.TopProducts) != 1 || got.TopProducts[0].Quantity != 3 || got.TopProducts[0].NetSales != 30000 {
		t.Fatalf("products=%#v", got.TopProducts)
	}
	if len(got.PaymentMethods) != 1 || got.PaymentMethods[0].PaymentMethod != "cash" || got.PaymentMethods[0].TotalReceived != 33000 {
		t.Fatalf("payments=%#v", got.PaymentMethods)
	}
	if len(got.Cashiers) != 1 || got.Cashiers[0].CashierUserID != "user-a" || got.Cashiers[0].Label != "Ayu" {
		t.Fatalf("cashiers=%#v", got.Cashiers)
	}

	unknown, err := service.Report(ctx, database.Identity{OrgID: "org_report_a", UserID: "reader-a"}, report.FilterInput{
		DateFrom: "2026-07-14", DateTo: "2026-07-16", CashierProvided: true, CashierUserID: "user-b",
	}, time.Date(2026, 7, 17, 9, 0, 0, 0, report.WIBLocation()))
	if err != nil {
		t.Fatal(err)
	}
	if unknown.Metrics.TotalReceived != 0 || len(unknown.TopProducts) != 0 || len(unknown.PaymentMethods) != 0 || len(unknown.Cashiers) != 0 {
		t.Fatalf("cross-tenant filter leaked data: %#v", unknown)
	}
	if len(unknown.CashierOptions) != 1 || unknown.CashierOptions[0].CashierUserID != "user-a" {
		t.Fatalf("cashier options=%#v", unknown.CashierOptions)
	}
}
