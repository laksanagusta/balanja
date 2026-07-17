package unit

import (
	"context"
	"errors"
	"time"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

type Unit struct {
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
	ErrInvalidName  = errors.New("invalid unit name")
	ErrNameConflict = errors.New("unit name conflict")
	ErrNotFound     = errors.New("unit not found")
)

type ArchivedNameConflict struct{ ID uuid.UUID }

func (e *ArchivedNameConflict) Error() string { return "archived unit name conflict" }

type TenantRunner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	List(context.Context, database.Tx, string, bool) ([]Unit, error)
	Create(context.Context, database.Tx, string, WriteInput) (Unit, error)
	Rename(context.Context, database.Tx, string, uuid.UUID, WriteInput) (Unit, error)
	SetActive(context.Context, database.Tx, string, uuid.UUID, bool) (Unit, error)
}

var defaultUnitNames = []string{"botol", "karton", "karung", "kg", "pack", "pcs", "renteng"}
