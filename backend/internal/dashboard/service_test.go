package dashboard

import (
	"testing"
	"time"
)

func TestBuildSummaryMatchesPOSMetrics(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 10, 12, 0, 0, 0, time.FixedZone("WIB", 7*60*60))
	transactions := []Transaction{
		{CreatedAt: time.Date(2026, 7, 10, 2, 0, 0, 0, time.UTC), Status: "completed", Total: 100000, PaymentMethod: "cash", Items: []Item{{ProductID: "rice", Name: "Rice", Quantity: 2, Price: 50000}}},
		{CreatedAt: time.Date(2026, 7, 9, 2, 0, 0, 0, time.UTC), Status: "completed", Total: 50000, PaymentMethod: "qris", Items: []Item{{ProductID: "soap", Name: "Soap", Quantity: 5, Price: 10000}}},
	}
	products := []Product{{ID: "a", Name: "A", Active: true, Stock: 10}, {ID: "b", Name: "B", Active: true, Stock: 2}}

	got := BuildSummary(transactions, products, 7, now)
	if got.Revenue != 150000 || got.TransactionCount != 2 || got.AverageTransactionValue != 75000 {
		t.Fatalf("summary=%#v", got)
	}
	if len(got.RevenueTrend) != 7 || len(got.PaymentMix) != 2 || len(got.LowStock) != 2 {
		t.Fatalf("summary collections=%#v", got)
	}
	if got.TopProducts[0].ProductID != "soap" || got.TopProducts[0].Quantity != 5 {
		t.Fatalf("top products=%#v", got.TopProducts)
	}
}
