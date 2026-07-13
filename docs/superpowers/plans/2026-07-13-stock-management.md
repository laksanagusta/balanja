# Stock Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated Stock module with an append-only inventory movement ledger, manual stock adjustments, and checkout sale movement recording.

**Architecture:** `products.stock` remains the fast current-stock cache used by POS, Products, and Dashboard. Every stock-changing path locks the product row, computes before/delta/after, updates `products.stock`, and inserts a `stock_movements` row in the same tenant transaction. The frontend adds a menu-specific Stock page that loads only products and stock movements.

**Tech Stack:** Go HTTP API with `pgx`/PostgreSQL/RLS, Vite React frontend, existing POS store/api-client patterns, Node test runner, Go tests.

---

## File Structure

Backend files:

- Create `backend/migrations/000007_stock_movements.up.sql`: stock movement ledger table, RLS policy, indexes, and grants.
- Create `backend/migrations/000007_stock_movements.down.sql`: no-op down migration to preserve audit history, matching existing forward-fix migrations.
- Modify `backend/Makefile`: add migration target for version `000007`.
- Modify `backend/README.md`: document the stock movement migration repair command.
- Modify `backend/internal/integration/migration_forward_fix_test.go`: verify stock movement migration contract fragments.
- Create `backend/internal/stock/model.go`: stock movement DTOs, filters, errors, and movement type constants.
- Create `backend/internal/stock/service.go`: validation, tenant operation orchestration, and movement semantics.
- Create `backend/internal/stock/repository.go`: PostgreSQL list/create operations and product locking.
- Create `backend/internal/stock/handler.go`: `GET /stock/movements` and `POST /stock/movements`.
- Create `backend/internal/stock/service_test.go`: unit tests for validation and movement calculation.
- Modify `backend/internal/checkout/repository.go`: insert `sale` stock movements during checkout.
- Modify `backend/internal/integration/checkout_test.go`: assert checkout creates sale movement rows.
- Modify `backend/cmd/api/main.go`: wire stock handler.

Frontend files:

- Modify `frontend/src/pos/api-client.js`: add `listStockMovements` and `createStockMovement`.
- Modify `frontend/src/pos/api-client.test.js`: cover stock API query/payload behavior.
- Modify `frontend/src/pos/store-data.js`: add stock movement loader and normalization.
- Modify `frontend/src/pos/store-data.test.js`: assert stock page loader only calls stock/products APIs.
- Modify `frontend/src/pos/store.jsx`: add stock movement state/actions.
- Create `frontend/src/stock/movement-preview.js`: pure quantity parsing and stock-after preview helpers.
- Create `frontend/src/stock/movement-preview.test.js`: preview and thousand separator tests.
- Create `frontend/src/pages/StockPage.jsx`: route page, filters, movement table, and new movement dialog.
- Modify `frontend/src/components/page-loading.jsx`: add `StockPageSkeleton`.
- Modify `frontend/src/shared.jsx`: add `/stock` route and sidebar item between Products and Transactions.
- Modify `frontend/src/App.jsx`: add Stock route.
- Modify `frontend/src/pages/DesignSystemPage.jsx`: document the Stock operational table and movement dialog if the page introduces new composition details.
- Modify `frontend/DESIGN.md`: document Stock page layout, movement dialog, success/danger delta tones, and number formatting.

---

## Task 1: Migration And Contract

**Files:**
- Create: `backend/migrations/000007_stock_movements.up.sql`
- Create: `backend/migrations/000007_stock_movements.down.sql`
- Modify: `backend/Makefile`
- Modify: `backend/README.md`
- Modify: `backend/internal/integration/migration_forward_fix_test.go`

- [ ] **Step 1: Add migration contract test**

Add a test in `backend/internal/integration/migration_forward_fix_test.go`:

```go
func TestStockMovementsMigrationContract(t *testing.T) {
	path := filepath.Join("..", "..", "migrations", "000007_stock_movements.up.sql")
	sqlBytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	sql := strings.ToLower(string(sqlBytes))

	required := []string{
		"create table if not exists stock_movements",
		"product_id uuid not null references products(id)",
		"type text not null",
		"quantity_delta integer not null",
		"stock_before integer not null",
		"stock_after integer not null",
		"created_by_user_id text not null",
		"check (type in ('sale', 'restock', 'reduce', 'set_exact'))",
		"check (quantity_delta <> 0)",
		"alter table stock_movements enable row level security",
		"alter table stock_movements force row level security",
		"create index if not exists stock_movements_org_cursor_idx",
		"create index if not exists stock_movements_org_product_cursor_idx",
		"create index if not exists stock_movements_org_type_cursor_idx",
		"grant select, insert on stock_movements to balanja_api",
	}

	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Fatalf("migration missing fragment %q", fragment)
		}
	}
}
```

- [ ] **Step 2: Run the focused failing test**

Run:

```bash
cd backend
go test ./internal/integration -run TestStockMovementsMigrationContract
```

Expected: FAIL because `000007_stock_movements.up.sql` does not exist yet.

- [ ] **Step 3: Create the stock movement migration**

Create `backend/migrations/000007_stock_movements.up.sql`:

```sql
begin;

do $$
begin
  create role balanja_api nologin nobypassrls;
exception
  when duplicate_object then null;
end $$;

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  product_id uuid not null references products(id),
  type text not null,
  quantity_delta integer not null,
  stock_before integer not null,
  stock_after integer not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  check (type in ('sale', 'restock', 'reduce', 'set_exact')),
  check (quantity_delta <> 0),
  check (stock_before >= 0),
  check (stock_after >= 0),
  check (btrim(reason) <> '')
);

create index if not exists stock_movements_org_cursor_idx
  on stock_movements (org_id, created_at desc, id desc);

create index if not exists stock_movements_org_product_cursor_idx
  on stock_movements (org_id, product_id, created_at desc, id desc);

create index if not exists stock_movements_org_type_cursor_idx
  on stock_movements (org_id, type, created_at desc, id desc);

alter table stock_movements enable row level security;
alter table stock_movements force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_movements'
      and policyname = 'stock_movements_org_isolation'
  ) then
    create policy stock_movements_org_isolation on stock_movements
      using (org_id = current_setting('app.org_id', true))
      with check (org_id = current_setting('app.org_id', true));
  end if;
end $$;

grant usage on schema public to balanja_api;
grant select, insert on stock_movements to balanja_api;

commit;
```

Create `backend/migrations/000007_stock_movements.down.sql`:

```sql
-- Stock movements are an audit ledger. Keep this forward-fix migration irreversible
-- to avoid deleting inventory history during local repair flows.
select 1;
```

- [ ] **Step 4: Update migration command helpers**

In `backend/Makefile`, update the migration target list to include `000007` and add:

```make
.PHONY: migrate-fix-0007
migrate-fix-0007:
	$(MIGRATE) -path migrations -database "$(DATABASE_URL)" force 6
	$(MIGRATE) -path migrations -database "$(DATABASE_URL)" up
```

In `backend/README.md`, add the repair command near the existing migration repair notes:

If migration `000007_stock_movements` is marked dirty during local development:

```bash
make migrate-fix-0007
```

- [ ] **Step 5: Run migration contract tests**

Run:

```bash
cd backend
go test ./internal/integration -run 'Test.*Migration.*'
```

Expected: PASS.

- [ ] **Step 6: Commit migration work**

Run:

```bash
git add backend/migrations/000007_stock_movements.up.sql backend/migrations/000007_stock_movements.down.sql backend/Makefile backend/README.md backend/internal/integration/migration_forward_fix_test.go
git commit -m "feat: add stock movement ledger migration"
```

---

## Task 2: Backend Stock Service

**Files:**
- Create: `backend/internal/stock/model.go`
- Create: `backend/internal/stock/service.go`
- Create: `backend/internal/stock/repository.go`
- Create: `backend/internal/stock/handler.go`
- Create: `backend/internal/stock/service_test.go`
- Modify: `backend/cmd/api/main.go`

- [ ] **Step 1: Add stock service tests**

Create `backend/internal/stock/service_test.go`:

```go
package stock

import (
	"context"
	"errors"
	"testing"
	"time"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

func TestResolveManualMovement(t *testing.T) {
	tests := []struct {
		name        string
		movement    MovementType
		current     int
		quantity    int
		wantDelta   int
		wantAfter   int
		wantErr     error
	}{
		{name: "restock", movement: MovementTypeRestock, current: 7, quantity: 5, wantDelta: 5, wantAfter: 12},
		{name: "reduce", movement: MovementTypeReduce, current: 7, quantity: 5, wantDelta: -5, wantAfter: 2},
		{name: "set exact", movement: MovementTypeSetExact, current: 7, quantity: 3, wantDelta: -4, wantAfter: 3},
		{name: "negative final stock", movement: MovementTypeReduce, current: 3, quantity: 4, wantErr: ErrInsufficientStock},
		{name: "zero restock", movement: MovementTypeRestock, current: 3, quantity: 0, wantErr: ErrInvalidStockMovement},
		{name: "set exact no-op", movement: MovementTypeSetExact, current: 3, quantity: 3, wantErr: ErrInvalidStockMovement},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			delta, after, err := resolveManualMovement(tt.movement, tt.current, tt.quantity)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("err = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected err: %v", err)
			}
			if delta != tt.wantDelta || after != tt.wantAfter {
				t.Fatalf("delta/after = %d/%d, want %d/%d", delta, after, tt.wantDelta, tt.wantAfter)
			}
		})
	}
}

func TestServiceRejectsInactiveProduct(t *testing.T) {
	repo := &fakeRepository{
		product: LockedProduct{
			ID:        uuid.New(),
			Name:      "Tea",
			Stock:     10,
			IsActive:  false,
			UpdatedAt: time.Now(),
		},
	}
	service := NewService(fakeRunner{repo: repo}, repo)

	_, err := service.CreateManualMovement(context.Background(), database.Identity{OrgID: "org-1", UserID: "user-1"}, CreateMovementInput{
		ProductID: repo.product.ID,
		Type:      MovementTypeRestock,
		Quantity:  1,
		Reason:    "Stock count",
	})
	if !errors.Is(err, ErrProductInactive) {
		t.Fatalf("err = %v, want %v", err, ErrProductInactive)
	}
}
```

Extend the same file with fakes:

```go
type fakeRunner struct {
	repo *fakeRepository
}

func (f fakeRunner) Run(ctx context.Context, identity database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeRepository struct {
	product LockedProduct
}

func (f *fakeRepository) CreateManualMovement(ctx context.Context, tx database.Tx, identity database.Identity, input CreateMovementInput) (CreateMovementResult, error) {
	delta, after, err := resolveManualMovement(input.Type, f.product.Stock, input.Quantity)
	if err != nil {
		return CreateMovementResult{}, err
	}
	if !f.product.IsActive {
		return CreateMovementResult{}, ErrProductInactive
	}
	return CreateMovementResult{
		Movement: Movement{
			ID:              uuid.New(),
			OrgID:           identity.OrgID,
			ProductID:       input.ProductID,
			Type:            input.Type,
			QuantityDelta:   delta,
			StockBefore:     f.product.Stock,
			StockAfter:      after,
			Reason:          input.Reason,
			CreatedByUserID: identity.UserID,
			CreatedAt:       time.Now(),
		},
		Product: ProductStock{ID: input.ProductID, Stock: after, UpdatedAt: time.Now()},
	}, nil
}

func (f *fakeRepository) ListMovements(ctx context.Context, tx database.Tx, identity database.Identity, filter ListFilter) (MovementPage, error) {
	return MovementPage{}, nil
}
```

- [ ] **Step 2: Run failing stock package tests**

Run:

```bash
cd backend
go test ./internal/stock
```

Expected: FAIL because the `stock` package implementation does not exist yet.

- [ ] **Step 3: Add stock models**

Create `backend/internal/stock/model.go`:

```go
package stock

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type MovementType string

const (
	MovementTypeSale     MovementType = "sale"
	MovementTypeRestock  MovementType = "restock"
	MovementTypeReduce   MovementType = "reduce"
	MovementTypeSetExact MovementType = "set_exact"
)

var (
	ErrInvalidStockMovement = errors.New("invalid stock movement")
	ErrProductNotFound      = errors.New("product not found")
	ErrProductInactive      = errors.New("product inactive")
	ErrInsufficientStock    = errors.New("insufficient stock")
)

type Movement struct {
	ID              uuid.UUID    `json:"id"`
	OrgID           string       `json:"-"`
	ProductID       uuid.UUID    `json:"productId"`
	ProductName     string       `json:"productName"`
	ProductBarcode  string       `json:"productBarcode"`
	ProductCategory string       `json:"productCategory"`
	ProductUnit     string       `json:"productUnit"`
	Type            MovementType `json:"type"`
	QuantityDelta   int          `json:"quantityDelta"`
	StockBefore     int          `json:"stockBefore"`
	StockAfter      int          `json:"stockAfter"`
	Reason          string       `json:"reason"`
	ReferenceType   *string      `json:"referenceType,omitempty"`
	ReferenceID     *uuid.UUID   `json:"referenceId,omitempty"`
	CreatedByUserID string       `json:"createdByUserId"`
	CreatedAt       time.Time    `json:"createdAt"`
}

type CreateMovementInput struct {
	ProductID uuid.UUID    `json:"productId"`
	Type      MovementType `json:"type"`
	Quantity  int          `json:"quantity"`
	Reason    string       `json:"reason"`
}

type ProductStock struct {
	ID        uuid.UUID `json:"id"`
	Stock     int       `json:"stock"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateMovementResult struct {
	Movement Movement     `json:"movement"`
	Product  ProductStock `json:"product"`
}

type ListFilter struct {
	ProductID *uuid.UUID
	Type      MovementType
	Query     string
	DateFrom  *time.Time
	DateTo    *time.Time
	Cursor    string
	Limit     int
}

type MovementPage struct {
	Items      []Movement `json:"items"`
	NextCursor string     `json:"nextCursor,omitempty"`
}

type LockedProduct struct {
	ID        uuid.UUID
	Name      string
	Stock     int
	IsActive  bool
	UpdatedAt time.Time
}
```

- [ ] **Step 4: Add stock service**

Create `backend/internal/stock/service.go`:

```go
package stock

import (
	"context"
	"strings"

	"balanja/backend/internal/platform/database"
)

const defaultListLimit = 50
const maxListLimit = 100

type TenantRunner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	CreateManualMovement(context.Context, database.Tx, database.Identity, CreateMovementInput) (CreateMovementResult, error)
	ListMovements(context.Context, database.Tx, database.Identity, ListFilter) (MovementPage, error)
}

type Service struct {
	runner TenantRunner
	repo   Repository
}

func NewService(runner TenantRunner, repo Repository) *Service {
	return &Service{runner: runner, repo: repo}
}

func (s *Service) CreateManualMovement(ctx context.Context, identity database.Identity, input CreateMovementInput) (CreateMovementResult, error) {
	input.Reason = strings.TrimSpace(input.Reason)
	if input.ProductID.String() == "" || input.Reason == "" {
		return CreateMovementResult{}, ErrInvalidStockMovement
	}
	if input.Type != MovementTypeRestock && input.Type != MovementTypeReduce && input.Type != MovementTypeSetExact {
		return CreateMovementResult{}, ErrInvalidStockMovement
	}
	if input.Type != MovementTypeSetExact && input.Quantity <= 0 {
		return CreateMovementResult{}, ErrInvalidStockMovement
	}
	if input.Type == MovementTypeSetExact && input.Quantity < 0 {
		return CreateMovementResult{}, ErrInvalidStockMovement
	}

	var result CreateMovementResult
	err := s.runner.Run(ctx, identity, func(tx database.Tx) error {
		created, err := s.repo.CreateManualMovement(ctx, tx, identity, input)
		if err != nil {
			return err
		}
		result = created
		return nil
	})
	return result, err
}

func (s *Service) ListMovements(ctx context.Context, identity database.Identity, filter ListFilter) (MovementPage, error) {
	if filter.Limit <= 0 {
		filter.Limit = defaultListLimit
	}
	if filter.Limit > maxListLimit {
		filter.Limit = maxListLimit
	}
	filter.Query = strings.TrimSpace(filter.Query)

	var page MovementPage
	err := s.runner.Run(ctx, identity, func(tx database.Tx) error {
		result, err := s.repo.ListMovements(ctx, tx, identity, filter)
		if err != nil {
			return err
		}
		page = result
		return nil
	})
	return page, err
}

func resolveManualMovement(movementType MovementType, currentStock int, quantity int) (int, int, error) {
	var delta int
	switch movementType {
	case MovementTypeRestock:
		if quantity <= 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = quantity
	case MovementTypeReduce:
		if quantity <= 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = -quantity
	case MovementTypeSetExact:
		if quantity < 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = quantity - currentStock
	default:
		return 0, 0, ErrInvalidStockMovement
	}

	after := currentStock + delta
	if after < 0 {
		return 0, 0, ErrInsufficientStock
	}
	if delta == 0 {
		return 0, 0, ErrInvalidStockMovement
	}
	return delta, after, nil
}
```

- [ ] **Step 5: Add PostgreSQL repository**

Create `backend/internal/stock/repository.go` with these responsibilities:

```go
package stock

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type PostgresRepository struct{}

func (PostgresRepository) CreateManualMovement(ctx context.Context, tx database.Tx, identity database.Identity, input CreateMovementInput) (CreateMovementResult, error) {
	product, err := lockProduct(ctx, tx, identity.OrgID, input.ProductID)
	if err != nil {
		return CreateMovementResult{}, err
	}
	if !product.IsActive {
		return CreateMovementResult{}, ErrProductInactive
	}

	delta, after, err := resolveManualMovement(input.Type, product.Stock, input.Quantity)
	if err != nil {
		return CreateMovementResult{}, err
	}

	updated, err := updateProductStock(ctx, tx, identity.OrgID, input.ProductID, after)
	if err != nil {
		return CreateMovementResult{}, err
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
		return CreateMovementResult{}, err
	}
	return CreateMovementResult{Movement: movement, Product: updated}, nil
}
```

Add the core SQL helpers in the same file:

```go
func lockProduct(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID) (LockedProduct, error) {
	var product LockedProduct
	err := tx.QueryRow(ctx, `
		select id, name, stock, active, updated_at
		from products
		where org_id = $1 and id = $2
		for update
	`, orgID, productID).Scan(&product.ID, &product.Name, &product.Stock, &product.IsActive, &product.UpdatedAt)
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
	err := tx.QueryRow(ctx, `
		update products
		set stock = $3, updated_at = now()
		where org_id = $1 and id = $2
		returning id, stock, updated_at
	`, orgID, productID, stock).Scan(&updated.ID, &updated.Stock, &updated.UpdatedAt)
	if err != nil {
		return ProductStock{}, fmt.Errorf("update product stock: %w", err)
	}
	return updated, nil
}
```

Add movement insert and list methods:

```go
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
		insert into stock_movements (
			org_id, product_id, type, quantity_delta, stock_before, stock_after,
			reason, reference_type, reference_id, created_by_user_id
		)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		returning id, org_id, product_id, type, quantity_delta, stock_before, stock_after,
			reason, reference_type, reference_id, created_by_user_id, created_at
	`, input.OrgID, input.ProductID, input.Type, input.QuantityDelta, input.StockBefore, input.StockAfter,
		input.Reason, input.ReferenceType, input.ReferenceID, input.CreatedByUserID).Scan(
		&movement.ID, &movement.OrgID, &movement.ProductID, &movement.Type, &movement.QuantityDelta,
		&movement.StockBefore, &movement.StockAfter, &movement.Reason, &movement.ReferenceType,
		&movement.ReferenceID, &movement.CreatedByUserID, &movement.CreatedAt,
	)
	if err != nil {
		return Movement{}, fmt.Errorf("insert stock movement: %w", err)
	}
	return movement, nil
}

func (PostgresRepository) ListMovements(ctx context.Context, tx database.Tx, identity database.Identity, filter ListFilter) (MovementPage, error) {
	cursorTime, cursorID, err := decodeCursor(filter.Cursor)
	if err != nil {
		return MovementPage{}, ErrInvalidStockMovement
	}

	rows, err := tx.Query(ctx, `
		select sm.id, sm.org_id, sm.product_id, coalesce(p.name, ''), coalesce(p.barcode, ''),
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
	`, identity.OrgID, filter.ProductID, string(filter.Type), filter.Query, filter.DateFrom, filter.DateTo, cursorTime, cursorID, filter.Limit+1)
	if err != nil {
		return MovementPage{}, fmt.Errorf("list stock movements: %w", err)
	}
	defer rows.Close()

	items := make([]Movement, 0, filter.Limit)
	for rows.Next() {
		var movement Movement
		if err := rows.Scan(&movement.ID, &movement.OrgID, &movement.ProductID, &movement.ProductName,
			&movement.ProductBarcode, &movement.ProductCategory, &movement.ProductUnit, &movement.Type,
			&movement.QuantityDelta, &movement.StockBefore, &movement.StockAfter, &movement.Reason,
			&movement.ReferenceType, &movement.ReferenceID, &movement.CreatedByUserID, &movement.CreatedAt); err != nil {
			return MovementPage{}, fmt.Errorf("scan stock movement: %w", err)
		}
		items = append(items, movement)
	}
	if err := rows.Err(); err != nil {
		return MovementPage{}, fmt.Errorf("iterate stock movements: %w", err)
	}

	page := MovementPage{Items: items}
	if len(items) > filter.Limit {
		last := items[filter.Limit-1]
		page.Items = items[:filter.Limit]
		page.NextCursor = encodeCursor(last.CreatedAt, last.ID)
	}
	return page, nil
}
```

Add cursor helpers:

```go
func encodeCursor(createdAt time.Time, id uuid.UUID) string {
	raw := createdAt.UTC().Format(time.RFC3339Nano) + "|" + id.String()
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeCursor(cursor string) (*time.Time, *uuid.UUID, error) {
	if strings.TrimSpace(cursor) == "" {
		return nil, nil, nil
	}
	decoded, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, nil, err
	}
	parts := strings.Split(string(decoded), "|")
	if len(parts) != 2 {
		return nil, nil, strconv.ErrSyntax
	}
	createdAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, nil, err
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		return nil, nil, err
	}
	return &createdAt, &id, nil
}
```

- [ ] **Step 6: Add HTTP handler**

Create `backend/internal/stock/handler.go`:

```go
package stock

import (
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(group fiber.Router) {
	group.Get("/stock/movements", h.listMovements)
	group.Post("/stock/movements", h.createMovement)
}

func (h *Handler) listMovements(c fiber.Ctx) error {
	identity, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	filter, err := parseListFilter(c)
	if err != nil {
		return respond.Error(c, apperror.New(422, "INVALID_STOCK_MOVEMENT", "Invalid stock movement filter"))
	}
	page, err := h.service.ListMovements(c.Context(), identity, filter)
	if err != nil {
		return stockError(c, err)
	}
	return c.JSON(fiber.Map{"data": page})
}

func (h *Handler) createMovement(c fiber.Ctx) error {
	identity, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	var input CreateMovementInput
	if err := json.Unmarshal(c.Body(), &input); err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_JSON", "request body is invalid"))
	}
	result, err := h.service.CreateManualMovement(c.Context(), identity, input)
	if err != nil {
		return stockError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}
```

Implement request and error helpers in the same file using the same auth/respond pattern as `backend/internal/product/handler.go`:

```go
func identity(c fiber.Ctx) (database.Identity, error) {
	id, ok := auth.FromContext(c)
	if !ok {
		return database.Identity{}, apperror.New(401, "AUTH_REQUIRED", "authentication is required")
	}
	return database.Identity{OrgID: id.OrgID, UserID: id.UserID}, nil
}

func parseListFilter(c fiber.Ctx) (ListFilter, error) {
	filter := ListFilter{
		Type:   MovementType(c.Query("type")),
		Query:  c.Query("q"),
		Cursor: c.Query("cursor"),
	}
	if raw := c.Query("productId"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.ProductID = &id
	}
	if raw := c.Query("dateFrom"); raw != "" {
		value, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.DateFrom = &value
	}
	if raw := c.Query("dateTo"); raw != "" {
		value, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.DateTo = &value
	}
	if raw := c.Query("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.Limit = limit
	}
	return filter, nil
}

func stockError(c fiber.Ctx, err error) error {
	if errors.Is(err, ErrProductNotFound) {
		return respond.Error(c, apperror.New(404, "PRODUCT_NOT_FOUND", "product was not found"))
	}
	if errors.Is(err, ErrProductInactive) {
		return respond.Error(c, apperror.New(409, "PRODUCT_INACTIVE", "product is inactive"))
	}
	if errors.Is(err, ErrInsufficientStock) {
		return respond.Error(c, apperror.New(409, "INSUFFICIENT_STOCK", "stock would become negative"))
	}
	if errors.Is(err, ErrInvalidStockMovement) {
		return respond.Error(c, apperror.New(422, "INVALID_STOCK_MOVEMENT", "stock movement is invalid"))
	}
	return respond.Error(c, err)
}
```

- [ ] **Step 7: Wire handler in API main**

Modify `backend/cmd/api/main.go` imports to include:

```go
"balanja/backend/internal/stock"
```

Register the handler with the same tenant runner used by products and checkout:

```go
stockHandler := stock.NewHandler(stock.NewService(runner, stock.PostgresRepository{}))
stockHandler.Register(router)
```

- [ ] **Step 8: Run stock backend tests**

Run:

```bash
cd backend
gofmt -w internal/stock cmd/api/main.go
go test ./internal/stock
go test ./cmd/api ./internal/product ./internal/transaction ./internal/checkout
```

Expected: PASS.

- [ ] **Step 9: Commit stock backend API**

Run:

```bash
git add backend/internal/stock backend/cmd/api/main.go
git commit -m "feat: add stock movement API"
```

---

## Task 3: Checkout Sale Movement Integration

**Files:**
- Modify: `backend/internal/checkout/repository.go`
- Modify: `backend/internal/integration/checkout_test.go`

- [ ] **Step 1: Add checkout integration assertion**

In `backend/internal/integration/checkout_test.go`, extend the successful checkout test after checkout completion:

```go
var movementCount int
err = db.QueryRow(ctx, `
	select count(*)
	from stock_movements
	where org_id = $1
		and reference_type = 'checkout'
		and reference_id = $2
		and type = 'sale'
`, orgID, result.Transaction.ID).Scan(&movementCount)
if err != nil {
	t.Fatalf("count sale movements: %v", err)
}
if movementCount != len(input.Items) {
	t.Fatalf("sale movement count = %d, want %d", movementCount, len(input.Items))
}
```

- [ ] **Step 2: Run focused integration test**

Run:

```bash
cd backend
go test -tags=integration ./internal/integration -run TestCheckout
```

Expected: FAIL because checkout does not insert sale stock movements yet.

- [ ] **Step 3: Insert sale movements in checkout repository**

In `backend/internal/checkout/repository.go`, locate the product stock update loop after transaction insertion. Replace the direct decrement-only logic with before/after movement insertion:

```go
referenceType := "checkout"
for _, requested := range input.Items {
	locked := products[requested.ProductID]
	before := locked.Stock
	after := before - requested.Quantity
	if after < 0 {
		return Result{}, ErrInsufficientStock
	}

	var stock ProductStock
	if err := tx.QueryRow(ctx, `
		update products
		set stock = $3, updated_at = now()
		where org_id = $1 and id = $2
		returning id, stock, updated_at
	`, id.OrgID, requested.ProductID, after).Scan(&stock.ID, &stock.Stock, &stock.UpdatedAt); err != nil {
		return Result{}, fmt.Errorf("update product stock: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into stock_movements (
			org_id, product_id, type, quantity_delta, stock_before, stock_after,
			reason, reference_type, reference_id, created_by_user_id
		)
		values ($1,$2,'sale',$3,$4,$5,$6,$7,$8,$9)
	`, id.OrgID, requested.ProductID, -requested.Quantity, before, after,
		"Completed sale "+transaction.Number, referenceType, transaction.ID, id.UserID); err != nil {
		return Result{}, fmt.Errorf("insert sale stock movement: %w", err)
	}

	result.Products = append(result.Products, stock)
}
```

Keep the existing row locking before transaction creation. Do not add a separate stock service call here because checkout already owns one tenant transaction and must keep the sale movement insert atomic with transaction creation.

- [ ] **Step 4: Run checkout tests**

Run:

```bash
cd backend
gofmt -w internal/checkout/repository.go internal/integration/checkout_test.go
go test ./internal/checkout
go test -tags=integration ./internal/integration -run TestCheckout
```

Expected: PASS when the test database has migration `000007` applied.

- [ ] **Step 5: Commit checkout ledger integration**

Run:

```bash
git add backend/internal/checkout/repository.go backend/internal/integration/checkout_test.go
git commit -m "feat: record checkout stock movements"
```

---

## Task 4: Frontend Stock Data Layer

**Files:**
- Modify: `frontend/src/pos/api-client.js`
- Modify: `frontend/src/pos/api-client.test.js`
- Modify: `frontend/src/pos/store-data.js`
- Modify: `frontend/src/pos/store-data.test.js`
- Modify: `frontend/src/pos/store.jsx`
- Create: `frontend/src/stock/movement-preview.js`
- Create: `frontend/src/stock/movement-preview.test.js`

- [ ] **Step 1: Add API client tests**

In `frontend/src/pos/api-client.test.js`, add:

```js
test("listStockMovements sends only stock movement query params", async () => {
  const fetchMock = createFetchMock({
    items: [],
    nextCursor: "next",
  })
  const client = createApiClient({ fetchImpl: fetchMock, baseUrl: "/api/v1" })

  await client.listStockMovements({
    q: "tea",
    type: "restock",
    productId: "product-1",
    dateFrom: "2026-07-01T00:00:00Z",
    dateTo: "2026-07-13T23:59:59Z",
    cursor: "cursor-1",
    limit: 25,
  })

  expect(fetchMock.calls[0].url).toBe(
    "/api/v1/stock/movements?q=tea&type=restock&productId=product-1&dateFrom=2026-07-01T00%3A00%3A00Z&dateTo=2026-07-13T23%3A59%3A59Z&cursor=cursor-1&limit=25"
  )
})

test("createStockMovement posts manual movement payload", async () => {
  const fetchMock = createFetchMock({
    movement: { id: "movement-1" },
    product: { id: "product-1", stock: 14 },
  })
  const client = createApiClient({ fetchImpl: fetchMock, baseUrl: "/api/v1" })

  await client.createStockMovement({
    productId: "product-1",
    type: "restock",
    quantity: 4,
    reason: "Supplier delivery",
  })

  expect(fetchMock.calls[0].url).toBe("/api/v1/stock/movements")
  expect(fetchMock.calls[0].options.method).toBe("POST")
  expect(JSON.parse(fetchMock.calls[0].options.body)).toEqual({
    productId: "product-1",
    type: "restock",
    quantity: 4,
    reason: "Supplier delivery",
  })
})
```

- [ ] **Step 2: Run failing frontend data tests**

Run:

```bash
cd frontend
npm run test -- src/pos/api-client.test.js
```

Expected: FAIL because stock API client methods do not exist yet.

- [ ] **Step 3: Implement API client methods**

In `frontend/src/pos/api-client.js`, add:

```js
const STOCK_MOVEMENT_FILTER_KEYS = [
  "q",
  "type",
  "productId",
  "dateFrom",
  "dateTo",
  "cursor",
  "limit",
]

function toQueryString(filters = {}) {
  const params = new URLSearchParams()
  for (const key of STOCK_MOVEMENT_FILTER_KEYS) {
    const value = filters[key]
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}
```

Add methods to the returned client object:

```js
listStockMovements(filters = {}, options = {}) {
  return request(`/stock/movements${toQueryString(filters)}`, {
    ...options,
    method: "GET",
  })
},

createStockMovement(input, options = {}) {
  return request("/stock/movements", {
    ...options,
    method: "POST",
    body: JSON.stringify(input),
  })
},
```

- [ ] **Step 4: Add movement preview tests**

Create `frontend/src/stock/movement-preview.test.js`:

```js
import test from "node:test"
import assert from "node:assert/strict"

import { calculateStockPreview, parseQuantityInput } from "./movement-preview.js"

test("parseQuantityInput strips thousand separators", () => {
  assert.equal(parseQuantityInput("1,250"), 1250)
  assert.equal(parseQuantityInput("1.250"), 1250)
  assert.equal(parseQuantityInput("12 500"), 12500)
})

test("calculateStockPreview handles restock reduce and set exact", () => {
  assert.deepEqual(calculateStockPreview({ type: "restock", currentStock: 10, quantity: 4 }), {
    delta: 4,
    stockAfter: 14,
    isValid: true,
  })
  assert.deepEqual(calculateStockPreview({ type: "reduce", currentStock: 10, quantity: 4 }), {
    delta: -4,
    stockAfter: 6,
    isValid: true,
  })
  assert.deepEqual(calculateStockPreview({ type: "set_exact", currentStock: 10, quantity: 4 }), {
    delta: -6,
    stockAfter: 4,
    isValid: true,
  })
})

test("calculateStockPreview rejects negative final stock and no-op set exact", () => {
  assert.equal(calculateStockPreview({ type: "reduce", currentStock: 3, quantity: 4 }).isValid, false)
  assert.equal(calculateStockPreview({ type: "set_exact", currentStock: 3, quantity: 3 }).isValid, false)
})
```

- [ ] **Step 5: Implement movement preview helpers**

Create `frontend/src/stock/movement-preview.js`:

```js
export function parseQuantityInput(value) {
  const normalized = String(value ?? "").replace(/[.,\s]/g, "")
  if (!normalized) return 0
  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateStockPreview({ type, currentStock, quantity }) {
  const stock = Number(currentStock) || 0
  const amount = Number(quantity) || 0
  let delta = 0

  if (type === "restock") delta = amount
  if (type === "reduce") delta = -amount
  if (type === "set_exact") delta = amount - stock

  const stockAfter = stock + delta
  const isPositiveInput = type === "set_exact" ? amount >= 0 : amount > 0
  const isValid = isPositiveInput && stockAfter >= 0 && delta !== 0

  return { delta, stockAfter, isValid }
}
```

- [ ] **Step 6: Add store-data tests**

In `frontend/src/pos/store-data.test.js`, add:

```js
test("loadStockMovements calls only stock movement API", async () => {
  const calls = []
  const api = {
    listStockMovements: async (filters) => {
      calls.push(["listStockMovements", filters])
      return { items: [{ id: "movement-1", quantityDelta: 5 }], nextCursor: "next" }
    },
  }

  const result = await loadStockMovements(api, { q: "tea" })

  assert.deepEqual(calls, [["listStockMovements", { q: "tea" }]])
  assert.equal(result.items[0].id, "movement-1")
  assert.equal(result.nextCursor, "next")
})
```

- [ ] **Step 7: Implement stock movement loader**

In `frontend/src/pos/store-data.js`, export:

```js
export async function loadStockMovements(api, filters = {}) {
  const page = await api.listStockMovements(filters)
  return {
    items: Array.isArray(page.items) ? page.items.map(normalizeStockMovement) : [],
    nextCursor: page.nextCursor || "",
  }
}

export function normalizeStockMovement(movement) {
  return {
    id: movement.id,
    productId: movement.productId,
    productName: movement.productName || "Unknown product",
    productBarcode: movement.productBarcode || "",
    productCategory: movement.productCategory || "",
    productUnit: movement.productUnit || "pcs",
    type: movement.type,
    quantityDelta: Number(movement.quantityDelta) || 0,
    stockBefore: Number(movement.stockBefore) || 0,
    stockAfter: Number(movement.stockAfter) || 0,
    reason: movement.reason || "",
    referenceType: movement.referenceType || "",
    referenceId: movement.referenceId || "",
    createdByUserId: movement.createdByUserId || "",
    createdAt: movement.createdAt,
  }
}
```

- [ ] **Step 8: Add store state and actions**

In `frontend/src/pos/store.jsx`, import `loadStockMovements` and add initial state:

```js
stockMovements: [],
stockMovementCursor: "",
stockMovementFilters: {},
```

Add loading flags:

```js
stockMovements: false,
```

Add methods:

```js
loadStockMovements: async (filters = {}) => {
  set((state) => ({ loading: { ...state.loading, stockMovements: true } }))
  try {
    const page = await loadStockMovements(api, filters)
    set((state) => ({
      stockMovements: page.items,
      stockMovementCursor: page.nextCursor,
      stockMovementFilters: filters,
      loading: { ...state.loading, stockMovements: false },
    }))
    return page
  } catch (error) {
    set((state) => ({ loading: { ...state.loading, stockMovements: false } }))
    throw error
  }
},

createStockMovement: async (input) => {
  const result = await api.createStockMovement(input)
  set((state) => ({
    products: state.products.map((product) =>
      product.id === result.product.id ? { ...product, stock: result.product.stock } : product
    ),
  }))
  await get().loadStockMovements(get().stockMovementFilters)
  return result
},
```

Use the store’s existing `set/get/api` style exactly as implemented in the current file.

- [ ] **Step 9: Run frontend data tests**

Run:

```bash
cd frontend
npm run test -- src/pos/api-client.test.js src/pos/store-data.test.js src/stock/movement-preview.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit frontend data layer**

Run:

```bash
git add frontend/src/pos/api-client.js frontend/src/pos/api-client.test.js frontend/src/pos/store-data.js frontend/src/pos/store-data.test.js frontend/src/pos/store.jsx frontend/src/stock/movement-preview.js frontend/src/stock/movement-preview.test.js
git commit -m "feat: add stock movement data layer"
```

---

## Task 5: Stock Page Route And UI

**Files:**
- Create: `frontend/src/pages/StockPage.jsx`
- Modify: `frontend/src/components/page-loading.jsx`
- Modify: `frontend/src/shared.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add route tests**

In `frontend/src/components/AppShell.test.js`, extend navigation assertions to include:

```js
assert.match(markup, /Stock/)
assert.match(markup, /href="\/stock"/)
```

- [ ] **Step 2: Add Stock route and sidebar item**

In `frontend/src/shared.jsx`, add:

```js
stock: "/stock",
```

Add the Retail nav item between Products and Transactions:

```js
["Stock", "package", routes.stock],
```

In `frontend/src/App.jsx`, import and route:

```jsx
import StockPage from "./pages/StockPage.jsx"
```

```jsx
<Route path={routes.stock} element={<StockPage />} />
```

- [ ] **Step 3: Add Stock page skeleton**

In `frontend/src/components/page-loading.jsx`, add:

```jsx
export function StockPageSkeleton() {
  return (
    <section className="space-y-5" aria-label="Loading stock">
      <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-9 w-48 rounded-2xl" />
          </div>
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>
      <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
        <Skeleton className="mb-4 h-11 w-full rounded-2xl" />
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Create Stock page**

Create `frontend/src/pages/StockPage.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react"

import { Badge, Button, Card, Input, SelectField } from "../components/primitives.jsx"
import { StockPageSkeleton } from "../components/page-loading.jsx"
import { calculateStockPreview, parseQuantityInput } from "../stock/movement-preview.js"
import { usePOSStore } from "../pos/store.jsx"

const typeLabels = {
  sale: "Sale",
  restock: "Restock",
  reduce: "Reduce",
  set_exact: "Set exact",
}

const movementOptions = [
  { value: "restock", label: "Restock" },
  { value: "reduce", label: "Reduce" },
  { value: "set_exact", label: "Set exact stock" },
]

const numberFormatter = new Intl.NumberFormat("id-ID")

export default function StockPage() {
  const products = usePOSStore((state) => state.products)
  const movements = usePOSStore((state) => state.stockMovements)
  const loading = usePOSStore((state) => state.loading.stockMovements || state.loading.products)
  const loadProducts = usePOSStore((state) => state.loadProducts)
  const loadStockMovements = usePOSStore((state) => state.loadStockMovements)
  const createStockMovement = usePOSStore((state) => state.createStockMovement)
  const [filters, setFilters] = useState({ q: "", type: "" })
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadProducts()
    loadStockMovements(filters)
  }, [])

  function applyFilters(nextFilters) {
    setFilters(nextFilters)
    loadStockMovements(nextFilters)
  }

  return (
    <section className="space-y-5">
      <header className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Inventory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Stock</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Manage restocks, reductions, exact stock corrections, and sale movement history.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            New movement
          </Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Input
            value={filters.q}
            onChange={(event) => applyFilters({ ...filters, q: event.target.value })}
            placeholder="Search product, barcode, or category"
          />
          <SelectField
            value={filters.type}
            onChange={(event) => applyFilters({ ...filters, type: event.target.value })}
          >
            <option value="">All movement types</option>
            <option value="sale">Sale</option>
            <option value="restock">Restock</option>
            <option value="reduce">Reduce</option>
            <option value="set_exact">Set exact</option>
          </SelectField>
        </div>
      </Card>

      {loading ? <StockPageSkeleton /> : <MovementTable movements={movements} />}
      {dialogOpen ? (
        <MovementDialog
          products={products.filter((product) => product.isActive)}
          onClose={() => setDialogOpen(false)}
          onSubmit={async (input) => {
            await createStockMovement(input)
            setDialogOpen(false)
          }}
        />
      ) : null}
    </section>
  )
}
```

Add table and dialog components in the same file:

```jsx
function MovementTable({ movements }) {
  if (!movements.length) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">No stock movements yet</h2>
        <p className="mt-2 text-sm text-slate-600">Create a manual movement or complete a sale to populate history.</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Delta</th>
              <th className="px-5 py-4">Before - After</th>
              <th className="px-5 py-4">Reason</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((movement) => (
              <tr key={movement.id} className="bg-white">
                <td className="px-5 py-4 text-slate-600">{formatDate(movement.createdAt)}</td>
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-950">{movement.productName}</div>
                  <div className="text-xs text-slate-500">{movement.productBarcode || movement.productCategory || "No barcode"}</div>
                </td>
                <td className="px-5 py-4"><MovementBadge type={movement.type} /></td>
                <td className={`px-5 py-4 font-semibold ${movement.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {movement.quantityDelta > 0 ? "+" : ""}{numberFormatter.format(movement.quantityDelta)}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {numberFormatter.format(movement.stockBefore)} - {numberFormatter.format(movement.stockAfter)}
                </td>
                <td className="px-5 py-4 text-slate-700">{movement.reason}</td>
                <td className="px-5 py-4 text-slate-500">{movement.createdByUserId}</td>
                <td className="px-5 py-4 text-slate-500">{movement.referenceType || "Manual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function MovementBadge({ type }) {
  const tone = type === "restock" ? "success" : type === "reduce" ? "danger" : "neutral"
  return <Badge tone={tone}>{typeLabels[type] || type}</Badge>
}
```

Add the dialog:

```jsx
function MovementDialog({ products, onClose, onSubmit }) {
  const [productId, setProductId] = useState(products[0]?.id || "")
  const [type, setType] = useState("restock")
  const [quantityText, setQuantityText] = useState("")
  const [reason, setReason] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId])
  const quantity = parseQuantityInput(quantityText)
  const preview = calculateStockPreview({ type, currentStock: product?.stock || 0, quantity })

  async function submit(event) {
    event.preventDefault()
    if (!product || !preview.isValid || !reason.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onSubmit({ productId, type, quantity, reason: reason.trim() })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">New stock movement</h2>
            <p className="mt-1 text-sm text-slate-600">Adjust stock with an auditable reason.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>Close</Button>
        </div>

        <div className="mt-6 space-y-4">
          <SelectField value={productId} onChange={(event) => setProductId(event.target.value)}>
            {products.map((item) => (
              <option key={item.id} value={item.id}>{item.name} - {numberFormatter.format(item.stock)} {item.unit}</option>
            ))}
          </SelectField>
          <SelectField value={type} onChange={(event) => setType(event.target.value)}>
            {movementOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <Input
            inputMode="numeric"
            value={quantityText}
            onChange={(event) => setQuantityText(event.target.value)}
            placeholder={type === "set_exact" ? "Target stock" : "Quantity"}
          />
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />

          <div className="grid grid-cols-3 gap-3 rounded-3xl bg-slate-50 p-4 text-sm">
            <PreviewMetric label="Current" value={numberFormatter.format(product?.stock || 0)} />
            <PreviewMetric label="Delta" value={`${preview.delta > 0 ? "+" : ""}${numberFormatter.format(preview.delta)}`} />
            <PreviewMetric label="After" value={numberFormatter.format(preview.stockAfter)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" disabled={!preview.isValid || !reason.trim() || isSaving}>
            {isSaving ? "Saving..." : "Save movement"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function PreviewMetric({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
```

- [ ] **Step 5: Run page and route tests**

Run:

```bash
cd frontend
npm run test -- src/components/AppShell.test.js src/stock/movement-preview.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Stock page UI**

Run:

```bash
git add frontend/src/pages/StockPage.jsx frontend/src/components/page-loading.jsx frontend/src/shared.jsx frontend/src/App.jsx frontend/src/components/AppShell.test.js
git commit -m "feat: add stock management page"
```

---

## Task 6: Design Documentation Sync

**Files:**
- Modify: `frontend/DESIGN.md`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`

- [ ] **Step 1: Update DESIGN.md**

Add this section to `frontend/DESIGN.md` under page patterns:

```markdown
### Stock Management Page

The Stock page follows the operational table pattern used by Products and Transactions:

- Header panel uses the inventory eyebrow, page title, concise helper copy, and a secondary `New movement` action.
- The page loads only products and stock movements; it must not preload settings or transactions.
- Movement history is a dense table with date, product, type, signed delta, before-after stock, reason, user, and reference columns.
- Positive deltas use the success tone. Reduce and sale deltas use danger text. Set-exact movements keep a neutral type badge with signed delta text.
- Quantity inputs use thousand separators in the UI and submit plain integers to the API.
- Manual movement dialogs require product, movement type, quantity, and reason, then show current stock, delta, and stock-after preview before submit.
```

- [ ] **Step 2: Update DesignSystemPage only if the Stock page added new composition**

If `StockPage.jsx` uses only existing `Card`, `Button`, `Badge`, `Input`, and `SelectField` patterns, add a compact Stock pattern note to `frontend/src/pages/DesignSystemPage.jsx`:

```jsx
<section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Operational pattern</p>
  <h2 className="mt-2 text-xl font-semibold text-slate-950">Stock movement dialogs</h2>
  <p className="mt-2 text-sm text-slate-600">
    Stock changes use a required reason, signed delta preview, and thousand-separated quantity input while submitting plain integers.
  </p>
</section>
```

Place it near existing Products/Transactions page pattern documentation.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit design docs**

Run:

```bash
git add frontend/DESIGN.md frontend/src/pages/DesignSystemPage.jsx
git commit -m "docs: document stock management UI pattern"
```

---

## Task 7: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Apply local database migration**

Run with local backend environment loaded:

```bash
cd backend
make migrate-up
```

Expected: database reaches migration version `000007`.

- [ ] **Step 2: Run complete backend tests**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS.

- [ ] **Step 3: Run frontend tests**

Run:

```bash
cd frontend
npm run test
```

Expected: PASS.

- [ ] **Step 4: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 5: Manual checkout smoke test**

Start the API and frontend:

```bash
cd backend
go run ./cmd/api
```

```bash
cd frontend
npm run dev
```

Manual verification:

- Create a restock movement from Stock and confirm product stock increases.
- Create a reduce movement and confirm product stock decreases.
- Create a set exact movement and confirm product stock equals the submitted target.
- Complete a POS sale and confirm a `sale` row appears in Stock history.
- Navigate Dashboard, Products, Transactions, Settings, and Stock and confirm each menu only loads its own required APIs.

- [ ] **Step 6: Final commit if verification changed files**

Run:

```bash
git status --short
```

If only intended files are dirty, commit the verification fixes:

```bash
git add <intended-files>
git commit -m "chore: verify stock management module"
```

If unrelated files are dirty, leave them untouched and mention them in the final handoff.
