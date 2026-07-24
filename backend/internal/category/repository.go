package category

import (
	"context"
	"errors"
	"fmt"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type PostgresRepository struct{}

func scanCategory(row pgx.Row) (Category, error) {
	var item Category
	err := row.Scan(&item.ID, &item.Name, &item.Active, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (PostgresRepository) List(ctx context.Context, tx database.Tx, orgID string, includeArchived bool) ([]Category, error) {
	if _, err := tx.Exec(ctx, "insert into categories (org_id,name) select $1,name from unnest($2::text[]) name where not exists (select 1 from categories where org_id=$1) on conflict do nothing", orgID, defaultCategoryNames); err != nil {
		return nil, fmt.Errorf("initialize categories: %w", err)
	}
	rows, err := tx.Query(ctx, "select id,name,active,created_at,updated_at from categories where org_id=$1 and ($2 or active) order by lower(name),id", orgID, includeArchived)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()
	items, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Category, error) {
		return scanCategory(row)
	})
	if err != nil {
		return nil, fmt.Errorf("scan categories: %w", err)
	}
	return items, nil
}

func loadConflict(ctx context.Context, tx database.Tx, orgID, name string) error {
	var id uuid.UUID
	var active bool
	err := tx.QueryRow(ctx, "select id, active from categories where org_id=$1 and lower(name)=lower($2)", orgID, name).Scan(&id, &active)
	if err != nil {
		return fmt.Errorf("load conflicting category: %w", err)
	}
	if active {
		return ErrNameConflict
	}
	return &ArchivedNameConflict{ID: id}
}

func mapWriteError(ctx context.Context, tx database.Tx, orgID, name string, err error, action string) error {
	var postgresError *pgconn.PgError
	if errors.As(err, &postgresError) && postgresError.Code == "23505" {
		return loadConflict(ctx, tx, orgID, name)
	}
	return fmt.Errorf("%s category: %w", action, err)
}

func (PostgresRepository) Create(ctx context.Context, tx database.Tx, orgID string, input WriteInput) (Category, error) {
	item, err := scanCategory(tx.QueryRow(ctx, "insert into categories (org_id,name) values ($1,$2) returning id,name,active,created_at,updated_at", orgID, input.Name))
	if err != nil {
		return Category{}, mapWriteError(ctx, tx, orgID, input.Name, err, "create")
	}
	return item, nil
}

func (PostgresRepository) Rename(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID, input WriteInput) (Category, error) {
	item, err := scanCategory(tx.QueryRow(ctx, "update categories set name=$3 where org_id=$1 and id=$2 returning id,name,active,created_at,updated_at", orgID, id, input.Name))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Category{}, ErrNotFound
		}
		return Category{}, mapWriteError(ctx, tx, orgID, input.Name, err, "rename")
	}
	return item, nil
}

func (PostgresRepository) SetActive(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID, active bool) (Category, error) {
	item, err := scanCategory(tx.QueryRow(ctx, "update categories set active=$3 where org_id=$1 and id=$2 returning id,name,active,created_at,updated_at", orgID, id, active))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Category{}, ErrNotFound
		}
		return Category{}, fmt.Errorf("set category active state: %w", err)
	}
	return item, nil
}
