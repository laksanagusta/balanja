//go:build integration

package integration

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"

	"balanja/backend/internal/checkout"
	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func TestCheckoutSerializesFinalStock(t *testing.T) {
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

	productID := uuid.New()
	if _, err := admin.Exec(ctx, `insert into store_settings (org_id) values ('org_checkout')`); err != nil {
		t.Fatalf("seed settings: %v", err)
	}
	if _, err := admin.Exec(ctx, `insert into products (id,org_id,name,barcode,category,price,stock,unit) values ($1,'org_checkout','Last item','last','test',100,1,'pcs')`, productID); err != nil {
		t.Fatalf("seed product: %v", err)
	}

	pool, err := database.NewPool(ctx, runtimeURL, 4)
	if err != nil {
		t.Fatalf("create runtime pool: %v", err)
	}
	defer pool.Close()
	service := checkout.NewService(database.Runner{DB: pool}, checkout.PostgresRepository{})
	input := checkout.Input{Items: []checkout.ItemInput{{ProductID: productID, Quantity: 1}}, Payment: checkout.PaymentInput{Method: "qris"}, CashierName: "  Ayu  "}

	errorsByRequest := make([]error, 2)
	var wait sync.WaitGroup
	for index := range errorsByRequest {
		wait.Add(1)
		go func() {
			defer wait.Done()
			_, errorsByRequest[index] = service.Checkout(ctx, database.Identity{OrgID: "org_checkout", UserID: "user"}, "checkout-key-"+string(rune('a'+index)), input)
		}()
	}
	wait.Wait()
	success, insufficient := 0, 0
	for _, checkoutErr := range errorsByRequest {
		if checkoutErr == nil {
			success++
		}
		if errors.Is(checkoutErr, checkout.ErrInsufficientStock) {
			insufficient++
		}
	}
	if success != 1 || insufficient != 1 {
		t.Fatalf("success=%d insufficient=%d errors=%v", success, insufficient, errorsByRequest)
	}
	var saleMovements int
	if err := admin.QueryRow(ctx, `select count(*) from stock_movements where org_id='org_checkout' and product_id=$1 and type='sale' and quantity_delta=-1 and stock_before=1 and stock_after=0`, productID).Scan(&saleMovements); err != nil {
		t.Fatalf("count sale movements: %v", err)
	}
	if saleMovements != 1 {
		t.Fatalf("sale movements = %d, want 1", saleMovements)
	}
	var cashierUserID string
	var cashierName *string
	if err := admin.QueryRow(ctx, `select cashier_user_id,cashier_name from transactions where org_id='org_checkout' limit 1`).Scan(&cashierUserID, &cashierName); err != nil {
		t.Fatalf("load cashier snapshot: %v", err)
	}
	if cashierUserID != "user" || cashierName == nil || *cashierName != "Ayu" {
		t.Fatalf("cashier user=%q name=%v", cashierUserID, cashierName)
	}
}
