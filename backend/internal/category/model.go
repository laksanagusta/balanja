package category

import (
	"context"
	"errors"
	"time"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

type Category struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type WriteInput struct {
	Name string `json:"name"`
}

var (
	ErrInvalidName  = errors.New("invalid category name")
	ErrNameConflict = errors.New("category name conflict")
	ErrNotFound     = errors.New("category not found")
)

type ArchivedNameConflict struct{ ID uuid.UUID }

func (e *ArchivedNameConflict) Error() string { return "archived category name conflict" }

type TenantRunner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	List(context.Context, database.Tx, string, bool) ([]Category, error)
	Create(context.Context, database.Tx, string, WriteInput) (Category, error)
	Rename(context.Context, database.Tx, string, uuid.UUID, WriteInput) (Category, error)
	SetActive(context.Context, database.Tx, string, uuid.UUID, bool) (Category, error)
}

var defaultCategoryNames = []string{"Minuman", "Perawatan", "Rumah Tangga", "Sembako", "Snack"}
