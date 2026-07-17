package config

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestLoadRejectsMissingRequiredEnvironment(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		missing string
	}{
		{name: "database URL", missing: "DATABASE_URL"},
		{name: "Clerk issuer", missing: "CLERK_ISSUER_URL"},
		{name: "Clerk audience", missing: "CLERK_AUDIENCE"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			values := validEnvironment()
			delete(values, tt.missing)

			_, err := Load(mapGetter(values))
			if err == nil || !strings.Contains(err.Error(), tt.missing) {
				t.Fatalf("Load() error = %v, want error naming %s", err, tt.missing)
			}
		})
	}
}

func TestLoadUsesSafeDefaults(t *testing.T) {
	t.Parallel()

	got, err := Load(mapGetter(validEnvironment()))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if got.Port != "8080" {
		t.Errorf("Port = %q, want 8080", got.Port)
	}
	if got.DBMaxConns != 10 {
		t.Errorf("DBMaxConns = %d, want 10", got.DBMaxConns)
	}
	if got.ShutdownTimeout != 10*time.Second {
		t.Errorf("ShutdownTimeout = %s, want 10s", got.ShutdownTimeout)
	}
}

func TestLoadParsesOverrides(t *testing.T) {
	t.Parallel()

	values := validEnvironment()
	values["PORT"] = "9090"
	values["DB_MAX_CONNS"] = "7"
	values["SHUTDOWN_TIMEOUT"] = "4s"
	values["ALLOWED_ORIGINS"] = " https://pos.example.com, http://localhost:5173 "

	got, err := Load(mapGetter(values))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if got.Port != "9090" || got.DBMaxConns != 7 || got.ShutdownTimeout != 4*time.Second {
		t.Fatalf("Load() overrides = %#v", got)
	}
	if len(got.AllowedOrigins) != 2 || got.AllowedOrigins[0] != "https://pos.example.com" {
		t.Fatalf("AllowedOrigins = %#v", got.AllowedOrigins)
	}
}

func TestLoadR2Configuration(t *testing.T) {
	t.Parallel()

	values := validEnvironment()
	got, err := Load(mapGetter(values))
	if err != nil {
		t.Fatal(err)
	}
	if got.R2.Enabled {
		t.Fatalf("R2.Enabled = true, want false by default")
	}

	values["R2_ENABLED"] = "true"
	_, err = Load(mapGetter(values))
	if err == nil || !strings.Contains(err.Error(), "R2_ENDPOINT") {
		t.Fatalf("Load() error = %v, want missing R2_ENDPOINT", err)
	}
}

func TestLoadParsesEnabledR2Configuration(t *testing.T) {
	t.Parallel()

	values := validEnvironment()
	values["R2_ENABLED"] = "true"
	values["R2_ENDPOINT"] = " https://account.r2.cloudflarestorage.com "
	values["R2_ACCESS_KEY_ID"] = "access"
	values["R2_SECRET_ACCESS_KEY"] = "secret"
	values["R2_BUCKET"] = "products"
	values["R2_PUBLIC_BASE_URL"] = "https://images.example.com/"

	got, err := Load(mapGetter(values))
	if err != nil {
		t.Fatal(err)
	}
	if !got.R2.Enabled || got.R2.Endpoint != "https://account.r2.cloudflarestorage.com" || got.R2.PublicBaseURL != "https://images.example.com" {
		t.Fatalf("R2 = %#v", got.R2)
	}
}

func TestMainWiresR2IntoProducts(t *testing.T) {
	t.Parallel()

	source, err := os.ReadFile(filepath.Join("..", "..", "cmd", "api", "main.go"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(source, []byte("objectstore.NewR2")) || !bytes.Contains(source, []byte("product.WithImageStore")) {
		t.Fatal("main does not wire R2 into product service")
	}
}

func validEnvironment() map[string]string {
	return map[string]string{
		"DATABASE_URL":     "postgres://example",
		"CLERK_ISSUER_URL": "https://clerk.example.com",
		"CLERK_AUDIENCE":   "balanja",
	}
}

func mapGetter(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}
