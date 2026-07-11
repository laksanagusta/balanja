package product

import (
	"context"
	"errors"
	"testing"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

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
	create CreateInput
	err    error
}

func (f *fakeRepository) List(context.Context, database.Tx, string) ([]Product, error) {
	return nil, nil
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
