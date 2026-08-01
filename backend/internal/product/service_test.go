package product

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
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
		Query: " tea ", Active: &active, Limit: 20, Sort: "name", Direction: "asc",
	})
	if err != nil {
		t.Fatal(err)
	}
	if repository.listFilter.Query != "tea" {
		t.Fatalf("filter = %#v", repository.listFilter)
	}
	if page.Items == nil || page.HasNextPage {
		t.Fatalf("page = %#v", page)
	}
}

func TestServiceListUsesFirstPartyURLForOwnedProductImages(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{listRows: []Product{{
		ID:       uuid.New(),
		Image:    "https://example.r2.dev/products/org/photo.jpg",
		ImageKey: "products/org/photo.jpg",
	}}}
	page, err := NewService(fakeRunner{}, repository, WithImageStore(&fakeImageStore{})).List(
		context.Background(),
		database.Identity{OrgID: "org"},
		ListFilter{Limit: 20},
	)
	if err != nil {
		t.Fatal(err)
	}
	if got := page.Items[0].Image; got != "/api/v1/product-images/products/org/photo.jpg" {
		t.Fatalf("image URL = %q", got)
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
		Name: " Teh Botol ", Barcode: " 8991 ", CategoryID: uuid.MustParse("11111111-1111-1111-1111-111111111111"), Price: 5000, Stock: 3, UnitID: uuid.MustParse("22222222-2222-2222-2222-222222222222"),
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
		{name: "empty name", input: CreateInput{Barcode: "1", CategoryID: uuid.New(), Price: 1, UnitID: uuid.New()}},
		{name: "zero price", input: CreateInput{Name: "x", Barcode: "1", CategoryID: uuid.New(), UnitID: uuid.New()}},
		{name: "negative stock", input: CreateInput{Name: "x", Barcode: "1", CategoryID: uuid.New(), Price: 1, Stock: -1, UnitID: uuid.New()}},
		{name: "missing category", input: CreateInput{Name: "x", Barcode: "1", Price: 1, UnitID: uuid.New()}},
		{name: "missing unit", input: CreateInput{Name: "x", Barcode: "1", CategoryID: uuid.New(), Price: 1}},
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
	_, err := NewService(fakeRunner{}, repository).Create(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, CreateInput{Name: "x", Barcode: "1", CategoryID: uuid.New(), Price: 1, UnitID: uuid.New()})
	if !errors.Is(err, ErrBarcodeConflict) {
		t.Fatalf("Create() error = %v, want ErrBarcodeConflict", err)
	}
}

func TestUpdateAllowsCurrentArchivedReferencesButRejectsNewOnes(t *testing.T) {
	t.Parallel()

	currentCategory := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	currentUnit := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	repository := &fakeRepository{
		current:                  Product{CategoryID: currentCategory, UnitID: currentUnit},
		activeCategory:           false,
		activeUnit:               false,
		categoryActiveConfigured: true,
		unitActiveConfigured:     true,
		updateResult: UpdateResult{
			Product: Product{ID: uuid.New(), CategoryID: currentCategory, UnitID: currentUnit},
		},
	}
	service := NewService(fakeRunner{}, repository)
	input := UpdateInput{Name: "Tea", Barcode: "1", CategoryID: currentCategory, UnitID: currentUnit, Price: 100, Active: true}
	if _, err := service.Update(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, uuid.New(), input); err != nil {
		t.Fatalf("preserving archived references: %v", err)
	}
	input.CategoryID = uuid.New()
	if _, err := service.Update(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, uuid.New(), input); !errors.Is(err, ErrInvalidReference) {
		t.Fatalf("new archived reference error = %v", err)
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

func TestValidateProductImageCompressesPNGToJPEG(t *testing.T) {
	t.Parallel()

	validated, err := validateProductImage(ImageUpload{Filename: "photo.fake", Data: validPNG(t)})
	if err != nil {
		t.Fatal(err)
	}
	if validated.ContentType != "image/jpeg" || validated.Extension != "jpg" {
		t.Fatalf("validated image = %#v", validated)
	}
	if len(validated.Data) > MaxStoredProductImageBytes {
		t.Fatalf("compressed image size = %d, want <= %d", len(validated.Data), MaxStoredProductImageBytes)
	}
	if _, format, err := image.Decode(bytes.NewReader(validated.Data)); err != nil || format != "jpeg" {
		t.Fatalf("compressed image format = %q, error = %v", format, err)
	}
}

func TestValidateProductImageShrinksLargeDetailedImageBelowStorageLimit(t *testing.T) {
	t.Parallel()

	source := image.NewRGBA(image.Rect(0, 0, 1600, 1200))
	for y := 0; y < source.Bounds().Dy(); y++ {
		for x := 0; x < source.Bounds().Dx(); x++ {
			source.SetRGBA(x, y, color.RGBA{
				R: uint8((x*31 + y*17) % 256),
				G: uint8((x*13 + y*47) % 256),
				B: uint8((x*61 + y*7) % 256),
				A: 255,
			})
		}
	}
	var upload bytes.Buffer
	if err := jpeg.Encode(&upload, source, &jpeg.Options{Quality: 100}); err != nil {
		t.Fatal(err)
	}
	if upload.Len() > MaxProductImageBytes {
		t.Fatalf("test upload size = %d, want <= %d", upload.Len(), MaxProductImageBytes)
	}

	validated, err := validateProductImage(ImageUpload{Filename: "detailed.jpg", Data: upload.Bytes()})
	if err != nil {
		t.Fatal(err)
	}
	if len(validated.Data) > MaxStoredProductImageBytes {
		t.Fatalf("compressed image size = %d, want <= %d", len(validated.Data), MaxStoredProductImageBytes)
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
	_, err := service.Create(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, CreateInput{Name: "Tea", Barcode: "1", CategoryID: uuid.New(), Price: 10, Stock: 1, UnitID: uuid.New()}, &ImageUpload{Filename: "photo.png", Data: validPNG(t)})
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
	return UpdateInput{Name: "Tea", Barcode: "1", CategoryID: uuid.MustParse("11111111-1111-1111-1111-111111111111"), Price: 10, UnitID: uuid.MustParse("22222222-2222-2222-2222-222222222222"), Active: true}
}

type fakeRunner struct{ err error }

func (f fakeRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	if f.err != nil {
		return f.err
	}
	return fn(nil)
}

type fakeRepository struct {
	create                   CreateInput
	err                      error
	listRows                 []Product
	listFilter               ListFilter
	update                   UpdateInput
	updateResult             UpdateResult
	current                  Product
	activeCategory           bool
	activeUnit               bool
	categoryActiveConfigured bool
	unitActiveConfigured     bool
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
	return Product{ID: uuid.New(), Name: input.Name, Barcode: input.Barcode, CategoryID: input.CategoryID, Category: "Minuman", Price: input.Price, Stock: input.Stock, UnitID: input.UnitID, Unit: "botol", Active: true}, nil
}
func (f *fakeRepository) Update(_ context.Context, _ database.Tx, _ string, _ uuid.UUID, input UpdateInput) (UpdateResult, error) {
	f.update = input
	if f.err != nil {
		return UpdateResult{}, f.err
	}
	if f.updateResult.Product.ID == uuid.Nil {
		f.updateResult.Product = Product{ID: uuid.New(), Name: input.Name, Barcode: input.Barcode, CategoryID: input.CategoryID, Category: "Minuman", Price: input.Price, UnitID: input.UnitID, Unit: "botol", Active: input.Active}
	}
	return f.updateResult, nil
}
func (f *fakeRepository) Get(_ context.Context, _ database.Tx, _ string, _ uuid.UUID) (Product, error) {
	return f.current, nil
}
func (f *fakeRepository) CategoryIsActive(_ context.Context, _ database.Tx, _ string, _ uuid.UUID) (bool, error) {
	if !f.categoryActiveConfigured {
		return true, nil
	}
	return f.activeCategory, nil
}
func (f *fakeRepository) UnitIsActive(_ context.Context, _ database.Tx, _ string, _ uuid.UUID) (bool, error) {
	if !f.unitActiveConfigured {
		return true, nil
	}
	return f.activeUnit, nil
}

type fakeImageStore struct {
	put       objectstore.StoredObject
	putErr    error
	get       objectstore.Object
	getErr    error
	deleted   []string
	deleteErr error
}

func (f *fakeImageStore) Put(context.Context, objectstore.PutInput) (objectstore.StoredObject, error) {
	return f.put, f.putErr
}

func (f *fakeImageStore) Get(context.Context, string) (objectstore.Object, error) {
	if f.get.Body == nil {
		f.get.Body = io.NopCloser(bytes.NewReader(nil))
	}
	return f.get, f.getErr
}

func (f *fakeImageStore) Delete(_ context.Context, key string) error {
	f.deleted = append(f.deleted, key)
	return f.deleteErr
}
func (f *fakeRepository) Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error) {
	return Product{}, nil
}

func (f *fakeRepository) ListVariants(_ context.Context, _ database.Tx, _ string, _ uuid.UUID) ([]Variant, error) {
	return nil, nil
}

func (f *fakeRepository) GetVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID) (Variant, error) {
	return Variant{}, nil
}

func (f *fakeRepository) CreateVariant(context.Context, database.Tx, string, uuid.UUID, VariantInput) (Variant, error) {
	return Variant{}, nil
}

func (f *fakeRepository) UpdateVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID, VariantInput) (Variant, error) {
	return Variant{}, nil
}

func (f *fakeRepository) DeleteVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID) error {
	return nil
}

func (f *fakeRepository) CountActiveVariants(context.Context, database.Tx, string, uuid.UUID) (int, error) {
	return 1, nil
}

func (f *fakeRepository) VariantSoldHistory(context.Context, database.Tx, string, uuid.UUID) (bool, error) {
	return false, nil
}

func TestValidateVariantAttributes(t *testing.T) {
	t.Parallel()

	config := []AttributeConfig{{Name: "Ukuran", Options: []string{"S", "M", "L"}}}
	cases := []struct {
		name    string
		attrs   map[string]string
		wantErr bool
	}{
		{"valid", map[string]string{"Ukuran": "M"}, false},
		{"missing key", map[string]string{}, true},
		{"unknown option", map[string]string{"Ukuran": "XL"}, true},
		{"extra key", map[string]string{"Ukuran": "M", "Sugar": "Normal"}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateVariantAttributes(tc.attrs, config)
			if (err != nil) != tc.wantErr {
				t.Fatalf("got err=%v, wantErr=%v", err, tc.wantErr)
			}
		})
	}
}
