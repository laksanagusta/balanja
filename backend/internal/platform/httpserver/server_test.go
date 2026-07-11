package httpserver

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestHealth(t *testing.T) {
	t.Parallel()

	app := New(Dependencies{Ready: func(context.Context) error { return nil }})
	response, err := app.Test(httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if err != nil {
		t.Fatalf("Test() error = %v", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
}

func TestProtectedRoutesAreRegistered(t *testing.T) {
	t.Parallel()

	app := New(Dependencies{
		Auth: func(c fiber.Ctx) error { return c.Next() },
		Routes: func(router fiber.Router) {
			router.Get("/probe", func(c fiber.Ctx) error { return c.SendStatus(http.StatusNoContent) })
		},
	})
	response, err := app.Test(httptest.NewRequest(http.MethodGet, "/api/v1/probe", nil))
	if err != nil {
		t.Fatalf("Test() error = %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusNoContent)
	}
}

func TestReadiness(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		ready  func(context.Context) error
		status int
	}{
		{name: "ready", ready: func(context.Context) error { return nil }, status: http.StatusOK},
		{name: "not ready", ready: func(context.Context) error { return errors.New("database unavailable") }, status: http.StatusServiceUnavailable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			app := New(Dependencies{Ready: tt.ready})
			response, err := app.Test(httptest.NewRequest(http.MethodGet, "/readyz", nil))
			if err != nil {
				t.Fatalf("Test() error = %v", err)
			}
			defer response.Body.Close()
			if response.StatusCode != tt.status {
				t.Fatalf("status = %d, want %d", response.StatusCode, tt.status)
			}
		})
	}
}
