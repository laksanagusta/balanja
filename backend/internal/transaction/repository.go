package transaction

import (
	"balanja/backend/internal/platform/database"
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
)

type PostgresRepository struct{}

const listTransactionsQuery = `select id,number,cashier_user_id,cashier_name,items,subtotal,tax,total,payment_method,cash_received,change_due,status,created_at from transactions where org_id=$1 and ($2::timestamptz is null or (created_at,id)<($2,$3::uuid)) order by created_at desc,id desc limit $4`

func (PostgresRepository) List(ctx context.Context, tx database.Tx, org string, cursor *Cursor, limit int) ([]Transaction, error) {
	var at any
	var id any
	if cursor != nil {
		at = cursor.CreatedAt
		id = cursor.ID
	}
	rows, err := tx.Query(ctx, listTransactionsQuery, org, at, id, limit)
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
