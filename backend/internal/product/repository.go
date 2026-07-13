package product

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

func scanProduct(row pgx.Row) (Product, error) {
	var p Product
	err := row.Scan(&p.ID, &p.Name, &p.Barcode, &p.Category, &p.Price, &p.Stock, &p.Unit, &p.Image, &p.Active, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

const productColumns = `id,name,barcode,category,price,stock,unit,image,active,created_at,updated_at`

func (PostgresRepository) List(ctx context.Context, tx database.Tx, orgID string, filter ListFilter) ([]Product, error) {
	limit := filter.Limit
	if limit == 0 {
		limit = 10000
	}
	rows, err := tx.Query(ctx, `
		select `+productColumns+`
		from products
		where org_id=$1
			and ($2='' or name ilike '%' || $2 || '%' or barcode ilike '%' || $2 || '%' or category ilike '%' || $2 || '%')
		order by created_at,id
		limit $3`, orgID, filter.Query, limit)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()
	products, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Product, error) { return scanProduct(row) })
	if err != nil {
		return nil, fmt.Errorf("scan products: %w", err)
	}
	return products, nil
}
func (PostgresRepository) Create(ctx context.Context, tx database.Tx, orgID string, in CreateInput) (Product, error) {
	p, err := scanProduct(tx.QueryRow(ctx, `insert into products (org_id,name,barcode,category,price,stock,unit,image) values ($1,$2,$3,$4,$5,$6,$7,$8) returning `+productColumns, orgID, in.Name, in.Barcode, in.Category, in.Price, in.Stock, in.Unit, in.Image))
	if err != nil {
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Product{}, ErrBarcodeConflict
		}
		return Product{}, fmt.Errorf("create product: %w", err)
	}
	return p, nil
}
func (PostgresRepository) Update(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID, in UpdateInput) (Product, error) {
	p, err := scanProduct(tx.QueryRow(ctx, `update products set name=$3,barcode=$4,category=$5,price=$6,unit=$7,image=$8,active=$9 where org_id=$1 and id=$2 returning `+productColumns, orgID, id, in.Name, in.Barcode, in.Category, in.Price, in.Unit, in.Image, in.Active))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Product{}, ErrNotFound
		}
		return Product{}, fmt.Errorf("update product: %w", err)
	}
	return p, nil
}
func (PostgresRepository) Deactivate(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID) (Product, error) {
	p, err := scanProduct(tx.QueryRow(ctx, `update products set active=false where org_id=$1 and id=$2 returning `+productColumns, orgID, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Product{}, ErrNotFound
		}
		return Product{}, fmt.Errorf("deactivate product: %w", err)
	}
	return p, nil
}
