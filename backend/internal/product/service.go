package product

import (
	"context"
	"errors"
	"strings"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

var (
	ErrInvalidProduct  = errors.New("invalid product")
	ErrBarcodeConflict = errors.New("barcode conflict")
	ErrNotFound        = errors.New("product not found")
)

type TenantRunner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}
type Repository interface {
	List(context.Context, database.Tx, string) ([]Product, error)
	Create(context.Context, database.Tx, string, CreateInput) (Product, error)
	Update(context.Context, database.Tx, string, uuid.UUID, UpdateInput) (Product, error)
	Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error)
}
type Service struct {
	runner     TenantRunner
	repository Repository
}

func NewService(runner TenantRunner, repository Repository) *Service {
	return &Service{runner: runner, repository: repository}
}

func (s *Service) List(ctx context.Context, identity database.Identity) (products []Product, err error) {
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var queryErr error
		products, queryErr = s.repository.List(ctx, tx, identity.OrgID)
		return queryErr
	})
	return
}
func (s *Service) Create(ctx context.Context, identity database.Identity, input CreateInput) (created Product, err error) {
	input.Name, input.Barcode, input.Category, input.Unit, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Category), strings.TrimSpace(input.Unit), strings.TrimSpace(input.Image)
	if input.Name == "" || input.Barcode == "" || input.Category == "" || input.Unit == "" || input.Price < 1 || input.Stock < 0 {
		return Product{}, ErrInvalidProduct
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var createErr error
		created, createErr = s.repository.Create(ctx, tx, identity.OrgID, input)
		return createErr
	})
	return
}
func (s *Service) Update(ctx context.Context, identity database.Identity, id uuid.UUID, input UpdateInput) (updated Product, err error) {
	input.Name, input.Barcode, input.Category, input.Unit, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Category), strings.TrimSpace(input.Unit), strings.TrimSpace(input.Image)
	if input.Name == "" || input.Barcode == "" || input.Category == "" || input.Unit == "" || input.Price < 1 {
		return Product{}, ErrInvalidProduct
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var updateErr error
		updated, updateErr = s.repository.Update(ctx, tx, identity.OrgID, id, input)
		return updateErr
	})
	return
}
func (s *Service) Deactivate(ctx context.Context, identity database.Identity, id uuid.UUID) (updated Product, err error) {
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var updateErr error
		updated, updateErr = s.repository.Deactivate(ctx, tx, identity.OrgID, id)
		return updateErr
	})
	return
}
