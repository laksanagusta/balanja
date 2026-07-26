package entitlement

import (
	"context"
	"errors"
	"testing"

	"balanja/backend/internal/platform/database"
)

func TestSummarizeDerivesTrialCapabilities(t *testing.T) {
	limit := int64(50)
	got := Summarize(Record{
		Status: StatusTrial, TransactionLimit: &limit,
		TransactionsUsed: 45, SupportReference: "ABC123",
	})
	if got.Remaining != 5 || !got.CanCheckout || got.UnlimitedTransactions {
		t.Fatalf("summary=%#v", got)
	}
}

func TestSummarizeBlocksExhaustedAndSuspendedStores(t *testing.T) {
	limit := int64(50)
	trial := Summarize(Record{Status: StatusTrial, TransactionLimit: &limit, TransactionsUsed: 50})
	suspended := Summarize(Record{Status: StatusPaidSuspended, TransactionsUsed: 50})
	if trial.CanCheckout || suspended.CanCheckout {
		t.Fatalf("trial=%#v suspended=%#v", trial, suspended)
	}
}

func TestServiceRecordsOnlyClientUpgradeEvents(t *testing.T) {
	repository := &fakeRepository{}
	service := NewService(fakeRunner{}, repository)
	identity := database.Identity{OrgID: "org", UserID: "user"}

	if err := service.RecordEvent(context.Background(), identity, "upgrade_whatsapp_clicked"); err != nil {
		t.Fatal(err)
	}
	if repository.event != "upgrade_whatsapp_clicked" {
		t.Fatalf("event=%q", repository.event)
	}
	if err := service.RecordEvent(context.Background(), identity, "transaction_50"); !errors.Is(err, ErrInvalidEvent) {
		t.Fatalf("err=%v", err)
	}
}

type fakeRunner struct{}

func (fakeRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeRepository struct {
	record Record
	event  string
}

func (f *fakeRepository) GetOrCreate(_ context.Context, _ database.Tx, orgID string) (Record, error) {
	f.record.OrgID = orgID
	return f.record, nil
}

func (f *fakeRepository) RecordEvent(_ context.Context, _ database.Tx, _ string, event string) error {
	f.event = event
	return nil
}
