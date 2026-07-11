package httpserver

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
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
