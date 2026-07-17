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

type listOrder struct {
	Column    string
	Operator  string
	Direction string
}

func resolveProductOrder(sort, direction string) (listOrder, error) {
	operator := ">"
	if direction == "desc" {
		operator = "<"
	} else if direction != "asc" {
		return listOrder{}, ErrInvalidProduct
	}
	var column string
	switch sort {
	case "name":
		column = "p.name"
	case "category":
		column = "p.category"
	case "price":
		column = "p.price"
	case "stock":
		column = "p.stock"
	case "createdAt":
		column = "p.created_at"
	default:
		return listOrder{}, ErrInvalidProduct
	}
	return listOrder{Column: column, Operator: operator, Direction: direction}, nil
}

func scanProduct(row pgx.Row) (Product, error) {
	var p Product
	err := row.Scan(&p.ID, &p.Name, &p.Barcode, &p.Category, &p.Price, &p.Stock, &p.Unit, &p.Image, &p.ImageKey, &p.Active, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func scanUpdateResult(row pgx.Row) (UpdateResult, error) {
	var result UpdateResult
	p := &result.Product
	err := row.Scan(&p.ID, &p.Name, &p.Barcode, &p.Category, &p.Price, &p.Stock, &p.Unit, &p.Image, &p.ImageKey, &p.Active, &p.CreatedAt, &p.UpdatedAt, &result.PreviousImageKey)
	return result, err
}

const productColumns = `id,name,barcode,category,price,stock,unit,image,image_key,active,created_at,updated_at`
const productSelectColumns = `p.id,p.name,p.barcode,p.category,p.price,p.stock,p.unit,p.image,p.image_key,p.active,p.created_at,p.updated_at`

func (PostgresRepository) List(ctx context.Context, tx database.Tx, orgID string, filter ListFilter) ([]Product, error) {
	order, err := resolveProductOrder(filter.Sort, filter.Direction)
	if err != nil {
		return nil, err
	}
	query := fmt.Sprintf(`
		select %s
		from products p
		where p.org_id=$1
			and ($2='' or p.name ilike '%%' || $2 || '%%' or p.barcode ilike '%%' || $2 || '%%' or p.category ilike '%%' || $2 || '%%')
			and ($3='' or p.category=$3)
			and ($4::boolean is null or p.active=$4)
			and (not $5::boolean or (%s,p.id) %s ($6,$7::uuid))
		order by %s %s,p.id %s
		limit $8`, productSelectColumns, order.Column, order.Operator, order.Column, order.Direction, order.Direction)
	var active any
	if filter.Active != nil {
		active = *filter.Active
	}
	hasCursor := filter.CursorID != uuid.Nil
	rows, err := tx.Query(ctx, query, orgID, filter.Query, filter.Category, active, hasCursor, filter.CursorValue, filter.CursorID, filter.Limit)
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
	p, err := scanProduct(tx.QueryRow(ctx, `insert into products (org_id,name,barcode,category,price,stock,unit,image,image_key) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning `+productColumns, orgID, in.Name, in.Barcode, in.Category, in.Price, in.Stock, in.Unit, in.Image, in.ImageKey))
	if err != nil {
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Product{}, ErrBarcodeConflict
		}
		return Product{}, fmt.Errorf("create product: %w", err)
	}
	return p, nil
}
func (PostgresRepository) Update(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID, in UpdateInput) (UpdateResult, error) {
	result, err := scanUpdateResult(tx.QueryRow(ctx, `
		with previous as (
			select image_key from products where org_id=$1 and id=$2 for update
		), updated as (
			update products p set
				name=$3,barcode=$4,category=$5,price=$6,unit=$7,
				image=case when $10 then p.image else $8 end,
				image_key=case when $10 then p.image_key when p.image=$8 and $9='' then p.image_key else $9 end,
				active=$11
			from previous
			where p.org_id=$1 and p.id=$2
			returning p.id,p.name,p.barcode,p.category,p.price,p.stock,p.unit,p.image,p.image_key,p.active,p.created_at,p.updated_at
		)
		select updated.*,previous.image_key from updated cross join previous`, orgID, id, in.Name, in.Barcode, in.Category, in.Price, in.Unit, in.Image, in.ImageKey, in.PreserveImage, in.Active))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return UpdateResult{}, ErrNotFound
		}
		return UpdateResult{}, fmt.Errorf("update product: %w", err)
	}
	return result, nil
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
