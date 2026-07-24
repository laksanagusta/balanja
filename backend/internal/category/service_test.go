package category

import (
	"context"
	"errors"
	"testing"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

func TestCreateNormalizesAndRejectsArchivedConflict(t *testing.T) {
	t.Parallel()

	conflictID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	repository := &fakeRepository{createErr: &ArchivedNameConflict{ID: conflictID}}
	service := NewService(fakeRunner{}, repository)

	_, err := service.Create(context.Background(), database.Identity{OrgID: "org_a", UserID: "user_a"}, WriteInput{Name: "  Minuman  "})
	var conflict *ArchivedNameConflict
	if !errors.As(err, &conflict) || conflict.ID != conflictID {
		t.Fatalf("Create() error = %#v", err)
	}
	if repository.input.Name != "Minuman" {
		t.Fatalf("normalized name = %q", repository.input.Name)
	}
}

func TestArchiveAndRestoreAreIdempotent(t *testing.T) {
	t.Parallel()

	service := NewService(fakeRunner{}, &fakeRepository{})
	id := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	if _, err := service.Archive(context.Background(), database.Identity{OrgID: "org_a", UserID: "user_a"}, id); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Restore(context.Background(), database.Identity{OrgID: "org_a", UserID: "user_a"}, id); err != nil {
		t.Fatal(err)
	}
}

type fakeRunner struct{}

func (fakeRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeRepository struct {
	input     WriteInput
	createErr error
	renameErr error
	setActive []bool
}

func (*fakeRepository) List(context.Context, database.Tx, string, bool) ([]Category, error) {
	return nil, nil
}

func (f *fakeRepository) Create(_ context.Context, _ database.Tx, _ string, input WriteInput) (Category, error) {
	f.input = input
	if f.createErr != nil {
		return Category{}, f.createErr
	}
	return Category{ID: uuid.New(), Name: input.Name, Active: true}, nil
}

func (f *fakeRepository) Rename(_ context.Context, _ database.Tx, _ string, _ uuid.UUID, input WriteInput) (Category, error) {
	f.input = input
	if f.renameErr != nil {
		return Category{}, f.renameErr
	}
	return Category{ID: uuid.New(), Name: input.Name, Active: true}, nil
}

func (f *fakeRepository) SetActive(_ context.Context, _ database.Tx, _ string, _ uuid.UUID, active bool) (Category, error) {
	f.setActive = append(f.setActive, active)
	return Category{ID: uuid.New(), Name: "Minuman", Active: active}, nil
}
