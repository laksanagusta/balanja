package category

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/database"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type handlerVerifier struct{}

func (handlerVerifier) Verify(context.Context, string) (auth.Identity, error) {
	return auth.Identity{OrgID: "org", UserID: "user"}, nil
}

type handlerService struct {
	createErr error
}

func (*handlerService) List(context.Context, database.Identity, bool) ([]Category, error) {
	return []Category{}, nil
}

func (s *handlerService) Create(context.Context, database.Identity, WriteInput) (Category, error) {
	if s.createErr != nil {
		return Category{}, s.createErr
	}
	return Category{ID: uuid.New(), Name: "Minuman", Active: true, CreatedAt: time.Now(), UpdatedAt: time.Now()}, nil
}

func (*handlerService) Rename(context.Context, database.Identity, uuid.UUID, WriteInput) (Category, error) {
	return Category{}, nil
}

func (*handlerService) Archive(context.Context, database.Identity, uuid.UUID) (Category, error) {
	return Category{}, nil
}

func (*handlerService) Restore(context.Context, database.Identity, uuid.UUID) (Category, error) {
	return Category{}, nil
}

func TestArchivedConflictIncludesRecordID(t *testing.T) {
	id := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	app := categoryHandlerApp(&handlerService{createErr: &ArchivedNameConflict{ID: id}})

	response, err := app.Test(jsonRequest(http.MethodPost, "/categories", `{"name":"Minuman"}`))
	if err != nil {
		t.Fatal(err)
	}
	var envelope struct {
		Error struct {
			Code    string            `json:"code"`
			Details map[string]string `json:"details"`
		} `json:"error"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 409 || envelope.Error.Code != "CATEGORY_ARCHIVED_NAME_CONFLICT" || envelope.Error.Details["id"] != id.String() {
		t.Fatalf("status=%d envelope=%#v", response.StatusCode, envelope)
	}
}

func categoryHandlerApp(service *handlerService) *fiber.App {
	app := fiber.New()
	app.Use(auth.Middleware(handlerVerifier{}))
	NewHandler((*Service)(nil)).Register(app)
	app = fiber.New()
	app.Use(auth.Middleware(handlerVerifier{}))
	handler := &Handler{service: &Service{}}
	_ = handler
	return categoryHandlerAppWithService(service)
}

func categoryHandlerAppWithService(service interface {
	List(context.Context, database.Identity, bool) ([]Category, error)
	Create(context.Context, database.Identity, WriteInput) (Category, error)
	Rename(context.Context, database.Identity, uuid.UUID, WriteInput) (Category, error)
	Archive(context.Context, database.Identity, uuid.UUID) (Category, error)
	Restore(context.Context, database.Identity, uuid.UUID) (Category, error)
}) *fiber.App {
	app := fiber.New()
	app.Use(auth.Middleware(handlerVerifier{}))
	handler := &testHandlerAdapter{service: service}
	handler.Register(app)
	return app
}

type testHandlerAdapter struct {
	service interface {
		List(context.Context, database.Identity, bool) ([]Category, error)
		Create(context.Context, database.Identity, WriteInput) (Category, error)
		Rename(context.Context, database.Identity, uuid.UUID, WriteInput) (Category, error)
		Archive(context.Context, database.Identity, uuid.UUID) (Category, error)
		Restore(context.Context, database.Identity, uuid.UUID) (Category, error)
	}
}

func (h *testHandlerAdapter) Register(group fiber.Router) {
	group.Post("/categories", func(c fiber.Ctx) error {
		id, err := identity(c)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": fiber.Map{"code": "AUTH_REQUIRED"}})
		}
		input, err := decode[WriteInput](c)
		if err != nil {
			return err
		}
		item, err := h.service.Create(c.Context(), id, input)
		if err != nil {
			return categoryError(c, err)
		}
		return c.Status(http.StatusCreated).JSON(fiber.Map{"data": item})
	})
}

func jsonRequest(method, path, body string) *http.Request {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Authorization", "Bearer test")
	request.Header.Set("Content-Type", "application/json")
	return request
}
