package report

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/database"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

type fakeHandlerService struct {
	report Report
}

func (s *fakeHandlerService) Prepare(input FilterInput, now time.Time) (Query, error) {
	return NormalizeFilter(input, now)
}
func (s *fakeHandlerService) Report(context.Context, database.Identity, FilterInput, time.Time) (Report, error) {
	return s.report, nil
}
func (s *fakeHandlerService) ExportDaily(_ context.Context, _ database.Identity, _ FilterInput, _ time.Time, w io.Writer) error {
	_, err := io.WriteString(w, "\ufeffdaily")
	return err
}
func (s *fakeHandlerService) ExportTransactions(_ context.Context, _ database.Identity, _ FilterInput, _ time.Time, w io.Writer) error {
	_, err := io.WriteString(w, "\ufeffdetail")
	return err
}

type handlerVerifier struct{}

func (handlerVerifier) Verify(context.Context, string) (auth.Identity, error) {
	return auth.Identity{OrgID: "org-1", UserID: "user-1"}, nil
}

func TestHandlerRequiresIdentity(t *testing.T) {
	app := fiber.New()
	NewHandler(&fakeHandlerService{}).Register(app)
	response, err := app.Test(httptest.NewRequest(http.MethodGet, "/reports/sales?dateFrom=2026-07-01&dateTo=2026-07-17", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d", response.StatusCode)
	}
}

func TestHandlerReturnsJSONAndValidationErrors(t *testing.T) {
	now := time.Date(2026, 7, 17, 9, 0, 0, 0, WIBLocation())
	app := fiber.New()
	app.Use(auth.Middleware(handlerVerifier{}))
	handler := NewHandler(&fakeHandlerService{report: Report{Metrics: Metrics{TotalReceived: 11000}}})
	handler.now = func() time.Time { return now }
	handler.Register(app)

	request := httptest.NewRequest(http.MethodGet, "/reports/sales?dateFrom=2026-07-01&dateTo=2026-07-17", nil).WithContext(context.Background())
	request.Header.Set("Authorization", "Bearer test")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d", response.StatusCode)
	}
	badRequest := httptest.NewRequest(http.MethodGet, "/reports/sales?dateFrom=bad&dateTo=2026-07-17", nil).WithContext(context.Background())
	badRequest.Header.Set("Authorization", "Bearer test")
	bad, err := app.Test(badRequest)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(bad.Body)
	if bad.StatusCode != http.StatusUnprocessableEntity || !strings.Contains(string(body), "INVALID_REPORT_FILTER") {
		t.Fatalf("status=%d body=%s", bad.StatusCode, body)
	}
}

func TestHandlerStreamsCSVWithFilename(t *testing.T) {
	now := time.Date(2026, 7, 17, 9, 0, 0, 0, WIBLocation())
	app := fiber.New()
	app.Use(auth.Middleware(handlerVerifier{}))
	handler := NewHandler(&fakeHandlerService{})
	handler.now = func() time.Time { return now }
	handler.Register(app)

	request := httptest.NewRequest(http.MethodGet, "/reports/sales/export?dateFrom=2026-07-01&dateTo=2026-07-17&kind=daily", nil)
	request.Header.Set("Authorization", "Bearer test")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if got := response.Header.Get("Content-Disposition"); got != "attachment; filename=\"laporan-penjualan-harian-2026-07-01_2026-07-17.csv\"" {
		t.Fatalf("disposition=%q", got)
	}
	body, _ := io.ReadAll(response.Body)
	if response.StatusCode != http.StatusOK || !strings.HasPrefix(string(body), "\ufeff") {
		t.Fatalf("status=%d body=%q", response.StatusCode, body)
	}

	badRequest := httptest.NewRequest(http.MethodGet, "/reports/sales/export?dateFrom=2026-07-01&dateTo=2026-07-17&kind=pdf", nil)
	badRequest.Header.Set("Authorization", "Bearer test")
	bad, err := app.Test(badRequest)
	if err != nil {
		t.Fatal(err)
	}
	if bad.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("unsupported kind status=%d", bad.StatusCode)
	}
}
