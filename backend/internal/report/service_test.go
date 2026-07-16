package report

import (
	"balanja/backend/internal/platform/database"
	"context"
	"testing"
	"time"
)

type fakeRunner struct {
	identity database.Identity
	calls    int
}

func (r *fakeRunner) Run(ctx context.Context, id database.Identity, fn func(database.Tx) error) error {
	r.identity = id
	r.calls++
	return fn(nil)
}

type fakeRepository struct {
	data  ReportData
	query Query
	calls int
}

func (r *fakeRepository) Load(_ context.Context, _ database.Tx, _ string, query Query) (ReportData, error) {
	r.query = query
	r.calls++
	return r.data, nil
}

func TestServiceReportBuildsComparisons(t *testing.T) {
	t.Parallel()
	runner := &fakeRunner{}
	repo := &fakeRepository{data: ReportData{
		CurrentMetrics: Metrics{
			NetSales: 100000, Tax: 10000, TotalReceived: 110000,
			CompletedTransactions: 2, ItemsSold: 5, AverageTransaction: 55000,
		},
	}}
	now := time.Date(2026, 7, 17, 9, 0, 0, 0, WIBLocation())
	got, err := NewService(runner, repo).Report(
		context.Background(),
		database.Identity{OrgID: "org-1", UserID: "user-1"},
		FilterInput{DateFrom: "2026-07-01", DateTo: "2026-07-02"},
		now,
	)
	if err != nil {
		t.Fatal(err)
	}
	if got.Comparisons["totalReceived"].Percent != nil {
		t.Fatalf("comparison=%#v", got.Comparisons["totalReceived"])
	}
	if got.TopProducts == nil || got.Cashiers == nil || got.CashierOptions == nil || got.Trend == nil {
		t.Fatalf("collections=%#v", got)
	}
	if runner.calls != 1 || repo.calls != 1 || repo.query.Current.Days != 2 || repo.query.Previous.Days != 2 {
		t.Fatalf("runner=%d repository=%d query=%#v", runner.calls, repo.calls, repo.query)
	}
	if !got.GeneratedAt.Equal(now) || runner.identity.OrgID != "org-1" {
		t.Fatalf("generatedAt=%v identity=%#v", got.GeneratedAt, runner.identity)
	}
}

func TestComparisonRoundsAndSetsDirection(t *testing.T) {
	t.Parallel()
	tests := []struct {
		current, previous float64
		absolute          float64
		percent           *float64
		direction         string
	}{
		{current: 125, previous: 100, absolute: 25, percent: floatPointer(25), direction: "up"},
		{current: 2, previous: 3, absolute: -1, percent: floatPointer(-33.3), direction: "down"},
		{current: 0, previous: 0, absolute: 0, percent: nil, direction: "neutral"},
	}
	for _, tt := range tests {
		got := compare(tt.current, tt.previous)
		if got.Absolute != tt.absolute || got.Direction != tt.direction {
			t.Fatalf("compare(%v,%v)=%#v", tt.current, tt.previous, got)
		}
		if (got.Percent == nil) != (tt.percent == nil) || got.Percent != nil && *got.Percent != *tt.percent {
			t.Fatalf("percent=%v, want %v", got.Percent, tt.percent)
		}
	}
}

func floatPointer(value float64) *float64 { return &value }
