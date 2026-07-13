package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadEnvFile(t *testing.T) {
	unsetEnvForTest(t, "DATABASE_URL")
	unsetEnvForTest(t, "CLERK_AUDIENCE")
	unsetEnvForTest(t, "ALLOWED_ORIGINS")
	t.Setenv("EXISTING", "keep")

	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	content := []byte(`
# comment
DATABASE_URL=postgres://runtime
CLERK_AUDIENCE="balanja"
export ALLOWED_ORIGINS=http://localhost:5173
EXISTING=replace
`)
	if err := os.WriteFile(path, content, 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	if err := LoadEnvFile(path); err != nil {
		t.Fatalf("load env file: %v", err)
	}

	if got := os.Getenv("DATABASE_URL"); got != "postgres://runtime" {
		t.Fatalf("DATABASE_URL = %q", got)
	}
	if got := os.Getenv("CLERK_AUDIENCE"); got != "balanja" {
		t.Fatalf("CLERK_AUDIENCE = %q", got)
	}
	if got := os.Getenv("ALLOWED_ORIGINS"); got != "http://localhost:5173" {
		t.Fatalf("ALLOWED_ORIGINS = %q", got)
	}
	if got := os.Getenv("EXISTING"); got != "keep" {
		t.Fatalf("EXISTING = %q", got)
	}
}

func TestLoadEnvFileRejectsInvalidLines(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("DATABASE_URL\n"), 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	if err := LoadEnvFile(path); err == nil {
		t.Fatal("expected invalid env line error")
	}
}

func unsetEnvForTest(t *testing.T, key string) {
	t.Helper()

	value, existed := os.LookupEnv(key)
	if err := os.Unsetenv(key); err != nil {
		t.Fatalf("unset %s: %v", key, err)
	}
	t.Cleanup(func() {
		var err error
		if existed {
			err = os.Setenv(key, value)
		} else {
			err = os.Unsetenv(key)
		}
		if err != nil {
			t.Fatalf("restore %s: %v", key, err)
		}
	})
}
