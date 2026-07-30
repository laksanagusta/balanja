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
	products := []Product{
		{ID: "a", Name: "A", Category: "Makanan", Unit: "pcs", Active: true, Stock: 10},
		{ID: "b", Name: "B", Category: "Minuman", Unit: "botol", Active: true, Stock: 2},
	}

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
	if got.LowStock[0].Category != "Minuman" || got.LowStock[0].Unit != "botol" {
		t.Fatalf("low stock metadata=%#v", got.LowStock[0])
	}
}

func TestBuildSummaryTodayUsesElapsedPriorWindowAndHourlyTrend(t *testing.T) {
	t.Parallel()
	location := time.FixedZone("WIB", 7*60*60)
	now := time.Date(2026, 7, 10, 12, 30, 0, 0, location)
	transactions := []Transaction{
		{CreatedAt: time.Date(2026, 7, 10, 9, 15, 0, 0, location), Status: "completed", Total: 120000},
		{CreatedAt: time.Date(2026, 7, 9, 9, 15, 0, 0, location), Status: "completed", Total: 100000},
		{CreatedAt: time.Date(2026, 7, 9, 14, 0, 0, 0, location), Status: "completed", Total: 900000},
	}

	got := BuildSummary(transactions, nil, 1, now)
	if got.Revenue != 120000 || got.TransactionCount != 1 {
		t.Fatalf("today summary=%#v", got)
	}
	if got.Comparisons["revenue"].Percent == nil || *got.Comparisons["revenue"].Percent != 20 {
		t.Fatalf("today comparison=%#v", got.Comparisons["revenue"])
	}
	if len(got.RevenueTrend) != 13 {
		t.Fatalf("hourly trend length=%d", len(got.RevenueTrend))
	}
	if got.RevenueTrend[9].Revenue != 120000 || got.RevenueTrend[9].Label != "09.00" || got.RevenueTrend[9].CurrentBucket == "" {
		t.Fatalf("hourly trend point=%#v", got.RevenueTrend[9])
	}
}
