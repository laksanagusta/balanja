package stock

import (
	"balanja/backend/internal/platform/database"
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type PostgresRepository struct{}

func (PostgresRepository) Create(ctx context.Context, tx database.Tx, identity database.Identity, input CreateInput) (CreateResult, error) {
	product, err := lockProduct(ctx, tx, identity.OrgID, input.ProductID)
	if err != nil {
		return CreateResult{}, err
	}
	if !product.IsActive {
		return CreateResult{}, ErrProductInactive
	}

	delta, after, err := ResolveManualMovement(input.Type, product.Stock, input.Quantity)
	if err != nil {
		return CreateResult{}, err
	}

	updated, err := updateProductStock(ctx, tx, identity.OrgID, input.ProductID, after)
	if err != nil {
		return CreateResult{}, err
	}
	movement, err := insertMovement(ctx, tx, insertMovementInput{
		OrgID:           identity.OrgID,
		ProductID:       input.ProductID,
		Type:            input.Type,
		QuantityDelta:   delta,
		StockBefore:     product.Stock,
		StockAfter:      after,
		Reason:          input.Reason,
		CreatedByUserID: identity.UserID,
	})
	if err != nil {
		return CreateResult{}, err
	}
	return CreateResult{Movement: movement, Product: updated}, nil
}

func (PostgresRepository) List(ctx context.Context, tx database.Tx, identity database.Identity, filter ListFilter) ([]Movement, error) {
	var cursorAt any
	var cursorID any
	if filter.Cursor != nil {
		cursorAt = filter.Cursor.CreatedAt
		cursorID = filter.Cursor.ID
	}
	rows, err := tx.Query(ctx, `
		select sm.id, sm.product_id, coalesce(p.name, ''), coalesce(p.barcode, ''),
			coalesce(p.category, ''), coalesce(p.unit, ''), sm.type, sm.quantity_delta,
			sm.stock_before, sm.stock_after, sm.reason, sm.reference_type, sm.reference_id,
			sm.created_by_user_id, sm.created_at
		from stock_movements sm
		join products p on p.org_id = sm.org_id and p.id = sm.product_id
		where sm.org_id = $1
			and ($2::uuid is null or sm.product_id = $2)
			and ($3::text = '' or sm.type = $3)
			and ($4::text = '' or p.name ilike '%' || $4 || '%' or p.barcode ilike '%' || $4 || '%' or p.category ilike '%' || $4 || '%')
			and ($5::timestamptz is null or sm.created_at >= $5)
			and ($6::timestamptz is null or sm.created_at <= $6)
			and ($7::timestamptz is null or (sm.created_at, sm.id) < ($7, $8::uuid))
		order by sm.created_at desc, sm.id desc
		limit $9
	`, identity.OrgID, filter.ProductID, string(filter.Type), filter.Query, filter.DateFrom, filter.DateTo, cursorAt, cursorID, filter.Limit+1)
	if err != nil {
		return nil, fmt.Errorf("list stock movements: %w", err)
	}
	defer rows.Close()

	movements := make([]Movement, 0, filter.Limit)
	for rows.Next() {
		var movement Movement
		if err := rows.Scan(&movement.ID, &movement.ProductID, &movement.ProductName, &movement.ProductBarcode, &movement.ProductCategory, &movement.ProductUnit, &movement.Type, &movement.QuantityDelta, &movement.StockBefore, &movement.StockAfter, &movement.Reason, &movement.ReferenceType, &movement.ReferenceID, &movement.CreatedByUserID, &movement.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan stock movement: %w", err)
		}
		movements = append(movements, movement)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stock movements: %w", err)
	}
	return movements, nil
}

func lockProduct(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID) (LockedProduct, error) {
	var product LockedProduct
	err := tx.QueryRow(ctx, `select id,name,stock,active from products where org_id=$1 and id=$2 for update`, orgID, productID).Scan(&product.ID, &product.Name, &product.Stock, &product.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return LockedProduct{}, ErrProductNotFound
	}
	if err != nil {
		return LockedProduct{}, fmt.Errorf("lock product: %w", err)
	}
	return product, nil
}

func updateProductStock(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID, stock int) (ProductStock, error) {
	var updated ProductStock
	err := tx.QueryRow(ctx, `update products set stock=$3,updated_at=now() where org_id=$1 and id=$2 returning id,stock,updated_at`, orgID, productID, stock).Scan(&updated.ID, &updated.Stock, &updated.UpdatedAt)
	if err != nil {
		return ProductStock{}, fmt.Errorf("update product stock: %w", err)
	}
	return updated, nil
}

type insertMovementInput struct {
	OrgID           string
	ProductID       uuid.UUID
	Type            MovementType
	QuantityDelta   int
	StockBefore     int
	StockAfter      int
	Reason          string
	ReferenceType   *string
	ReferenceID     *uuid.UUID
	CreatedByUserID string
}

func insertMovement(ctx context.Context, tx database.Tx, input insertMovementInput) (Movement, error) {
	var movement Movement
	err := tx.QueryRow(ctx, `
		insert into stock_movements (org_id,product_id,type,quantity_delta,stock_before,stock_after,reason,reference_type,reference_id,created_by_user_id)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		returning id,product_id,type,quantity_delta,stock_before,stock_after,reason,reference_type,reference_id,created_by_user_id,created_at
	`, input.OrgID, input.ProductID, input.Type, input.QuantityDelta, input.StockBefore, input.StockAfter, input.Reason, input.ReferenceType, input.ReferenceID, input.CreatedByUserID).Scan(&movement.ID, &movement.ProductID, &movement.Type, &movement.QuantityDelta, &movement.StockBefore, &movement.StockAfter, &movement.Reason, &movement.ReferenceType, &movement.ReferenceID, &movement.CreatedByUserID, &movement.CreatedAt)
	if err != nil {
		return Movement{}, fmt.Errorf("insert stock movement: %w", err)
	}
	return movement, nil
}
