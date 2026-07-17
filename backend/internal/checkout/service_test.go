package checkout

import (
	"context"
	"errors"
	"testing"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

func TestServiceRejectsInvalidCheckout(t *testing.T) {
	t.Parallel()
	productID := uuid.New()
	tests := []struct {
		name  string
		key   string
		input Input
	}{
		{name: "short idempotency key", key: "short", input: Input{Items: []ItemInput{{ProductID: productID, Quantity: 1}}, Payment: PaymentInput{Method: "qris"}}},
		{name: "empty cart", key: "checkout-key", input: Input{Payment: PaymentInput{Method: "qris"}}},
		{name: "zero quantity", key: "checkout-key", input: Input{Items: []ItemInput{{ProductID: productID}}, Payment: PaymentInput{Method: "qris"}}},
		{name: "bad payment", key: "checkout-key", input: Input{Items: []ItemInput{{ProductID: productID, Quantity: 1}}, Payment: PaymentInput{Method: "card"}}},
		{name: "cashier name too long", key: "checkout-key", input: Input{Items: []ItemInput{{ProductID: productID, Quantity: 1}}, Payment: PaymentInput{Method: "qris"}, CashierName: string(make([]byte, 121))}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := NewService(fakeCheckoutRunner{}, &fakeCheckoutRepository{}).Checkout(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, tt.key, tt.input)
			if !errors.Is(err, ErrInvalidCheckout) {
				t.Fatalf("Checkout() error=%v, want ErrInvalidCheckout", err)
			}
		})
	}
}

func TestServiceNormalizesCashierNameBeforeFingerprinting(t *testing.T) {
	t.Parallel()
	repository := &fakeCheckoutRepository{}
	input := Input{
		Items:       []ItemInput{{ProductID: uuid.New(), Quantity: 1}},
		Payment:     PaymentInput{Method: "qris"},
		CashierName: "  Ayu Pratiwi  ",
	}
	_, err := NewService(fakeCheckoutRunner{}, repository).Checkout(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, "checkout-key", input)
	if err != nil {
		t.Fatal(err)
	}
	if repository.input.CashierName != "Ayu Pratiwi" {
		t.Fatalf("cashier name=%q", repository.input.CashierName)
	}
}

func TestServiceCombinesDuplicateItemsAndCreatesStableFingerprint(t *testing.T) {
	t.Parallel()
	first, second := uuid.New(), uuid.New()
	repository := &fakeCheckoutRepository{}
	input := Input{Items: []ItemInput{{ProductID: second, Quantity: 1}, {ProductID: first, Quantity: 2}, {ProductID: second, Quantity: 3}}, Payment: PaymentInput{Method: "cash", CashReceived: 100000}}
	_, err := NewService(fakeCheckoutRunner{}, repository).Checkout(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, "checkout-key", input)
	if err != nil {
		t.Fatalf("Checkout() error=%v", err)
	}
	if len(repository.input.Items) != 2 || repository.input.Items[1].Quantity+repository.input.Items[0].Quantity != 6 {
		t.Fatalf("normalized items=%#v", repository.input.Items)
	}
	if len(repository.fingerprint) != 64 {
		t.Fatalf("fingerprint=%q", repository.fingerprint)
	}
}

type fakeCheckoutRunner struct{}

func (fakeCheckoutRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeCheckoutRepository struct {
	input       Input
	fingerprint string
}

func (f *fakeCheckoutRepository) Execute(_ context.Context, _ database.Tx, _ database.Identity, key, fingerprint string, input Input) (Result, error) {
	f.input = input
	f.fingerprint = fingerprint
	return Result{}, nil
}
