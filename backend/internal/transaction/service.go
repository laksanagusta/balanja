package transaction

import (
	"balanja/backend/internal/platform/database"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
)

var ErrInvalidCursor = errors.New("invalid cursor")

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}
type Repository interface {
	List(context.Context, database.Tx, string, *Cursor, int) ([]Transaction, error)
}
type Service struct {
	runner     Runner
	repository Repository
}

func NewService(r Runner, repo Repository) *Service { return &Service{runner: r, repository: repo} }
func normalizeLimit(limit int) int {
	if limit <= 0 {
		return 50
	}
	if limit > 100 {
		return 100
	}
	return limit
}
func encodeCursor(c Cursor) string {
	value, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(value)
}
func decodeCursor(raw string) (Cursor, error) {
	var c Cursor
	value, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return c, ErrInvalidCursor
	}
	if err = json.Unmarshal(value, &c); err != nil || c.ID == [16]byte{} || c.CreatedAt.IsZero() {
		return Cursor{}, ErrInvalidCursor
	}
	return c, nil
}
func (s *Service) List(ctx context.Context, id database.Identity, raw string, limit int) (page Page, err error) {
	limit = normalizeLimit(limit)
	var cursor *Cursor
	if raw != "" {
		value, e := decodeCursor(raw)
		if e != nil {
			return Page{}, e
		}
		cursor = &value
	}
	var rows []Transaction
	err = s.runner.Run(ctx, id, func(tx database.Tx) error {
		var e error
		rows, e = s.repository.List(ctx, tx, id.OrgID, cursor, limit+1)
		return e
	})
	if err != nil {
		return Page{}, err
	}
	if len(rows) > limit {
		rows = rows[:limit]
		last := rows[len(rows)-1]
		page.NextCursor = encodeCursor(Cursor{CreatedAt: last.CreatedAt, ID: last.ID})
	}
	page.Items = rows
	return page, nil
}
