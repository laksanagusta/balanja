package checkout

import (
	"balanja/backend/internal/platform/database"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"math"
)

type PostgresRepository struct{}
type lockedProduct struct {
	ID            uuid.UUID
	Name, Barcode string
	Price, Stock  int
	Active        bool
}

func (PostgresRepository) Execute(ctx context.Context, tx database.Tx, id database.Identity, key, fingerprint string, input Input) (Result, error) {
	tag, err := tx.Exec(ctx, `insert into checkout_idempotency (org_id,idempotency_key,request_fingerprint) values ($1,$2,$3) on conflict do nothing`, id.OrgID, key, fingerprint)
	if err != nil {
		return Result{}, fmt.Errorf("reserve checkout idempotency: %w", err)
	}
	if tag.RowsAffected() == 0 {
		var existing string
		var transactionID *uuid.UUID
		if err := tx.QueryRow(ctx, `select request_fingerprint,transaction_id from checkout_idempotency where org_id=$1 and idempotency_key=$2 for update`, id.OrgID, key).Scan(&existing, &transactionID); err != nil {
			return Result{}, fmt.Errorf("load checkout idempotency: %w", err)
		}
		if existing != fingerprint {
			return Result{}, ErrIdempotencyKeyReused
		}
		if transactionID != nil {
			return loadExisting(ctx, tx, id.OrgID, *transactionID)
		}
	}
	ids := make([]uuid.UUID, len(input.Items))
	for i, item := range input.Items {
		ids[i] = item.ProductID
	}
	rows, err := tx.Query(ctx, `select id,name,barcode,price,stock,active from products where org_id=$1 and id=any($2::uuid[]) order by id for update`, id.OrgID, ids)
	if err != nil {
		return Result{}, fmt.Errorf("lock checkout products: %w", err)
	}
	products := map[uuid.UUID]lockedProduct{}
	for rows.Next() {
		var p lockedProduct
		if err := rows.Scan(&p.ID, &p.Name, &p.Barcode, &p.Price, &p.Stock, &p.Active); err != nil {
			rows.Close()
			return Result{}, fmt.Errorf("scan checkout product: %w", err)
		}
		products[p.ID] = p
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Result{}, fmt.Errorf("iterate checkout products: %w", err)
	}
	if len(products) != len(input.Items) {
		return Result{}, ErrProductNotFound
	}
	var taxEnabled bool
	var taxRate int
	if err := tx.QueryRow(ctx, `select tax_enabled,tax_rate from store_settings where org_id=$1`, id.OrgID).Scan(&taxEnabled, &taxRate); err != nil {
		return Result{}, fmt.Errorf("load checkout settings: %w", err)
	}
	items := make([]Item, 0, len(input.Items))
	subtotal := 0
	for _, requested := range input.Items {
		p := products[requested.ProductID]
		if !p.Active {
			return Result{}, ErrProductInactive
		}
		if requested.Quantity > p.Stock {
			return Result{}, ErrInsufficientStock
		}
		subtotal += p.Price * requested.Quantity
		items = append(items, Item{ProductID: p.ID, Name: p.Name, Barcode: p.Barcode, Price: p.Price, Quantity: requested.Quantity})
	}
	tax := 0
	if taxEnabled {
		tax = int(math.Round(float64(subtotal) * float64(taxRate) / 100))
	}
	total := subtotal + tax
	cash := input.Payment.CashReceived
	if input.Payment.Method == "cash" && cash < total {
		return Result{}, ErrInsufficientCash
	}
	change := 0
	if input.Payment.Method == "cash" {
		change = cash - total
	}
	var sequence int64
	if err := tx.QueryRow(ctx, `insert into tenant_counters (org_id,next_transaction_number) values ($1,2) on conflict (org_id) do update set next_transaction_number=tenant_counters.next_transaction_number+1 returning next_transaction_number-1`, id.OrgID).Scan(&sequence); err != nil {
		return Result{}, fmt.Errorf("allocate transaction number: %w", err)
	}
	number := fmt.Sprintf("TRX-%06d", sequence)
	rawItems, err := json.Marshal(items)
	if err != nil {
		return Result{}, fmt.Errorf("encode transaction items: %w", err)
	}
	var result Result
	result.Transaction = Transaction{Number: number, CashierUserID: id.UserID, Items: items, Subtotal: subtotal, Tax: tax, Total: total, PaymentMethod: input.Payment.Method, CashReceived: cash, ChangeDue: change, Status: "completed"}
	if err := tx.QueryRow(ctx, `insert into transactions (org_id,number,cashier_user_id,items,subtotal,tax,total,payment_method,cash_received,change_due) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,created_at`, id.OrgID, number, id.UserID, rawItems, subtotal, tax, total, input.Payment.Method, cash, change).Scan(&result.Transaction.ID, &result.Transaction.CreatedAt); err != nil {
		return Result{}, fmt.Errorf("insert transaction: %w", err)
	}
	referenceType := "checkout"
	for _, requested := range input.Items {
		product := products[requested.ProductID]
		before := product.Stock
		after := before - requested.Quantity
		if after < 0 {
			return Result{}, ErrInsufficientStock
		}
		var stock ProductStock
		if err := tx.QueryRow(ctx, `update products set stock=$3,updated_at=now() where org_id=$1 and id=$2 returning id,stock,updated_at`, id.OrgID, requested.ProductID, after).Scan(&stock.ID, &stock.Stock, &stock.UpdatedAt); err != nil {
			return Result{}, fmt.Errorf("update product stock: %w", err)
		}
		if _, err := tx.Exec(ctx, `insert into stock_movements (org_id,product_id,type,quantity_delta,stock_before,stock_after,reason,reference_type,reference_id,created_by_user_id) values ($1,$2,'sale',$3,$4,$5,$6,$7,$8,$9)`, id.OrgID, requested.ProductID, -requested.Quantity, before, after, "Completed sale "+number, referenceType, result.Transaction.ID, id.UserID); err != nil {
			return Result{}, fmt.Errorf("insert sale stock movement: %w", err)
		}
		result.Products = append(result.Products, stock)
	}
	if _, err := tx.Exec(ctx, `update checkout_idempotency set transaction_id=$3 where org_id=$1 and idempotency_key=$2`, id.OrgID, key, result.Transaction.ID); err != nil {
		return Result{}, fmt.Errorf("complete checkout idempotency: %w", err)
	}
	return result, nil
}
func loadExisting(ctx context.Context, tx database.Tx, org string, id uuid.UUID) (Result, error) {
	var result Result
	var raw []byte
	err := tx.QueryRow(ctx, `select id,number,cashier_user_id,cashier_name,items,subtotal,tax,total,payment_method,cash_received,change_due,status,created_at from transactions where org_id=$1 and id=$2`, org, id).Scan(&result.Transaction.ID, &result.Transaction.Number, &result.Transaction.CashierUserID, &result.Transaction.CashierName, &raw, &result.Transaction.Subtotal, &result.Transaction.Tax, &result.Transaction.Total, &result.Transaction.PaymentMethod, &result.Transaction.CashReceived, &result.Transaction.ChangeDue, &result.Transaction.Status, &result.Transaction.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Result{}, ErrProductNotFound
	}
	if err != nil {
		return Result{}, fmt.Errorf("load replay transaction: %w", err)
	}
	if err := json.Unmarshal(raw, &result.Transaction.Items); err != nil {
		return Result{}, fmt.Errorf("decode replay items: %w", err)
	}
	result.Replay = true
	return result, nil
}
