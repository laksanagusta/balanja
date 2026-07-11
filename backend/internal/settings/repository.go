package settings

import (
	"balanja/backend/internal/platform/database"
	"context"
	"fmt"
)

type PostgresRepository struct{}

func (PostgresRepository) Get(ctx context.Context, tx database.Tx, org string) (Settings, error) {
	_, err := tx.Exec(ctx, `insert into store_settings (org_id) values ($1) on conflict do nothing`, org)
	if err != nil {
		return Settings{}, fmt.Errorf("initialize settings: %w", err)
	}
	var s Settings
	err = tx.QueryRow(ctx, `select store_name,store_address,tax_enabled,tax_rate,qris_label,updated_at from store_settings where org_id=$1`, org).Scan(&s.StoreName, &s.StoreAddress, &s.TaxEnabled, &s.TaxRate, &s.QRISLabel, &s.UpdatedAt)
	if err != nil {
		return Settings{}, fmt.Errorf("get settings: %w", err)
	}
	return s, nil
}
func (PostgresRepository) Update(ctx context.Context, tx database.Tx, org string, in UpdateInput) (Settings, error) {
	var s Settings
	err := tx.QueryRow(ctx, `update store_settings set store_name=$2,store_address=$3,tax_enabled=$4,tax_rate=$5,qris_label=$6 where org_id=$1 returning store_name,store_address,tax_enabled,tax_rate,qris_label,updated_at`, org, in.StoreName, in.StoreAddress, in.TaxEnabled, in.TaxRate, in.QRISLabel).Scan(&s.StoreName, &s.StoreAddress, &s.TaxEnabled, &s.TaxRate, &s.QRISLabel, &s.UpdatedAt)
	if err != nil {
		return Settings{}, fmt.Errorf("update settings: %w", err)
	}
	return s, nil
}
