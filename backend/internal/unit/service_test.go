package unit

import (
	"context"
	"testing"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

func TestDefaultUnitsAreStableAndAlphabetical(t *testing.T) {
	t.Parallel()

	want := []string{"botol", "karton", "karung", "kg", "pack", "pcs", "renteng"}
	if len(defaultUnitNames) != len(want) {
		t.Fatalf("defaultUnitNames length = %d", len(defaultUnitNames))
	}
	for index := range want {
		if defaultUnitNames[index] != want[index] {
			t.Fatalf("defaultUnitNames[%d] = %q, want %q", index, defaultUnitNames[index], want[index])
		}
	}
}

func TestRenameTrimsUnitName(t *testing.T) {
	t.Parallel()

	repository := &fakeRepository{}
	service := NewService(fakeRunner{}, repository)
	_, err := service.Rename(context.Background(), database.Identity{OrgID: "org_a", UserID: "user_a"}, uuid.New(), WriteInput{Name: "  kg  "})
	if err != nil {
		t.Fatal(err)
	}
	if repository.input.Name != "kg" {
		t.Fatalf("name = %q", repository.input.Name)
	}
}

type fakeRunner struct{}

func (fakeRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeRepository struct {
	input WriteInput
}

func (*fakeRepository) List(context.Context, database.Tx, string, bool) ([]Unit, error) {
	return nil, nil
}

func (*fakeRepository) Create(context.Context, database.Tx, string, WriteInput) (Unit, error) {
	return Unit{ID: uuid.New(), Name: "pcs", Active: true}, nil
}

func (f *fakeRepository) Rename(_ context.Context, _ database.Tx, _ string, _ uuid.UUID, input WriteInput) (Unit, error) {
	f.input = input
	return Unit{ID: uuid.New(), Name: input.Name, Active: true}, nil
}

func (*fakeRepository) SetActive(context.Context, database.Tx, string, uuid.UUID, bool) (Unit, error) {
	return Unit{ID: uuid.New(), Name: "pcs", Active: true}, nil
}
