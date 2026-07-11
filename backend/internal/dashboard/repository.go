package dashboard

import (
	"balanja/backend/internal/platform/database"
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type PostgresRepository struct{}

func (PostgresRepository) Load(ctx context.Context, tx database.Tx, org string, start time.Time) ([]Transaction, []Product, error) {
	rows, err := tx.Query(ctx, `select created_at,status,total,payment_method,items from transactions where org_id=$1 and created_at >= $2 order by created_at`, org, start)
	if err != nil {
		return nil, nil, fmt.Errorf("load dashboard transactions: %w", err)
	}
	defer rows.Close()
	transactions := []Transaction{}
	for rows.Next() {
		var item Transaction
		var raw []byte
		if err := rows.Scan(&item.CreatedAt, &item.Status, &item.Total, &item.PaymentMethod, &raw); err != nil {
			return nil, nil, fmt.Errorf("scan dashboard transaction: %w", err)
		}
		if err := json.Unmarshal(raw, &item.Items); err != nil {
			return nil, nil, fmt.Errorf("decode dashboard items: %w", err)
		}
		transactions = append(transactions, item)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate dashboard transactions: %w", err)
	}
	productRows, err := tx.Query(ctx, `select id::text,name,stock,active from products where org_id=$1 and active`, org)
	if err != nil {
		return nil, nil, fmt.Errorf("load dashboard products: %w", err)
	}
	defer productRows.Close()
	products := []Product{}
	for productRows.Next() {
		var p Product
		if err := productRows.Scan(&p.ID, &p.Name, &p.Stock, &p.Active); err != nil {
			return nil, nil, fmt.Errorf("scan dashboard product: %w", err)
		}
		products = append(products, p)
	}
	return transactions, products, productRows.Err()
}
