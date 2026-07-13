package transaction

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

func TestServiceListNormalizesTransactionFilters(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{}
	page, err := NewService(fakeRunner{}, repository).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Query: " TRX ", PaymentMethod: " CASH ", Limit: 20, Sort: "total", Direction: "desc",
	})
	if err != nil {
		t.Fatal(err)
	}
	if repository.filter.Query != "TRX" || repository.filter.PaymentMethod != "cash" {
		t.Fatalf("filter = %#v", repository.filter)
	}
	if page.Items == nil || page.HasNextPage {
		t.Fatalf("page = %#v", page)
	}
}

func TestServiceListRejectsDateRangeInReverse(t *testing.T) {
	t.Parallel()

	dateTo := time.Now()
	dateFrom := dateTo.Add(time.Hour)
	_, err := NewService(fakeRunner{}, &fakeRepository{}).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		DateFrom: &dateFrom, DateTo: &dateTo,
	})
	if !errors.Is(err, ErrInvalidFilter) {
		t.Fatalf("List() error = %v, want ErrInvalidFilter", err)
	}
}

func TestServiceListUsesLastVisibleDuplicateAsNextCursor(t *testing.T) {
	t.Parallel()

	firstID, secondID, extraID := uuid.New(), uuid.New(), uuid.New()
	repository := &fakeRepository{rows: []Transaction{
		{ID: firstID, Total: 10000},
		{ID: secondID, Total: 10000},
		{ID: extraID, Total: 10000},
	}}
	page, err := NewService(fakeRunner{}, repository).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Limit: 2, Sort: "total", Direction: "desc",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(page.Items) != 2 || !page.HasNextPage {
		t.Fatalf("page = %#v", page)
	}
	payload, err := listcursor.Decode(page.NextCursor)
	if err != nil {
		t.Fatal(err)
	}
	var cursorTotal int
	if err := json.Unmarshal(payload.Value, &cursorTotal); err != nil {
		t.Fatal(err)
	}
	if payload.ID != secondID || cursorTotal != 10000 {
		t.Fatalf("cursor payload = %#v, total = %d", payload, cursorTotal)
	}
}

type fakeRunner struct{}

func (fakeRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeRepository struct {
	rows   []Transaction
	filter ListFilter
}

func (r *fakeRepository) List(_ context.Context, _ database.Tx, _ string, filter ListFilter) ([]Transaction, error) {
	r.filter = filter
	return r.rows, nil
}
