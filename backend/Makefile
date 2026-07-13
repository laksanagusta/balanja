ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: run test migrate-up migrate-down migrate-fix-0002 migrate-fix-0003 migrate-fix-0004 migrate-fix-0005 migrate-fix-0006 migrate-fix-0007

run:
	go run ./cmd/api

test:
	go test ./...

migrate-up:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000001_init.up.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000002_transactions_cashier_columns.up.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000003_checkout_idempotency.up.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000004_tenant_counters.up.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000005_transactions_cashier_name_nullable.up.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000006_remove_obsolete_checkout_rpc.up.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000007_stock_movements.up.sql

migrate-down:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000001_init.down.sql

migrate-fix-0002:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000002_transactions_cashier_columns.up.sql

migrate-fix-0003:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000003_checkout_idempotency.up.sql

migrate-fix-0004:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000004_tenant_counters.up.sql

migrate-fix-0005:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000005_transactions_cashier_name_nullable.up.sql

migrate-fix-0006:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000006_remove_obsolete_checkout_rpc.up.sql

migrate-fix-0007:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f migrations/000007_stock_movements.up.sql
