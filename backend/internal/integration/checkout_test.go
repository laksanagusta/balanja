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
		"000008_server_list_indexes.up.sql",
		"000009_product_image_key.up.sql",
		"000010_category_unit_master_data.up.sql",
		"000011_stock_movement_user_name.up.sql",
		"000012_organization_entitlements.up.sql",
	} {
		if _, err := admin.Exec(ctx, readMigration(t, migration)); err != nil {
			t.Fatalf("apply migration %s: %v", migration, err)
		}
	}

	productID := uuid.New()
	categoryID := uuid.New()
	unitID := uuid.New()
	if _, err := admin.Exec(ctx, `insert into store_settings (org_id) values ('org_checkout')`); err != nil {
		t.Fatalf("seed settings: %v", err)
	}
	if _, err := admin.Exec(ctx, `insert into categories (id,org_id,name) values ($1,'org_checkout','test')`, categoryID); err != nil {
		t.Fatalf("seed category: %v", err)
	}
	if _, err := admin.Exec(ctx, `insert into units (id,org_id,name) values ($1,'org_checkout','pcs')`, unitID); err != nil {
		t.Fatalf("seed unit: %v", err)
	}
	if _, err := admin.Exec(ctx, `insert into products (id,org_id,name,barcode,category_id,price,stock,unit_id) values ($1,'org_checkout','Last item','last',$2,100,1,$3)`, productID, categoryID, unitID); err != nil {
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

	quotaProductID := uuid.New()
	if _, err := admin.Exec(ctx, `insert into products (id,org_id,name,barcode,category_id,price,stock,unit_id) values ($1,'org_checkout','Quota item','quota',$2,100,2,$3)`, quotaProductID, categoryID, unitID); err != nil {
		t.Fatalf("seed quota product: %v", err)
	}
	if _, err := admin.Exec(ctx, `update organization_entitlements set transactions_used=49 where org_id='org_checkout'`); err != nil {
		t.Fatalf("seed quota usage: %v", err)
	}

	quotaInput := checkout.Input{Items: []checkout.ItemInput{{ProductID: quotaProductID, Quantity: 1}}, Payment: checkout.PaymentInput{Method: "qris"}, CashierName: "Ayu"}
	quotaErrors := make([]error, 2)
	quotaResults := make([]checkout.Result, 2)
	quotaKeys := []string{"quota-checkout-a", "quota-checkout-b"}
	for index := range quotaErrors {
		wait.Add(1)
		go func() {
			defer wait.Done()
			quotaResults[index], quotaErrors[index] = service.Checkout(ctx, database.Identity{OrgID: "org_checkout", UserID: "user"}, quotaKeys[index], quotaInput)
		}()
	}
	wait.Wait()
	successIndex := -1
	limited := 0
	for index, checkoutErr := range quotaErrors {
		if checkoutErr == nil {
			successIndex = index
		}
		if errors.Is(checkoutErr, checkout.ErrTransactionLimitReached) {
			limited++
		}
	}
	if successIndex < 0 || limited != 1 {
		t.Fatalf("quota successIndex=%d limited=%d errors=%v", successIndex, limited, quotaErrors)
	}
	replay, err := service.Checkout(ctx, database.Identity{OrgID: "org_checkout", UserID: "user"}, quotaKeys[successIndex], quotaInput)
	if err != nil || !replay.Replay {
		t.Fatalf("replay=%#v err=%v", replay, err)
	}
	var usage, quotaTransactions int
	if err := admin.QueryRow(ctx, `select transactions_used from organization_entitlements where org_id='org_checkout'`).Scan(&usage); err != nil {
		t.Fatalf("load quota usage: %v", err)
	}
	if err := admin.QueryRow(ctx, `select count(*) from transactions where org_id='org_checkout' and id=$1`, quotaResults[successIndex].Transaction.ID).Scan(&quotaTransactions); err != nil {
		t.Fatalf("count quota transactions: %v", err)
	}
	if usage != 50 || quotaTransactions != 1 {
		t.Fatalf("usage=%d quotaTransactions=%d", usage, quotaTransactions)
	}
}
