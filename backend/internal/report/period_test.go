package report

import (
	"errors"
	"testing"
	"time"
)

func TestNormalizeFilterBuildsEqualPreviousPeriod(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 17, 9, 0, 0, 0, WIBLocation())
	got, err := NormalizeFilter(FilterInput{
		DateFrom: "2026-07-01", DateTo: "2026-07-17", PaymentMethod: " CASH ",
	}, now)
	if err != nil {
		t.Fatal(err)
	}
	if got.Current.Days != 17 ||
		got.Current.Start.Format("2006-01-02") != "2026-07-01" ||
		got.Current.End.Format("2006-01-02") != "2026-07-18" {
		t.Fatalf("current=%#v", got.Current)
	}
	if got.Previous.Start.Format("2006-01-02") != "2026-06-14" ||
		got.Previous.End.Format("2006-01-02") != "2026-07-01" {
		t.Fatalf("previous=%#v", got.Previous)
	}
	if got.PaymentMethod != "cash" {
		t.Fatalf("payment=%q", got.PaymentMethod)
	}
}

func TestNormalizeFilterValidation(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 17, 9, 0, 0, 0, WIBLocation())
	tests := []struct {
		name  string
		input FilterInput
		want  error
	}{
		{name: "one day", input: FilterInput{DateFrom: "2026-07-17", DateTo: "2026-07-17"}},
		{name: "leap year 366 days", input: FilterInput{DateFrom: "2024-01-01", DateTo: "2024-12-31"}},
		{name: "reversed", input: FilterInput{DateFrom: "2026-07-17", DateTo: "2026-07-16"}, want: ErrInvalidDateRange},
		{name: "367 days", input: FilterInput{DateFrom: "2024-01-01", DateTo: "2025-01-01"}, want: ErrDateRangeTooLong},
		{name: "future", input: FilterInput{DateFrom: "2026-07-17", DateTo: "2026-07-18"}, want: ErrFutureDate},
		{name: "unsupported payment", input: FilterInput{DateFrom: "2026-07-17", DateTo: "2026-07-17", PaymentMethod: "card"}, want: ErrInvalidPaymentMethod},
		{name: "blank cashier", input: FilterInput{DateFrom: "2026-07-17", DateTo: "2026-07-17", CashierProvided: true, CashierUserID: "  "}, want: ErrInvalidCashier},
		{name: "long cashier", input: FilterInput{DateFrom: "2026-07-17", DateTo: "2026-07-17", CashierProvided: true, CashierUserID: string(make([]byte, 256))}, want: ErrInvalidCashier},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeFilter(tt.input, now)
			if tt.want != nil {
				if !errors.Is(err, tt.want) {
					t.Fatalf("error=%v, want %v", err, tt.want)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got.Current.Days < 1 || got.Current.Days > 366 {
				t.Fatalf("days=%d", got.Current.Days)
			}
		})
	}
}
