package product

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/color"
	"image/png"
	"slices"
	"testing"

	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/objectstore"
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

func TestValidateProductImageRejectsMalformedContent(t *testing.T) {
	t.Parallel()

	_, err := validateProductImage(ImageUpload{Filename: "photo.png", Data: []byte("not an image")})
	if !errors.Is(err, ErrInvalidImage) {
		t.Fatalf("validateProductImage() error = %v, want ErrInvalidImage", err)
	}
}

func TestValidateProductImageRejectsOversizedFile(t *testing.T) {
	t.Parallel()

	_, err := validateProductImage(ImageUpload{Filename: "photo.png", Data: make([]byte, MaxProductImageBytes+1)})
	if !errors.Is(err, ErrImageTooLarge) {
		t.Fatalf("validateProductImage() error = %v, want ErrImageTooLarge", err)
	}
}

func TestValidateProductImageAcceptsPNG(t *testing.T) {
	t.Parallel()

	validated, err := validateProductImage(ImageUpload{Filename: "photo.fake", Data: validPNG(t)})
	if err != nil {
		t.Fatal(err)
	}
	if validated.ContentType != "image/png" || validated.Extension != "png" {
		t.Fatalf("validated image = %#v", validated)
	}
}

func TestServiceUpdateReplaceCompensatesDatabaseFailure(t *testing.T) {
	t.Parallel()

	images := &fakeImageStore{put: objectstore.StoredObject{Key: "products/org/new.png", URL: "https://img.example/new.png"}}
	service := NewService(fakeRunner{err: errors.New("database down")}, &fakeRepository{}, WithImageStore(images))
	_, err := service.Update(context.Background(), database.Identity{OrgID: "org"}, uuid.New(), validUpdateInput(), ImageMutation{
		Mode: ImageReplace, Upload: &ImageUpload{Filename: "photo.png", Data: validPNG(t)},
	})
	if err == nil {
		t.Fatal("Update() error = nil, want database failure")
	}
	if !slices.Equal(images.deleted, []string{"products/org/new.png"}) {
		t.Fatalf("deleted keys = %#v", images.deleted)
	}
}

func TestServiceUpdateDeletesPreviousImageAfterSuccess(t *testing.T) {
	t.Parallel()

	images := &fakeImageStore{put: objectstore.StoredObject{Key: "products/org/new.png", URL: "https://img.example/new.png"}}
	repository := &fakeRepository{updateResult: UpdateResult{
		Product:          Product{Image: "https://img.example/new.png", ImageKey: "products/org/new.png"},
		PreviousImageKey: "products/org/old.png",
	}}
	service := NewService(fakeRunner{}, repository, WithImageStore(images))
	_, err := service.Update(context.Background(), database.Identity{OrgID: "org"}, uuid.New(), validUpdateInput(), ImageMutation{
		Mode: ImageReplace, Upload: &ImageUpload{Filename: "photo.png", Data: validPNG(t)},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(images.deleted, []string{"products/org/old.png"}) {
		t.Fatalf("deleted keys = %#v", images.deleted)
	}
}

func TestServiceCreateImageCompensatesDatabaseFailure(t *testing.T) {
	t.Parallel()

	images := &fakeImageStore{put: objectstore.StoredObject{Key: "products/org/new.png", URL: "https://img.example/new.png"}}
	service := NewService(fakeRunner{err: errors.New("database down")}, &fakeRepository{}, WithImageStore(images))
	_, err := service.Create(context.Background(), database.Identity{OrgID: "org"}, CreateInput{Name: "Tea", Barcode: "1", Category: "Drink", Price: 10, Stock: 1, Unit: "pcs"}, &ImageUpload{Filename: "photo.png", Data: validPNG(t)})
	if err == nil || !slices.Equal(images.deleted, []string{"products/org/new.png"}) {
		t.Fatalf("err=%v deleted=%v", err, images.deleted)
	}
}

func TestServiceRemoveImageDeletesPreviousAfterSuccess(t *testing.T) {
	t.Parallel()

	images := &fakeImageStore{}
	repository := &fakeRepository{updateResult: UpdateResult{Product: Product{}, PreviousImageKey: "products/org/old.png"}}
	service := NewService(fakeRunner{}, repository, WithImageStore(images))
	_, err := service.Update(context.Background(), database.Identity{OrgID: "org"}, uuid.New(), validUpdateInput(), ImageMutation{Mode: ImageRemove})
	if err != nil || repository.update.Image != "" || repository.update.ImageKey != "" || !slices.Equal(images.deleted, []string{"products/org/old.png"}) {
		t.Fatalf("err=%v update=%#v deleted=%v", err, repository.update, images.deleted)
	}
}

func validPNG(t *testing.T) []byte {
	t.Helper()
	var encoded bytes.Buffer
	pixel := image.NewRGBA(image.Rect(0, 0, 1, 1))
	pixel.Set(0, 0, color.White)
	if err := png.Encode(&encoded, pixel); err != nil {
		t.Fatal(err)
	}
	return encoded.Bytes()
}

func validUpdateInput() UpdateInput {
	return UpdateInput{Name: "Tea", Barcode: "1", Category: "Drink", Price: 10, Unit: "pcs", Active: true}
}

type fakeRunner struct{ err error }

func (f fakeRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	if f.err != nil {
		return f.err
	}
	return fn(nil)
}

type fakeRepository struct {
	create       CreateInput
	err          error
	listRows     []Product
	listFilter   ListFilter
	update       UpdateInput
	updateResult UpdateResult
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
func (f *fakeRepository) Update(_ context.Context, _ database.Tx, _ string, _ uuid.UUID, input UpdateInput) (UpdateResult, error) {
	f.update = input
	if f.err != nil {
		return UpdateResult{}, f.err
	}
	return f.updateResult, nil
}

type fakeImageStore struct {
	put       objectstore.StoredObject
	putErr    error
	deleted   []string
	deleteErr error
}

func (f *fakeImageStore) Put(context.Context, objectstore.PutInput) (objectstore.StoredObject, error) {
	return f.put, f.putErr
}

func (f *fakeImageStore) Delete(_ context.Context, key string) error {
	f.deleted = append(f.deleted, key)
	return f.deleteErr
}
func (f *fakeRepository) Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error) {
	return Product{}, nil
}
