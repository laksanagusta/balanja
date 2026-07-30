package transaction

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type PostgresRepository struct{}

type listOrder struct {
	Column    string
	Operator  string
	Direction string
}

func resolveTransactionOrder(sort, direction string) (listOrder, error) {
	operator := ">"
	if direction == "desc" {
		operator = "<"
	} else if direction != "asc" {
		return listOrder{}, ErrInvalidFilter
	}
	var column string
	switch sort {
	case "number":
		column = "t.number"
	case "paymentMethod":
		column = "t.payment_method"
	case "total":
		column = "t.total"
	case "createdAt":
		column = "t.created_at"
	default:
		return listOrder{}, ErrInvalidFilter
	}
	return listOrder{Column: column, Operator: operator, Direction: direction}, nil
}

const transactionColumns = `t.id,t.number,t.cashier_user_id,t.cashier_name,t.items,t.subtotal,t.tax,t.total,t.payment_method,t.cash_received,t.change_due,t.status,t.created_at`

func (PostgresRepository) List(ctx context.Context, tx database.Tx, orgID string, filter ListFilter) ([]Transaction, error) {
	order, err := resolveTransactionOrder(filter.Sort, filter.Direction)
	if err != nil {
		return nil, err
	}
	query := fmt.Sprintf(`
		select %s
		from transactions t
		where t.org_id=$1
			and ($2='' or t.number ilike '%%'||$2||'%%' or coalesce(t.cashier_name,'') ilike '%%'||$2||'%%')
			and ($3='' or t.payment_method=$3)
			and ($4::timestamptz is null or t.created_at >= $4)
			and ($5::timestamptz is null or t.created_at <= $5)
			and (not $6::boolean or (%s,t.id) %s ($7,$8::uuid))
		order by %s %s,t.id %s
		limit $9`, transactionColumns, order.Column, order.Operator, order.Column, order.Direction, order.Direction)
	hasCursor := filter.CursorID != uuid.Nil
	rows, err := tx.Query(ctx, query, orgID, filter.Query, filter.PaymentMethod, filter.DateFrom, filter.DateTo, hasCursor, filter.CursorValue, filter.CursorID, filter.Limit)
	if err != nil {
		return nil, fmt.Errorf("list transactions: %w", err)
	}
	defer rows.Close()
	items, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Transaction, error) {
		var item Transaction
		err := row.Scan(&item.ID, &item.Number, &item.CashierUserID, &item.CashierName, &item.Items, &item.Subtotal, &item.Tax, &item.Total, &item.PaymentMethod, &item.CashReceived, &item.ChangeDue, &item.Status, &item.CreatedAt)
		return item, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan transactions: %w", err)
	}
	rows.Close()

	productIDs := transactionImageProductIDs(items)
	if len(productIDs) == 0 {
		return items, nil
	}
	productImages, err := findTransactionProductImages(ctx, tx, orgID, productIDs)
	if err != nil {
		return nil, err
	}
	if err := enrichTransactionItemImages(items, productImages); err != nil {
		return nil, fmt.Errorf("enrich transaction item images: %w", err)
	}
	return items, nil
}

func transactionImageProductIDs(transactions []Transaction) []uuid.UUID {
	productIDs := make([]uuid.UUID, 0)
	seen := make(map[uuid.UUID]struct{})
	for _, transaction := range transactions {
		var items []map[string]json.RawMessage
		if err := json.Unmarshal(transaction.Items, &items); err != nil {
			continue
		}
		for _, item := range items {
			if transactionItemHasImage(item) {
				continue
			}
			var productID uuid.UUID
			if err := json.Unmarshal(item["productId"], &productID); err != nil || productID == uuid.Nil {
				continue
			}
			if _, exists := seen[productID]; exists {
				continue
			}
			seen[productID] = struct{}{}
			productIDs = append(productIDs, productID)
		}
	}
	return productIDs
}

func transactionItemHasImage(item map[string]json.RawMessage) bool {
	var image string
	if err := json.Unmarshal(item["image"], &image); err != nil {
		return false
	}
	return strings.TrimSpace(image) != ""
}

func findTransactionProductImages(ctx context.Context, tx database.Tx, orgID string, productIDs []uuid.UUID) (map[uuid.UUID]string, error) {
	rows, err := tx.Query(ctx, `
		select id,image,image_key
		from products
		where org_id=$1 and id=any($2::uuid[])`, orgID, productIDs)
	if err != nil {
		return nil, fmt.Errorf("find transaction product images: %w", err)
	}
	defer rows.Close()

	images := make(map[uuid.UUID]string, len(productIDs))
	for rows.Next() {
		var productID uuid.UUID
		var image string
		var imageKey string
		if err := rows.Scan(&productID, &image, &imageKey); err != nil {
			return nil, fmt.Errorf("scan transaction product image: %w", err)
		}
		if imageKey != "" {
			image = "/api/v1/product-images/" + imageKey
		}
		if strings.TrimSpace(image) != "" {
			images[productID] = image
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate transaction product images: %w", err)
	}
	return images, nil
}

func enrichTransactionItemImages(transactions []Transaction, productImages map[uuid.UUID]string) error {
	for transactionIndex := range transactions {
		var items []map[string]json.RawMessage
		if err := json.Unmarshal(transactions[transactionIndex].Items, &items); err != nil {
			return err
		}
		changed := false
		for _, item := range items {
			if transactionItemHasImage(item) {
				continue
			}
			var productID uuid.UUID
			if err := json.Unmarshal(item["productId"], &productID); err != nil {
				continue
			}
			image := productImages[productID]
			if strings.TrimSpace(image) == "" {
				continue
			}
			encodedImage, err := json.Marshal(image)
			if err != nil {
				return err
			}
			item["image"] = encodedImage
			changed = true
		}
		if !changed {
			continue
		}
		encodedItems, err := json.Marshal(items)
		if err != nil {
			return err
		}
		transactions[transactionIndex].Items = encodedItems
	}
	return nil
}
