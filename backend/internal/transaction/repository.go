package transaction

import (
	"context"
	"fmt"

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
	return items, nil
}
