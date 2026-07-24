package category

import (
	"context"
	"strings"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

type Service struct {
	runner     TenantRunner
	repository Repository
}

func NewService(runner TenantRunner, repository Repository) *Service {
	return &Service{runner: runner, repository: repository}
}

func normalizeInput(input WriteInput) (WriteInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		return WriteInput{}, ErrInvalidName
	}
	return input, nil
}

func (s *Service) List(ctx context.Context, identity database.Identity, includeArchived bool) (items []Category, err error) {
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var queryErr error
		items, queryErr = s.repository.List(ctx, tx, identity.OrgID, includeArchived)
		return queryErr
	})
	return
}

func (s *Service) Create(ctx context.Context, identity database.Identity, input WriteInput) (value Category, err error) {
	input, err = normalizeInput(input)
	if err != nil {
		return Category{}, err
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var createErr error
		value, createErr = s.repository.Create(ctx, tx, identity.OrgID, input)
		return createErr
	})
	return
}

func (s *Service) Rename(ctx context.Context, identity database.Identity, id uuid.UUID, input WriteInput) (value Category, err error) {
	if id == uuid.Nil {
		return Category{}, ErrNotFound
	}
	input, err = normalizeInput(input)
	if err != nil {
		return Category{}, err
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var renameErr error
		value, renameErr = s.repository.Rename(ctx, tx, identity.OrgID, id, input)
		return renameErr
	})
	return
}

func (s *Service) Archive(ctx context.Context, identity database.Identity, id uuid.UUID) (value Category, err error) {
	if id == uuid.Nil {
		return Category{}, ErrNotFound
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var setErr error
		value, setErr = s.repository.SetActive(ctx, tx, identity.OrgID, id, false)
		return setErr
	})
	return
}

func (s *Service) Restore(ctx context.Context, identity database.Identity, id uuid.UUID) (value Category, err error) {
	if id == uuid.Nil {
		return Category{}, ErrNotFound
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var setErr error
		value, setErr = s.repository.SetActive(ctx, tx, identity.OrgID, id, true)
		return setErr
	})
	return
}
