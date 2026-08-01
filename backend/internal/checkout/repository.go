package checkout

import (
	"balanja/backend/internal/entitlement"
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
	Image         string
	ImageKey      string
	Price, Stock  int
	Active        bool
}
type lockedVariant struct {
	ID         uuid.UUID
	ProductID  uuid.UUID
	Attributes map[string]string
	Price      int
	Stock      int
	Barcode    string
	Image      string
	ImageKey   string
	Active     bool
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
			result, loadErr := loadExisting(ctx, tx, id.OrgID, *transactionID)
			if loadErr != nil {
				return Result{}, loadErr
			}
			record, loadErr := loadEntitlement(ctx, tx, id.OrgID, false)
			if loadErr != nil {
				return Result{}, loadErr
			}
			result.Entitlement = entitlement.Summarize(record)
			return result, nil
		}
	}
	entitlementRecord, err := loadEntitlement(ctx, tx, id.OrgID, true)
	if err != nil {
		return Result{}, err
	}
	if !entitlement.Summarize(entitlementRecord).CanCheckout {
		return Result{}, ErrTransactionLimitReached
	}
	ids := make([]uuid.UUID, 0, len(input.Items))
	variantIDs := make([]uuid.UUID, 0, len(input.Items))
	for _, item := range input.Items {
		ids = append(ids, item.ProductID)
		if item.VariantID != nil {
			variantIDs = append(variantIDs, *item.VariantID)
		}
	}
	rows, err := tx.Query(ctx, `select id,name,barcode,image,image_key,price,stock,active from products where org_id=$1 and id=any($2::uuid[]) order by id for update`, id.OrgID, ids)
	if err != nil {
		return Result{}, fmt.Errorf("lock checkout products: %w", err)
	}
	products := map[uuid.UUID]lockedProduct{}
	for rows.Next() {
		var p lockedProduct
		if err := rows.Scan(&p.ID, &p.Name, &p.Barcode, &p.Image, &p.ImageKey, &p.Price, &p.Stock, &p.Active); err != nil {
			rows.Close()
			return Result{}, fmt.Errorf("scan checkout product: %w", err)
		}
		products[p.ID] = p
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Result{}, fmt.Errorf("iterate checkout products: %w", err)
	}
	variants := map[uuid.UUID]lockedVariant{}
	if len(variantIDs) > 0 {
		vrows, err := tx.Query(ctx, `select id,product_id,attributes,price,stock,barcode,image,image_key,active from product_variants where org_id=$1 and id=any($2::uuid[]) order by id for update`, id.OrgID, variantIDs)
		if err != nil {
			return Result{}, fmt.Errorf("lock checkout variants: %w", err)
		}
		for vrows.Next() {
			var v lockedVariant
			var attrs []byte
			if err := vrows.Scan(&v.ID, &v.ProductID, &attrs, &v.Price, &v.Stock, &v.Barcode, &v.Image, &v.ImageKey, &v.Active); err != nil {
				vrows.Close()
				return Result{}, fmt.Errorf("scan checkout variant: %w", err)
			}
			if len(attrs) > 0 && string(attrs) != "{}" {
				v.Attributes = map[string]string{}
				if err := json.Unmarshal(attrs, &v.Attributes); err != nil {
					vrows.Close()
					return Result{}, fmt.Errorf("decode checkout variant attributes: %w", err)
				}
			}
			variants[v.ID] = v
		}
		vrows.Close()
		if err := vrows.Err(); err != nil {
			return Result{}, fmt.Errorf("iterate checkout variants: %w", err)
		}
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
		var sellablePrice, sellableStock int
		var sellableBarcode, sellableImage, sellableImageKey string
		var variantAttributes map[string]string
		var variantID *uuid.UUID
		if requested.VariantID != nil {
			v, ok := variants[*requested.VariantID]
			if !ok || !v.Active {
				return Result{}, ErrProductInactive
			}
			if v.ProductID != p.ID {
				return Result{}, ErrProductNotFound
			}
			sellablePrice, sellableStock = v.Price, v.Stock
			sellableBarcode, sellableImage, sellableImageKey = v.Barcode, v.Image, v.ImageKey
			variantAttributes = v.Attributes
			variantID = requested.VariantID
		} else {
			sellablePrice, sellableStock = p.Price, p.Stock
			sellableBarcode, sellableImage, sellableImageKey = p.Barcode, p.Image, p.ImageKey
		}
		if requested.Quantity > sellableStock {
			return Result{}, ErrInsufficientStock
		}
		subtotal += sellablePrice * requested.Quantity
		image := sellableImage
		if sellableImageKey != "" {
			image = "/api/v1/product-images/" + sellableImageKey
		}
		items = append(items, Item{
			ProductID: p.ID, VariantID: variantID, VariantAttributes: variantAttributes,
			Name: p.Name, Barcode: sellableBarcode, Image: image, Price: sellablePrice, Quantity: requested.Quantity,
		})
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
	var cashierName *string
	if input.CashierName != "" {
		cashierName = &input.CashierName
	}
	result.Transaction = Transaction{Number: number, CashierUserID: id.UserID, CashierName: cashierName, Items: items, Subtotal: subtotal, Tax: tax, Total: total, PaymentMethod: input.Payment.Method, CashReceived: cash, ChangeDue: change, Status: "completed"}
	if err := tx.QueryRow(ctx, `insert into transactions (org_id,number,cashier_user_id,cashier_name,items,subtotal,tax,total,payment_method,cash_received,change_due) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id,created_at`, id.OrgID, number, id.UserID, cashierName, rawItems, subtotal, tax, total, input.Payment.Method, cash, change).Scan(&result.Transaction.ID, &result.Transaction.CreatedAt); err != nil {
		return Result{}, fmt.Errorf("insert transaction: %w", err)
	}
	referenceType := "checkout"
	for _, requested := range input.Items {
		var before, after int
		var stock ProductStock
		if requested.VariantID != nil {
			v := variants[*requested.VariantID]
			before = v.Stock
			after = before - requested.Quantity
			if after < 0 {
				return Result{}, ErrInsufficientStock
			}
			if err := tx.QueryRow(ctx, `update product_variants set stock=$3,updated_at=now() where org_id=$1 and id=$2 returning id,updated_at`, id.OrgID, requested.VariantID, after).Scan(&stock.ID, &stock.UpdatedAt); err != nil {
				return Result{}, fmt.Errorf("update variant stock: %w", err)
			}
			stock.Stock = after
		} else {
			product := products[requested.ProductID]
			before = product.Stock
			after = before - requested.Quantity
			if after < 0 {
				return Result{}, ErrInsufficientStock
			}
			if err := tx.QueryRow(ctx, `update products set stock=$3,updated_at=now() where org_id=$1 and id=$2 returning id,stock,updated_at`, id.OrgID, requested.ProductID, after).Scan(&stock.ID, &stock.Stock, &stock.UpdatedAt); err != nil {
				return Result{}, fmt.Errorf("update product stock: %w", err)
			}
		}
		if _, err := tx.Exec(ctx, `insert into stock_movements (org_id,product_id,product_variant_id,type,quantity_delta,stock_before,stock_after,reason,reference_type,reference_id,created_by_user_id,created_by_user_name) values ($1,$2,$3,'sale',$4,$5,$6,$7,$8,$9,$10,$11)`, id.OrgID, requested.ProductID, requested.VariantID, -requested.Quantity, before, after, "Completed sale "+number, referenceType, result.Transaction.ID, id.UserID, cashierName); err != nil {
			return Result{}, fmt.Errorf("insert sale stock movement: %w", err)
		}
		result.Products = append(result.Products, stock)
	}
	if _, err := tx.Exec(ctx, `update checkout_idempotency set transaction_id=$3 where org_id=$1 and idempotency_key=$2`, id.OrgID, key, result.Transaction.ID); err != nil {
		return Result{}, fmt.Errorf("complete checkout idempotency: %w", err)
	}
	if err := tx.QueryRow(ctx, `
		update organization_entitlements
		set transactions_used=transactions_used+1,updated_at=now()
		where org_id=$1
		returning org_id,status,transaction_limit,transactions_used,support_reference
	`, id.OrgID).Scan(
		&entitlementRecord.OrgID,
		&entitlementRecord.Status,
		&entitlementRecord.TransactionLimit,
		&entitlementRecord.TransactionsUsed,
		&entitlementRecord.SupportReference,
	); err != nil {
		return Result{}, fmt.Errorf("increment entitlement usage: %w", err)
	}
	result.Entitlement = entitlement.Summarize(entitlementRecord)
	if entitlementRecord.Status == entitlement.StatusTrial {
		if event := transactionMilestone(entitlementRecord.TransactionsUsed); event != "" {
			if _, err := tx.Exec(ctx, `
				insert into entitlement_events (org_id,name)
				values ($1,$2)
				on conflict (org_id,name) where name like 'transaction_%' do nothing
			`, id.OrgID, event); err != nil {
				return Result{}, fmt.Errorf("record transaction milestone: %w", err)
			}
		}
	}
	return result, nil
}

func loadEntitlement(ctx context.Context, tx database.Tx, orgID string, lock bool) (entitlement.Record, error) {
	if _, err := tx.Exec(ctx, `
		insert into organization_entitlements (org_id,status,transaction_limit)
		values ($1,'trial',50)
		on conflict (org_id) do nothing
	`, orgID); err != nil {
		return entitlement.Record{}, fmt.Errorf("provision checkout entitlement: %w", err)
	}
	query := `
		select org_id,status,transaction_limit,transactions_used,support_reference
		from organization_entitlements
		where org_id=$1`
	if lock {
		query += " for update"
	}
	var record entitlement.Record
	if err := tx.QueryRow(ctx, query, orgID).Scan(
		&record.OrgID,
		&record.Status,
		&record.TransactionLimit,
		&record.TransactionsUsed,
		&record.SupportReference,
	); err != nil {
		return entitlement.Record{}, fmt.Errorf("load checkout entitlement: %w", err)
	}
	return record, nil
}

func transactionMilestone(used int64) string {
	switch used {
	case 10, 25, 40, 45, 50:
		return fmt.Sprintf("transaction_%d", used)
	default:
		return ""
	}
}

func (PostgresRepository) RecordLimitRejected(ctx context.Context, tx database.Tx, orgID string) error {
	if _, err := tx.Exec(ctx, `
		insert into entitlement_events (org_id,name)
		values ($1,'limit_rejected')
	`, orgID); err != nil {
		return fmt.Errorf("record rejected checkout: %w", err)
	}
	return nil
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
