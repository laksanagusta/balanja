package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	setOrgIDSQL  = "select set_config('app.org_id', $1, true)"
	setUserIDSQL = "select set_config('app.user_id', $1, true)"
)

type Identity struct {
	OrgID  string
	UserID string
}

type Tx interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
	Commit(context.Context) error
	Rollback(context.Context) error
}

type Beginner interface {
	Begin(context.Context) (Tx, error)
}

type Runner struct{ DB Beginner }

func (r Runner) Run(ctx context.Context, identity Identity, fn func(Tx) error) error {
	return WithinTenant(ctx, r.DB, identity, fn)
}

func WithinTenant(ctx context.Context, db Beginner, identity Identity, fn func(Tx) error) error {
	if identity.OrgID == "" {
		return fmt.Errorf("organization ID is required")
	}
	if identity.UserID == "" {
		return fmt.Errorf("user ID is required")
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tenant transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, setOrgIDSQL, identity.OrgID); err != nil {
		return fmt.Errorf("set organization context: %w", err)
	}
	if _, err := tx.Exec(ctx, setUserIDSQL, identity.UserID); err != nil {
		return fmt.Errorf("set user context: %w", err)
	}
	if err := fn(tx); err != nil {
		return fmt.Errorf("run tenant operation: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tenant transaction: %w", err)
	}
	return nil
}
