package checkout

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestCheckoutErrorMapsTransactionLimit(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c fiber.Ctx) error {
		return checkoutError(c, ErrTransactionLimitReached)
	})
	response, err := app.Test(httptest.NewRequest(http.MethodGet, "/", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	var envelope struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusPaymentRequired || envelope.Error.Code != "PLAN_TRANSACTION_LIMIT_REACHED" {
		t.Fatalf("status=%d code=%q", response.StatusCode, envelope.Error.Code)
	}
}
