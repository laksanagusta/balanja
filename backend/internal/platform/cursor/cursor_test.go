package cursor

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
)

func TestEncodeDecode(t *testing.T) {
	t.Parallel()

	value, err := json.Marshal("Teh")
	if err != nil {
		t.Fatal(err)
	}
	want := Payload{
		Version:     CurrentVersion,
		Sort:        "name",
		Direction:   "asc",
		Fingerprint: Fingerprint("products", "q=", "limit=20"),
		Value:       value,
		ID:          uuid.New(),
	}
	raw, err := Encode(want)
	if err != nil {
		t.Fatal(err)
	}
	got, err := Decode(raw)
	if err != nil {
		t.Fatal(err)
	}
	if got.Sort != want.Sort || got.Direction != want.Direction || got.Fingerprint != want.Fingerprint || got.ID != want.ID || string(got.Value) != string(want.Value) {
		t.Fatalf("decoded payload = %#v, want %#v", got, want)
	}
}

func TestDecodeRejectsInvalidPayload(t *testing.T) {
	t.Parallel()

	for _, raw := range []string{"not-base64", "e30"} {
		if _, err := Decode(raw); !errors.Is(err, ErrInvalid) {
			t.Fatalf("Decode(%q) error = %v, want ErrInvalid", raw, err)
		}
	}
}

func TestCompatibleRejectsDifferentQuery(t *testing.T) {
	t.Parallel()

	payload := Payload{
		Version:     CurrentVersion,
		Sort:        "name",
		Direction:   "asc",
		Fingerprint: "one",
		Value:       json.RawMessage(`"Tea"`),
		ID:          uuid.New(),
	}
	if err := Compatible(payload, "name", "asc", "two"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("Compatible() error = %v, want ErrInvalid", err)
	}
}
