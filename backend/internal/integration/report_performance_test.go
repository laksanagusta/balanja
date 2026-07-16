//go:build integration

package integration

import (
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/report"
	"context"
	"fmt"
	"os"
	"sort"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
)

func TestSalesReportPerformance(t *testing.T) {
	if os.Getenv("RUN_REPORT_PERF") != "1" {
		t.Skip("RUN_REPORT_PERF=1 is required")
	}
	adminURL := os.Getenv("TEST_DATABASE_URL")
	runtimeURL := os.Getenv("TEST_RUNTIME_DATABASE_URL")
	if adminURL == "" || runtimeURL == "" {
		t.Fatal("TEST_DATABASE_URL and TEST_RUNTIME_DATABASE_URL are required")
	}

	ctx := context.Background()
	admin, err := pgx.Connect(ctx, adminURL)
	if err != nil {
		t.Fatalf("connect admin: %v", err)
	}
	orgID := fmt.Sprintf("org_report_perf_%d", time.Now().UnixNano())
	t.Cleanup(func() {
		if _, cleanupErr := admin.Exec(context.Background(), `delete from transactions where org_id=$1`, orgID); cleanupErr != nil {
			t.Errorf("cleanup performance tenant: %v", cleanupErr)
		}
		_ = admin.Close(context.Background())
	})

	location := report.WIBLocation()
	today := time.Now().In(location)
	endDate := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, location)
	startDate := endDate.AddDate(0, 0, -364)
	const seed = `
		insert into transactions
			(org_id,number,cashier_user_id,cashier_name,items,subtotal,tax,total,payment_method,cash_received,change_due,status,created_at)
		select $1,
			'PERF-' || lpad(g::text, 6, '0'),
			'perf-user-' || ((g-1) % 8 + 1),
			'Kasir ' || ((g-1) % 8 + 1),
			jsonb_build_array(jsonb_build_object('productId','perf-product-' || ((g-1) % 40 + 1),'name','Produk ' || ((g-1) % 40 + 1),'qty',1 + (g % 3),'price',1000)),
			1000 * (1 + (g % 3)), 100 * (1 + (g % 3)), 1100 * (1 + (g % 3)),
			case when g % 3 = 0 then 'qris' else 'cash' end,
			0, 0, 'completed',
			$2::timestamptz + ((g-1) % 365) * interval '1 day' + ((g-1) % 86400) * interval '1 second'
		from generate_series(1, 182500) g`
	if _, err := admin.Exec(ctx, seed, orgID, startDate); err != nil {
		t.Fatalf("seed performance transactions: %v", err)
	}

	pool, err := database.NewPool(ctx, runtimeURL, 4)
	if err != nil {
		t.Fatalf("create runtime pool: %v", err)
	}
	defer pool.Close()
	service := report.NewService(database.Runner{DB: pool}, report.PostgresRepository{})
	identity := database.Identity{OrgID: orgID, UserID: "perf-reader"}
	filter := report.FilterInput{DateFrom: startDate.Format("2006-01-02"), DateTo: endDate.Format("2006-01-02")}
	now := endDate.Add(12 * time.Hour)
	if _, err := service.Report(ctx, identity, filter, now); err != nil {
		t.Fatalf("warm report: %v", err)
	}

	durations := make([]time.Duration, 20)
	for index := range durations {
		started := time.Now()
		if _, err := service.Report(ctx, identity, filter, now); err != nil {
			t.Fatalf("report iteration %d: %v", index, err)
		}
		durations[index] = time.Since(started)
	}
	sort.Slice(durations, func(i, j int) bool { return durations[i] < durations[j] })
	p50 := durations[len(durations)/2]
	p95 := durations[18]
	t.Logf("sales report dataset=182500 iterations=20 p50=%s p95=%s", p50, p95)
	if p95 > 2*time.Second {
		t.Fatalf("p95=%s exceeds 2s target", p95)
	}
}
