package entitlement

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"balanja/backend/internal/auth"
	"github.com/gofiber/fiber/v3"
)

func TestHandlerReturnsEntitlementSummary(t *testing.T) {
	limit := int64(50)
	repository := &fakeRepository{record: Record{
		Status: StatusTrial, TransactionLimit: &limit,
		TransactionsUsed: 12, SupportReference: "ABC123",
	}}
	app := entitlementTestApp(repository)

	request := httptest.NewRequest(http.MethodGet, "/api/v1/entitlement", nil)
	request.Header.Set("Authorization", "Bearer token")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	var envelope struct {
		Data Summary `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK || envelope.Data.Remaining != 38 {
		t.Fatalf("status=%d data=%#v", response.StatusCode, envelope.Data)
	}
}

func TestHandlerRejectsServerOwnedMilestoneEvent(t *testing.T) {
	app := entitlementTestApp(&fakeRepository{})
	request := httptest.NewRequest(http.MethodPost, "/api/v1/entitlement/events", strings.NewReader(`{"name":"transaction_50"}`))
	request.Header.Set("Authorization", "Bearer token")
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d", response.StatusCode)
	}
}

func entitlementTestApp(repository Repository) *fiber.App {
	service := NewService(fakeRunner{}, repository)
	handler := NewHandler(service)
	app := fiber.New()
	app.Use(auth.Middleware(entitlementVerifier{}))
	api := app.Group("/api/v1")
	handler.Register(api)
	return app
}

type entitlementVerifier struct{}

func (entitlementVerifier) Verify(context.Context, string) (auth.Identity, error) {
	return auth.Identity{OrgID: "org", UserID: "user"}, nil
}
