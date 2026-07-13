package product

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

func TestServiceListNormalizesProductQuery(t *testing.T) {
	t.Parallel()

	active := true
	repository := &fakeRepository{}
	page, err := NewService(fakeRunner{}, repository).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Query: " tea ", Category: " Drinks ", Active: &active, Limit: 20, Sort: "name", Direction: "asc",
	})
	if err != nil {
		t.Fatal(err)
	}
	if repository.listFilter.Query != "tea" || repository.listFilter.Category != "Drinks" {
		t.Fatalf("filter = %#v", repository.listFilter)
	}
	if page.Items == nil || page.HasNextPage {
		t.Fatalf("page = %#v", page)
	}
}

func TestServiceListRejectsUnsupportedProductSort(t *testing.T) {
	t.Parallel()

	_, err := NewService(fakeRunner{}, &fakeRepository{}).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Sort: "barcode", Direction: "asc", Limit: 20,
	})
	if !errors.Is(err, ErrInvalidProduct) {
		t.Fatalf("List() error = %v, want ErrInvalidProduct", err)
	}
}

func TestServiceListUsesLastVisibleDuplicateAsNextCursor(t *testing.T) {
	t.Parallel()

	firstID, secondID, extraID := uuid.New(), uuid.New(), uuid.New()
	repository := &fakeRepository{listRows: []Product{
		{ID: firstID, Name: "Tea"},
		{ID: secondID, Name: "Tea"},
		{ID: extraID, Name: "Tea"},
	}}
	page, err := NewService(fakeRunner{}, repository).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Limit: 2, Sort: "name", Direction: "asc",
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
	var cursorName string
	if err := json.Unmarshal(payload.Value, &cursorName); err != nil {
		t.Fatal(err)
	}
	if payload.ID != secondID || cursorName != "Tea" {
		t.Fatalf("cursor payload = %#v, name = %q", payload, cursorName)
	}
}

func TestServiceCreateValidatesAndNormalizes(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{}
	service := NewService(fakeRunner{}, repository)
	created, err := service.Create(context.Background(), database.Identity{OrgID: "org_1", UserID: "user_1"}, CreateInput{
		Name: " Teh Botol ", Barcode: " 8991 ", Category: " Minuman ", Price: 5000, Stock: 3, Unit: " botol ",
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if repository.create.Name != "Teh Botol" || repository.create.Barcode != "8991" || created.Name != "Teh Botol" {
		t.Fatalf("normalized product = %#v, repository input = %#v", created, repository.create)
	}
}

func TestServiceCreateRejectsInvalidProduct(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input CreateInput
	}{
		{name: "empty name", input: CreateInput{Barcode: "1", Category: "x", Price: 1, Unit: "pcs"}},
		{name: "zero price", input: CreateInput{Name: "x", Barcode: "1", Category: "x", Unit: "pcs"}},
		{name: "negative stock", input: CreateInput{Name: "x", Barcode: "1", Category: "x", Price: 1, Stock: -1, Unit: "pcs"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := NewService(fakeRunner{}, &fakeRepository{}).Create(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, tt.input)
			if !errors.Is(err, ErrInvalidProduct) {
				t.Fatalf("Create() error = %v, want ErrInvalidProduct", err)
			}
		})
	}
}

func TestServiceCreatePreservesBarcodeConflict(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{err: ErrBarcodeConflict}
	_, err := NewService(fakeRunner{}, repository).Create(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, CreateInput{Name: "x", Barcode: "1", Category: "x", Price: 1, Unit: "pcs"})
	if !errors.Is(err, ErrBarcodeConflict) {
		t.Fatalf("Create() error = %v, want ErrBarcodeConflict", err)
	}
}

type fakeRunner struct{ err error }

func (f fakeRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	if f.err != nil {
		return f.err
	}
	return fn(nil)
}

type fakeRepository struct {
	create     CreateInput
	err        error
	listRows   []Product
	listFilter ListFilter
}

func (f *fakeRepository) List(_ context.Context, _ database.Tx, _ string, filter ListFilter) ([]Product, error) {
	f.listFilter = filter
	return f.listRows, nil
}
func (f *fakeRepository) Create(_ context.Context, _ database.Tx, _ string, input CreateInput) (Product, error) {
	if f.err != nil {
		return Product{}, f.err
	}
	f.create = input
	return Product{ID: uuid.New(), Name: input.Name, Barcode: input.Barcode, Category: input.Category, Price: input.Price, Stock: input.Stock, Unit: input.Unit, Active: true}, nil
}
func (f *fakeRepository) Update(context.Context, database.Tx, string, uuid.UUID, UpdateInput) (Product, error) {
	return Product{}, nil
}
func (f *fakeRepository) Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error) {
	return Product{}, nil
}
