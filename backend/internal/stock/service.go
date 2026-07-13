package stock

import (
	"balanja/backend/internal/platform/database"
	"context"
	"encoding/base64"
	"encoding/json"
	"strings"
)

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	Create(context.Context, database.Tx, database.Identity, CreateInput) (CreateResult, error)
	List(context.Context, database.Tx, database.Identity, ListFilter) ([]Movement, error)
}

type Service struct {
	runner     Runner
	repository Repository
}

func NewService(runner Runner, repository Repository) *Service {
	return &Service{runner: runner, repository: repository}
}

func normalizeLimit(limit int) int {
	if limit <= 0 {
		return 50
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func encodeCursor(cursor Cursor) string {
	value, _ := json.Marshal(cursor)
	return base64.RawURLEncoding.EncodeToString(value)
}

func decodeCursor(raw string) (Cursor, error) {
	var cursor Cursor
	value, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return cursor, ErrInvalidCursor
	}
	if err = json.Unmarshal(value, &cursor); err != nil || cursor.ID == [16]byte{} || cursor.CreatedAt.IsZero() {
		return Cursor{}, ErrInvalidCursor
	}
	return cursor, nil
}

func (s *Service) Create(ctx context.Context, identity database.Identity, input CreateInput) (created CreateResult, err error) {
	input.Reason = strings.TrimSpace(input.Reason)
	if input.ProductID == [16]byte{} || input.Reason == "" {
		return CreateResult{}, ErrInvalidStockMovement
	}
	if input.Type != MovementTypeRestock && input.Type != MovementTypeReduce && input.Type != MovementTypeSetExact {
		return CreateResult{}, ErrInvalidStockMovement
	}
	if input.Type != MovementTypeSetExact && input.Quantity <= 0 {
		return CreateResult{}, ErrInvalidStockMovement
	}
	if input.Type == MovementTypeSetExact && input.Quantity < 0 {
		return CreateResult{}, ErrInvalidStockMovement
	}

	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var createErr error
		created, createErr = s.repository.Create(ctx, tx, identity, input)
		return createErr
	})
	return
}

func (s *Service) List(ctx context.Context, identity database.Identity, filter ListFilter, rawCursor string) (page Page, err error) {
	filter.Limit = normalizeLimit(filter.Limit)
	filter.Query = strings.TrimSpace(filter.Query)
	if rawCursor != "" {
		cursor, decodeErr := decodeCursor(rawCursor)
		if decodeErr != nil {
			return Page{}, decodeErr
		}
		filter.Cursor = &cursor
	}

	var rows []Movement
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var listErr error
		rows, listErr = s.repository.List(ctx, tx, identity, filter)
		return listErr
	})
	if err != nil {
		return Page{}, err
	}
	if len(rows) > filter.Limit {
		rows = rows[:filter.Limit]
		last := rows[len(rows)-1]
		page.NextCursor = encodeCursor(Cursor{CreatedAt: last.CreatedAt, ID: last.ID})
	}
	page.Items = rows
	return page, nil
}

func ResolveManualMovement(movementType MovementType, currentStock, quantity int) (int, int, error) {
	var delta int
	switch movementType {
	case MovementTypeRestock:
		if quantity <= 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = quantity
	case MovementTypeReduce:
		if quantity <= 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = -quantity
	case MovementTypeSetExact:
		if quantity < 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = quantity - currentStock
	default:
		return 0, 0, ErrInvalidStockMovement
	}
	after := currentStock + delta
	if after < 0 {
		return 0, 0, ErrInsufficientStock
	}
	if delta == 0 {
		return 0, 0, ErrInvalidStockMovement
	}
	return delta, after, nil
}
