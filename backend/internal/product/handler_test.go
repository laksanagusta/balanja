package product

import (
	"bytes"
	"context"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"balanja/backend/internal/auth"
	"github.com/gofiber/fiber/v3"
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

func productHandlerApp(service *Service) *fiber.App {
	app := fiber.New()
	app.Use(auth.Middleware(productHandlerVerifier{}))
	NewHandler(service).Register(app)
	return app
}

func productMultipartRequest(t *testing.T, method, path string, image []byte, remove bool) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	fields := map[string]string{"name": "Tea", "barcode": "1", "category": "Drink", "price": "10", "stock": "1", "unit": "pcs", "active": "true"}
	if remove {
		fields["remove_image"] = "true"
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
