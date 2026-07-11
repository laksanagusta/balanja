package transaction

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPaginationDefaultsAndCapsLimit(t *testing.T) {
	t.Parallel()
	if got := normalizeLimit(0); got != 50 {
		t.Fatalf("normalizeLimit(0)=%d, want 50", got)
	}
	if got := normalizeLimit(500); got != 100 {
		t.Fatalf("normalizeLimit(500)=%d, want 100", got)
	}
}

func TestCursorRoundTrip(t *testing.T) {
	t.Parallel()
	want := Cursor{CreatedAt: time.Date(2026, 7, 11, 8, 0, 0, 123, time.UTC), ID: uuid.New()}
	raw := encodeCursor(want)
	got, err := decodeCursor(raw)
	if err != nil {
		t.Fatalf("decodeCursor() error=%v", err)
	}
	if got != want {
		t.Fatalf("cursor=%#v, want %#v", got, want)
	}
	if _, err := decodeCursor("not-a-cursor"); err == nil {
		t.Fatal("decodeCursor() accepted malformed cursor")
	}
}
