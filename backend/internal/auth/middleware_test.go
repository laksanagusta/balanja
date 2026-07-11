package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestMiddlewareRejectsInvalidAuthentication(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		header   string
		verifier Verifier
		status   int
		code     string
	}{
		{name: "missing header", verifier: fakeVerifier{}, status: 401, code: "AUTH_REQUIRED"},
		{name: "wrong scheme", header: "Basic abc", verifier: fakeVerifier{}, status: 401, code: "AUTH_INVALID"},
		{name: "invalid token", header: "Bearer bad", verifier: fakeVerifier{err: errors.New("bad signature")}, status: 401, code: "AUTH_INVALID"},
		{name: "missing organization", header: "Bearer valid", verifier: fakeVerifier{identity: Identity{UserID: "user_1"}}, status: 403, code: "ORGANIZATION_REQUIRED"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			app := fiber.New()
			app.Use(Middleware(tt.verifier))
			app.Get("/protected", func(c fiber.Ctx) error { return c.SendStatus(204) })

			request := httptest.NewRequest(http.MethodGet, "/protected", nil)
			if tt.header != "" {
				request.Header.Set("Authorization", tt.header)
			}
			response, err := app.Test(request)
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

func TestMiddlewareStoresVerifiedIdentity(t *testing.T) {
	t.Parallel()

	want := Identity{UserID: "user_1", OrgID: "org_1"}
	app := fiber.New()
	app.Use(Middleware(fakeVerifier{identity: want}))
	app.Get("/protected", func(c fiber.Ctx) error {
		got, ok := FromContext(c)
		if !ok || got != want {
			return errors.New("identity missing from context")
		}
		return c.SendStatus(204)
	})

	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Authorization", "Bearer valid")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("Test() error = %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != 204 {
		t.Fatalf("status = %d, want 204", response.StatusCode)
	}
}

type fakeVerifier struct {
	identity Identity
	err      error
}

func (f fakeVerifier) Verify(context.Context, string) (Identity, error) {
	return f.identity, f.err
}
