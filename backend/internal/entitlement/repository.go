package entitlement

import (
	"context"
	"fmt"

	"balanja/backend/internal/platform/database"
)

type PostgresRepository struct{}

func (PostgresRepository) GetOrCreate(ctx context.Context, tx database.Tx, orgID string) (Record, error) {
	if _, err := tx.Exec(ctx, `
		insert into organization_entitlements (org_id,status,transaction_limit)
		values ($1,'trial',50)
		on conflict (org_id) do nothing
	`, orgID); err != nil {
		return Record{}, fmt.Errorf("provision organization entitlement: %w", err)
	}
	var record Record
	err := tx.QueryRow(ctx, `
		select org_id,status,transaction_limit,transactions_used,support_reference
		from organization_entitlements
		where org_id=$1
	`, orgID).Scan(
		&record.OrgID,
		&record.Status,
		&record.TransactionLimit,
		&record.TransactionsUsed,
		&record.SupportReference,
	)
	if err != nil {
		return Record{}, fmt.Errorf("load organization entitlement: %w", err)
	}
	return record, nil
}

func (PostgresRepository) RecordEvent(ctx context.Context, tx database.Tx, orgID, event string) error {
	if _, err := tx.Exec(ctx, `
		insert into entitlement_events (org_id,name)
		values ($1,$2)
	`, orgID, event); err != nil {
		return fmt.Errorf("record entitlement event: %w", err)
	}
	return nil
}
