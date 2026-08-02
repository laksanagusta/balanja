package product

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/objectstore"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type productHandlerVerifier struct{}

func (productHandlerVerifier) Verify(context.Context, string) (auth.Identity, error) {
	return auth.Identity{OrgID: "org", UserID: "user"}, nil
}

func TestMultipartUpdatePreservesImageWithoutPhotoFields(t *testing.T) {
	repository := &fakeRepository{updateResult: UpdateResult{Product: Product{}}}
	app := productHandlerApp(NewService(fakeRunner{}, repository))
	response, err := app.Test(productMultipartRequest(t, http.MethodPut, "/products/"+uuidString(t), nil, false))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK || !repository.update.PreserveImage {
		t.Fatalf("status=%d update=%#v", response.StatusCode, repository.update)
	}
}

func TestMultipartUpdateRejectsUploadAndRemoveTogether(t *testing.T) {
	app := productHandlerApp(NewService(fakeRunner{}, &fakeRepository{}, WithImageStore(&fakeImageStore{})))
	response, err := app.Test(productMultipartRequest(t, http.MethodPut, "/products/"+uuidString(t), validPNG(t), true))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d", response.StatusCode)
	}
}

func TestMultipartUpdateReportsStorageFailure(t *testing.T) {
	images := &fakeImageStore{putErr: errors.New("R2 unavailable")}
	app := productHandlerApp(NewService(fakeRunner{}, &fakeRepository{}, WithImageStore(images)))
	response, err := app.Test(productMultipartRequest(t, http.MethodPut, "/products/"+uuidString(t), validPNG(t), false))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status=%d", response.StatusCode)
	}
}

func TestMultipartUpdateCarriesAttributesConfig(t *testing.T) {
	repository := &fakeRepository{updateResult: UpdateResult{Product: Product{}}}
	app := productHandlerApp(NewService(fakeRunner{}, repository))
	response, err := app.Test(productMultipartRequest(t, http.MethodPut, "/products/"+uuidString(t), nil, false,
		map[string]string{
			"attributesConfig": `[{"name":"Berat","options":["M","L"]}]`,
			"variants":         `[{"attributes":{"Berat":"M"},"price":10,"stock":1,"active":true},{"attributes":{"Berat":"L"},"price":12,"stock":1,"active":true}]`,
		}))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d", response.StatusCode)
	}
	config := repository.update.AttributesConfig
	if len(config) != 1 || config[0].Name != "Berat" || len(config[0].Options) != 2 || config[0].Options[1] != "L" {
		t.Fatalf("attributesConfig=%#v", config)
	}
}

func TestMultipartUpdateCarriesVariantsForAtomicSave(t *testing.T) {
	variantID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	repository := &fakeRepository{
		updateResult: UpdateResult{Product: Product{}},
		variants:     []Variant{{ID: variantID, Attributes: map[string]string{"Berat": "M"}, Price: 10, Stock: 2, Barcode: "M", Active: true}},
	}
	app := productHandlerApp(NewService(fakeRunner{}, repository))
	response, err := app.Test(productMultipartRequest(t, http.MethodPut, "/products/"+uuidString(t), nil, false,
		map[string]string{
			"attributesConfig": `[{"name":"Berat","options":["M"]}]`,
			"variants":         `[{"id":"33333333-3333-3333-3333-333333333333","attributes":{"Berat":"M"},"price":10,"stock":2,"barcode":"M","active":true}]`,
		}))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d", response.StatusCode)
	}
	variants := repository.update.Variants
	if len(variants) != 1 || variants[0].ID.String() != "33333333-3333-3333-3333-333333333333" || variants[0].Attributes["Berat"] != "M" {
		t.Fatalf("variants=%#v", variants)
	}
}

func TestMultipartUpdateRejectsMalformedAttributesConfig(t *testing.T) {
	app := productHandlerApp(NewService(fakeRunner{}, &fakeRepository{}))
	response, err := app.Test(productMultipartRequest(t, http.MethodPut, "/products/"+uuidString(t), nil, false,
		map[string]string{"attributesConfig": "not-json"}))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d", response.StatusCode)
	}
}

func TestProductImageRouteStreamsOwnedImageWithImmutableCaching(t *testing.T) {
	images := &fakeImageStore{get: objectstore.Object{
		Body:          io.NopCloser(bytes.NewReader([]byte("image"))),
		ContentType:   "image/jpeg",
		ContentLength: 5,
		ETag:          `"etag"`,
	}}
	app := fiber.New()
	NewHandler(NewService(fakeRunner{}, &fakeRepository{}, WithImageStore(images))).RegisterPublic(app)

	response, err := app.Test(httptest.NewRequest(
		http.MethodGet,
		"/api/v1/product-images/products/org/11111111-1111-1111-1111-111111111111.jpg",
		nil,
	))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK || string(body) != "image" {
		t.Fatalf("status=%d body=%q", response.StatusCode, body)
	}
	if response.Header.Get("Content-Type") != "image/jpeg" ||
		response.Header.Get("Cache-Control") != "public, max-age=31536000, immutable" ||
		response.Header.Get("ETag") != `"etag"` {
		t.Fatalf("headers=%v", response.Header)
	}
}

func TestProductImageRouteRejectsKeysOutsideProductNamespace(t *testing.T) {
	app := fiber.New()
	NewHandler(NewService(fakeRunner{}, &fakeRepository{}, WithImageStore(&fakeImageStore{}))).RegisterPublic(app)

	response, err := app.Test(httptest.NewRequest(http.MethodGet, "/api/v1/product-images/private/secret.jpg", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("status=%d", response.StatusCode)
	}
}

func productHandlerApp(service *Service) *fiber.App {
	app := fiber.New()
	app.Use(auth.Middleware(productHandlerVerifier{}))
	NewHandler(service).Register(app)
	return app
}

func productMultipartRequest(t *testing.T, method, path string, image []byte, remove bool, extraFields ...map[string]string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	fields := map[string]string{"name": "Tea", "barcode": "1", "categoryId": "11111111-1111-1111-1111-111111111111", "price": "10", "stock": "1", "unitId": "22222222-2222-2222-2222-222222222222", "active": "true"}
	if remove {
		fields["remove_image"] = "true"
	}
	for _, extra := range extraFields {
		for key, value := range extra {
			fields[key] = value
		}
	}
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatal(err)
		}
	}
	if image != nil {
		part, err := writer.CreateFormFile("image_file", "photo.png")
		if err != nil {
			t.Fatal(err)
		}
		if _, err := part.Write(image); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(method, path, &body)
	request.Header.Set("Authorization", "Bearer test")
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}

func uuidString(t *testing.T) string { t.Helper(); return "11111111-1111-1111-1111-111111111111" }
