package stock

import (
	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestResolveManualMovement(t *testing.T) {
	tests := []struct {
		name      string
		movement  MovementType
		current   int
		quantity  int
		wantDelta int
		wantAfter int
		wantErr   error
	}{
		{name: "restock", movement: MovementTypeRestock, current: 7, quantity: 5, wantDelta: 5, wantAfter: 12},
		{name: "reduce", movement: MovementTypeReduce, current: 7, quantity: 5, wantDelta: -5, wantAfter: 2},
		{name: "set exact", movement: MovementTypeSetExact, current: 7, quantity: 3, wantDelta: -4, wantAfter: 3},
		{name: "negative final stock", movement: MovementTypeReduce, current: 3, quantity: 4, wantErr: ErrInsufficientStock},
		{name: "zero restock", movement: MovementTypeRestock, current: 3, quantity: 0, wantErr: ErrInvalidStockMovement},
		{name: "set exact no-op", movement: MovementTypeSetExact, current: 3, quantity: 3, wantErr: ErrInvalidStockMovement},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			delta, after, err := ResolveManualMovement(tt.movement, tt.current, tt.quantity)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("err = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected err: %v", err)
			}
			if delta != tt.wantDelta || after != tt.wantAfter {
				t.Fatalf("delta/after = %d/%d, want %d/%d", delta, after, tt.wantDelta, tt.wantAfter)
			}
		})
	}
}

func TestServiceRejectsInactiveProduct(t *testing.T) {
	repo := &fakeRepository{product: LockedProduct{ID: uuid.New(), Name: "Tea", Stock: 10, IsActive: false}}
	service := NewService(fakeRunner{}, repo)

	_, err := service.Create(context.Background(), database.Identity{OrgID: "org-1", UserID: "user-1"}, CreateInput{
		ProductID: repo.product.ID,
		Type:      MovementTypeRestock,
		Quantity:  1,
		Reason:    "Stock count",
	})
	if !errors.Is(err, ErrProductInactive) {
		t.Fatalf("err = %v, want %v", err, ErrProductInactive)
	}
}

func TestServiceListDefaultsToNewestStockMovement(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{}
	page, err := NewService(fakeRunner{}, repository).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{})
	if err != nil {
		t.Fatal(err)
	}
	if repository.filter.Sort != "createdAt" || repository.filter.Direction != "desc" || repository.filter.Limit != 21 {
		t.Fatalf("filter = %#v", repository.filter)
	}
	if page.Items == nil || page.HasNextPage {
		t.Fatalf("page = %#v", page)
	}
}

func TestServiceListRejectsUnsupportedStockSort(t *testing.T) {
	t.Parallel()

	_, err := NewService(fakeRunner{}, &fakeRepository{}).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Sort: "reason", Direction: "asc", Limit: 20,
	})
	if !errors.Is(err, ErrInvalidStockMovement) {
		t.Fatalf("List() error = %v, want ErrInvalidStockMovement", err)
	}
}

func TestServiceListUsesLastVisibleDuplicateAsNextCursor(t *testing.T) {
	t.Parallel()

	firstID, secondID, extraID := uuid.New(), uuid.New(), uuid.New()
	repository := &fakeRepository{rows: []Movement{
		{ID: firstID, ProductName: "Tea"},
		{ID: secondID, ProductName: "Tea"},
		{ID: extraID, ProductName: "Tea"},
	}}
	page, err := NewService(fakeRunner{}, repository).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Limit: 2, Sort: "productName", Direction: "asc",
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
	var productName string
	if err := json.Unmarshal(payload.Value, &productName); err != nil {
		t.Fatal(err)
	}
	if payload.ID != secondID || productName != "Tea" {
		t.Fatalf("cursor payload = %#v, productName = %q", payload, productName)
	}
}

type fakeRunner struct{}

func (fakeRunner) Run(ctx context.Context, identity database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeRepository struct {
	product LockedProduct
	rows    []Movement
	filter  ListFilter
}

func (f *fakeRepository) Create(ctx context.Context, tx database.Tx, identity database.Identity, input CreateInput) (CreateResult, error) {
	if !f.product.IsActive {
		return CreateResult{}, ErrProductInactive
	}
	delta, after, err := ResolveManualMovement(input.Type, f.product.Stock, input.Quantity)
	if err != nil {
		return CreateResult{}, err
	}
	return CreateResult{
		Movement: Movement{
			ID:              uuid.New(),
			ProductID:       input.ProductID,
			Type:            input.Type,
			QuantityDelta:   delta,
			StockBefore:     f.product.Stock,
			StockAfter:      after,
			Reason:          input.Reason,
			CreatedByUserID: identity.UserID,
			CreatedAt:       time.Now(),
		},
		Product: ProductStock{ID: input.ProductID, Stock: after, UpdatedAt: time.Now()},
	}, nil
}

func (f *fakeRepository) List(ctx context.Context, tx database.Tx, identity database.Identity, filter ListFilter) ([]Movement, error) {
	f.filter = filter
	return f.rows, nil
}
