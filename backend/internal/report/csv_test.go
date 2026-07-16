package report

import (
	"bytes"
	"encoding/csv"
	"strings"
	"testing"
	"time"
)

func TestWriteTransactionCSVNeutralizesFormula(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	rows := []TransactionRow{{
		Number: "TRX-000001", CashierLabel: "=HYPERLINK(\"https://bad\")",
		CashierUserID: "user-1", PaymentMethod: "cash", ItemCount: 2,
		Subtotal: 10000, Tax: 1000, Total: 11000, Status: "completed",
		CreatedAt: time.Date(2026, 7, 17, 2, 0, 0, 0, time.UTC),
	}}
	if err := WriteTransactionCSV(&out, rows); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(out.String(), "\ufeff") || !strings.Contains(out.String(), "'=HYPERLINK") {
		t.Fatalf("csv=%q", out.String())
	}
	reader := csv.NewReader(strings.NewReader(strings.TrimPrefix(out.String(), "\ufeff")))
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if records[0][0] != "Nomor Transaksi" || records[1][1] != "2026-07-17 09:00:00" || records[1][2][0] != '\'' {
		t.Fatalf("records=%#v", records)
	}
}

func TestWriteDailyCSVUsesStableHeadersAndZeroRows(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	if err := WriteDailyCSV(&out, []DailyRow{{Date: "2026-07-17"}}); err != nil {
		t.Fatal(err)
	}
	records, err := csv.NewReader(strings.NewReader(strings.TrimPrefix(out.String(), "\ufeff"))).ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 2 || records[0][7] != "Nilai Void" || strings.Join(records[1], ",") != "2026-07-17,0,0,0,0,0,0,0" {
		t.Fatalf("records=%#v", records)
	}
}

func TestSafeCellNeutralizesSpreadsheetPrefixes(t *testing.T) {
	t.Parallel()
	for _, value := range []string{"=sum(1)", "+1", "-1", "@cmd", "\tvalue", "\rvalue", "  =sum(1)"} {
		if got := safeCell(value); !strings.HasPrefix(got, "'") {
			t.Errorf("safeCell(%q)=%q", value, got)
		}
	}
	if got := safeCell("Ayu"); got != "Ayu" {
		t.Fatalf("safeCell(Ayu)=%q", got)
	}
}
