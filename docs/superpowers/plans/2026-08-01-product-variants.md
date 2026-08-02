# Product Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dynamic attribute-based product variants to Balanja POS so one product can be sold in multiple combinations (e.g. Size x Sugar), each variant with its own price, stock, barcode, and image.

**Architecture:** New `product_variants` table (variant = cartesian product of attribute options stored as JSONB in `products.attributes_config`). All sellable items go through variants; existing products auto-migrate to a single default variant. Checkout and stock movements reference `variant_id`; historical transaction snapshots are immutable.

**Tech Stack:** Go 1.23 + Fiber v3 + pgx/v5 + Supabase PostgreSQL (backend); React 19 + Vite 7 + Bun (frontend).

**Spec:** `docs/superpowers/specs/2026-08-01-product-variants-design.md`

---

## File Map

### Backend — create
- `backend/migrations/000013_variants.up.sql` — schema: `product_variants` table, `products.attributes_config` column, `stock_movements.product_variant_id` column, RLS policies, grants, backfill default variants.
- `backend/migrations/000013_variants.down.sql` — reversible down.
- `backend/migrations/000013_variants_test.go` — migration contract test (string assertion on up SQL).

### Backend — modify
- `backend/internal/product/model.go` — add `AttributeConfig`, `Variant` structs; add fields to `Product`, `CreateInput`, `UpdateInput`.
- `backend/internal/product/repository.go` — variant CRUD queries; eager-load variants in `Get`/`List`; add `attributes_config` to scan/select; unique barcode check.
- `backend/internal/product/service.go` — variant validation (attributes vs config, unique barcode, min 1 active variant); mirror sync for default variant; new `CreateVariant`/`UpdateVariant`/`DeleteVariant` service methods.
- `backend/internal/product/handler.go` — new variant CRUD endpoints; extend `Register`; extend `productError` mapping; extend multipart/JSON decode for `attributesConfig` + `variants`.
- `backend/internal/checkout/model.go` — add `VariantID *uuid.UUID` to `ItemInput`; add `VariantID`, `VariantAttributes` to `Item`.
- `backend/internal/checkout/service.go` — include `VariantID` in canonical fingerprint + quantities key.
- `backend/internal/checkout/repository.go` — lock variants; lookup price/stock/barcode/image from variant; decrement variant stock; snapshot variant info in transaction item; stock movement `product_variant_id`.
- `backend/internal/stock/model.go` — add `VariantID`, `VariantAttributes` to `Movement`; add `VariantID` to `CreateInput`.
- `backend/internal/stock/repository.go` — lock variant, update variant stock, movement references variant; list filter by variant.

### Frontend — create
- `frontend/src/components/pos/VariantSelector.jsx` — popover/dialog to pick attribute combination before add-to-cart.

### Frontend — modify
- `frontend/src/pos/domain.js` — `addProductToCart` keyed by `productId+variantId`; new `variantKey`, `variantLabel`, `formatVariantAttributes` helpers; `validateProduct` accepts variants.
- `frontend/src/pos/api-client.js` — checkout items send `variantId`; new `createVariant`/`updateVariant`/`deleteVariant` methods.
- `frontend/src/pos/store-data.js` — `toProductPayload`/`toProductFormData` include `attributesConfig` + `variants`; `applyCheckoutResult`/`applyProductStock` update variant stock.
- `frontend/src/pos/store.jsx` — `addToCart` accepts variant; `saveProduct` sends variants inline; `updateCartQty` keyed by variant.
- `frontend/src/components/pos/ProductCard.jsx` — show "N variasi" label; on tap with >1 variant open selector.
- `frontend/src/components/pos/CartRow.jsx` — show variant attributes sub-label.
- `frontend/src/pages/ProductsPage.jsx` — variant editor section (attributes + variant matrix).
- `frontend/src/pos/cart-storage.js` — persist `variantId` + `attributes` per cart line.

---

## Task 1: Database migration (up)

**Files:**
- Create: `backend/migrations/000013_variants.up.sql`

- [x] **Step 1: Write the migration up SQL**

Write to `backend/migrations/000013_variants.up.sql`:

```sql
begin;

do $$
begin
  create role balanja_api nologin nobypassrls;
exception
  when duplicate_object then null;
end $$;

alter table products
  add column if not exists attributes_config jsonb not null default '[]'::jsonb;

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  product_id uuid not null references products(id) on delete cascade,
  attributes jsonb not null default '{}'::jsonb,
  price integer not null check (price >= 1),
  stock integer not null default 0 check (stock >= 0),
  barcode text not null default '',
  image text not null default '',
  image_key text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, barcode) where barcode <> ''
);

create index if not exists product_variants_org_product_idx
  on product_variants (org_id, product_id);

create trigger product_variants_set_updated_at before update on product_variants
for each row execute function set_updated_at();

-- backfill: one default variant per existing product
insert into product_variants (org_id, product_id, attributes, price, stock, barcode, image, image_key, active, created_at, updated_at)
select p.org_id, p.id, '{}'::jsonb, p.price, p.stock, p.barcode, p.image, coalesce(p.image_key, ''), p.active, p.created_at, p.updated_at
from products p
where not exists (
  select 1 from product_variants pv where pv.org_id = p.org_id and pv.product_id = p.id
);

alter table stock_movements
  add column if not exists product_variant_id uuid;

alter table stock_movements
  add constraint stock_movements_variant_fkey
  foreign key (org_id, product_variant_id)
  references product_variants (org_id, id) on delete set null;

alter table product_variants enable row level security;
alter table product_variants force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_variants' and policyname = 'product_variants_tenant'
  ) then
    create policy product_variants_tenant on product_variants
      using (org_id = current_setting('app.org_id', true))
      with check (org_id = current_setting('app.org_id', true));
  end if;
end $$;

grant select, insert, update on product_variants to balanja_api;
grant update (product_variant_id) on stock_movements to balanja_api;

commit;
```

- [x] **Step 2: Verify SQL parses (manual)**

Run: `psql "postgresql://..." -f backend/migrations/000013_variants.up.sql` against dev DB (if available) OR review for syntax. Expected: no error.

- [x] **Step 3: Commit**

```bash
git add backend/migrations/000013_variants.up.sql
git commit -m "Add variants migration up"
```

## Task 2: Database migration (down)

**Files:**
- Create: `backend/migrations/000013_variants.down.sql`

- [x] **Step 1: Write the down SQL**

Write to `backend/migrations/000013_variants.down.sql`:

```sql
begin;

alter table stock_movements
  drop constraint if exists stock_movements_variant_fkey;

alter table stock_movements
  drop column if exists product_variant_id;

drop trigger if exists product_variants_set_updated_at on product_variants;
drop table if exists product_variants;

alter table products
  drop column if exists attributes_config;

commit;
```

- [x] **Step 2: Commit**

```bash
git add backend/migrations/000013_variants.down.sql
git commit -m "Add variants migration down"
```

## Task 3: Migration contract test

**Files:**
- Create: `backend/migrations/000013_variants_test.go`

- [x] **Step 1: Write the failing test**

```go
package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestVariantsMigrationContract(t *testing.T) {
	content, err := os.ReadFile("000013_variants.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, required := range []string{
		"create table if not exists product_variants",
		"attributes_config jsonb not null default '[]'::jsonb",
		"unique (org_id, barcode) where barcode <> ''",
		"insert into product_variants",
		"product_variants_set_updated_at",
		"force row level security",
		"current_setting('app.org_id', true)",
		"product_variants_tenant",
		"alter table stock_movements",
		"product_variant_id uuid",
	} {
		if !strings.Contains(sql, required) {
			t.Errorf("migration missing %q", required)
		}
	}
}
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./migrations/ -run TestVariantsMigrationContract -v`
Expected: PASS (test reads file already written in Task 1). If FAIL, fix migration.

- [x] **Step 3: Commit**

```bash
git add backend/migrations/000013_variants_test.go
git commit -m "Add variants migration contract test"
```

## Task 4: Product models & inputs

**Files:**
- Modify: `backend/internal/product/model.go`

- [x] **Step 1: Extend the model file**

Replace the file content from the `import` block through `UpdateResult` with:

```go
package product

import (
	"time"

	"github.com/google/uuid"
)

type AttributeConfig struct {
	Name   string   `json:"name"`
	Options []string `json:"options"`
}

type Variant struct {
	ID         uuid.UUID    `json:"id"`
	ProductID  uuid.UUID    `json:"productId"`
	Attributes map[string]string `json:"attributes"`
	Price      int          `json:"price"`
	Stock      int          `json:"stock"`
	Barcode    string       `json:"barcode"`
	Image      string       `json:"image"`
	ImageKey   string       `json:"-"`
	Active     bool         `json:"active"`
	CreatedAt  time.Time    `json:"createdAt"`
	UpdatedAt  time.Time    `json:"updatedAt"`
}

type Product struct {
	ID               uuid.UUID        `json:"id"`
	Name             string           `json:"name"`
	Barcode          string           `json:"barcode"`
	CategoryID       uuid.UUID        `json:"categoryId"`
	Category         string           `json:"category"`
	Price            int              `json:"price"`
	Stock            int              `json:"stock"`
	UnitID           uuid.UUID        `json:"unitId"`
	Unit             string           `json:"unit"`
	Image            string           `json:"image"`
	ImageKey         string           `json:"-"`
	Active           bool             `json:"active"`
	AttributesConfig []AttributeConfig `json:"attributesConfig"`
	Variants         []Variant        `json:"variants"`
	CreatedAt        time.Time        `json:"createdAt"`
	UpdatedAt        time.Time        `json:"updatedAt"`
}

type ListFilter struct {
	Query       string
	CategoryID  uuid.UUID
	Active      *bool
	Limit       int
	Sort        string
	Direction   string
	Cursor      string
	CursorValue any
	CursorID    uuid.UUID
}

type Page struct {
	Items       []Product
	NextCursor  string
	HasNextPage bool
}

type CreateInput struct {
	Name             string            `json:"name"`
	Barcode          string            `json:"barcode"`
	CategoryID       uuid.UUID         `json:"categoryId"`
	Price            int               `json:"price"`
	Stock            int               `json:"stock"`
	UnitID           uuid.UUID         `json:"unitId"`
	Image            string            `json:"image"`
	ImageKey         string            `json:"-"`
	AttributesConfig []AttributeConfig `json:"attributesConfig"`
	Variants         []VariantInput    `json:"variants"`
}

type VariantInput struct {
	Attributes map[string]string `json:"attributes"`
	Price      int               `json:"price"`
	Stock      int               `json:"stock"`
	Barcode    string            `json:"barcode"`
	Image      string            `json:"image"`
	ImageKey   string            `json:"-"`
	Active     bool              `json:"active"`
}

type UpdateInput struct {
	Name             string            `json:"name"`
	Barcode          string            `json:"barcode"`
	CategoryID       uuid.UUID         `json:"categoryId"`
	Price            int               `json:"price"`
	UnitID           uuid.UUID         `json:"unitId"`
	Image            string            `json:"image"`
	ImageKey         string            `json:"-"`
	PreserveImage    bool              `json:"-"`
	Active           bool              `json:"active"`
	AttributesConfig []AttributeConfig `json:"attributesConfig"`
	Variants         []VariantInput    `json:"variants"`
}

type UpdateResult struct {
	Product          Product
	PreviousImageKey string
}
```

- [x] **Step 2: Verify the package compiles**

Run: `cd backend && go build ./internal/product/...`
Expected: build succeeds (repository/service will still compile because they reference exported names still present).

- [x] **Step 3: Commit**

```bash
git add backend/internal/product/model.go
git commit -m "Add variant and attribute models"
```

## Task 5: Product repository — variants CRUD & eager load

**Files:**
- Modify: `backend/internal/product/repository.go`
- Test: `backend/internal/product/repository_test.go`

This task adds variant repository methods and integrates `attributes_config` into existing `Get`/`Create`/`Update`.

- [x] **Step 1: Update product column constants and scan functions**

In `backend/internal/product/repository.go`, replace the `scanProduct` function and the three column constants:

```go
const productColumns = `p.id,p.name,p.barcode,p.category_id,c.name,p.price,p.stock,p.unit_id,u.name,p.image,p.image_key,p.active,p.attributes_config,p.created_at,p.updated_at`
const productInsertedColumns = `inserted.id,inserted.name,inserted.barcode,inserted.category_id,c.name,inserted.price,inserted.stock,inserted.unit_id,u.name,inserted.image,inserted.image_key,inserted.active,inserted.attributes_config,inserted.created_at,inserted.updated_at`
const productUpdateColumns = `updated.id,updated.name,updated.barcode,updated.category_id,c.name,updated.price,updated.stock,updated.unit_id,u.name,updated.image,updated.image_key,updated.active,updated.attributes_config,updated.created_at,updated.updated_at`

func scanProduct(row pgx.Row) (Product, error) {
	var p Product
	var attrsConfig []byte
	err := row.Scan(&p.ID, &p.Name, &p.Barcode, &p.CategoryID, &p.Category, &p.Price, &p.Stock, &p.UnitID, &p.Unit, &p.Image, &p.ImageKey, &p.Active, &attrsConfig, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return p, err
	}
	p.AttributesConfig, err = decodeAttributeConfigs(attrsConfig)
	return p, err
}

func scanUpdateResult(row pgx.Row) (UpdateResult, error) {
	var result UpdateResult
	p := &result.Product
	var attrsConfig []byte
	var previousImageKey string
	err := row.Scan(&p.ID, &p.Name, &p.Barcode, &p.CategoryID, &p.Category, &p.Price, &p.Stock, &p.UnitID, &p.Unit, &p.Image, &p.ImageKey, &p.Active, &attrsConfig, &p.CreatedAt, &p.UpdatedAt, &previousImageKey)
	if err != nil {
		return result, err
	}
	result.PreviousImageKey = previousImageKey
	p.AttributesConfig, err = decodeAttributeConfigs(attrsConfig)
	return result, err
}
```

- [x] **Step 2: Add JSONB encode/decode helpers and variant scan helper**

Append to `backend/internal/product/repository.go`:

```go
func decodeAttributeConfigs(raw []byte) ([]AttributeConfig, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var configs []AttributeConfig
	if err := json.Unmarshal(raw, &configs); err != nil {
		return nil, fmt.Errorf("decode attribute configs: %w", err)
	}
	return configs, nil
}

func encodeAttributeConfigs(configs []AttributeConfig) ([]byte, error) {
	if len(configs) == 0 {
		return []byte("[]"), nil
	}
	raw, err := json.Marshal(configs)
	if err != nil {
		return nil, fmt.Errorf("encode attribute configs: %w", err)
	}
	return raw, nil
}

func scanVariant(row pgx.Row) (Variant, error) {
	var v Variant
	var attrs []byte
	err := row.Scan(&v.ID, &v.ProductID, &attrs, &v.Price, &v.Stock, &v.Barcode, &v.Image, &v.ImageKey, &v.Active, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return v, err
	}
	if len(attrs) > 0 && string(attrs) != "{}" {
		v.Attributes = map[string]string{}
		if err := json.Unmarshal(attrs, &v.Attributes); err != nil {
			return v, fmt.Errorf("decode variant attributes: %w", err)
		}
	}
	return v, nil
}

func encodeVariantAttributes(attrs map[string]string) []byte {
	if len(attrs) == 0 {
		return []byte("{}")
	}
	raw, _ := json.Marshal(attrs)
	return raw
}
```

Add `"encoding/json"` to the import block of repository.go.

- [x] **Step 3: Add attributes_config to Create and Update queries**

In `Create`, change the insert statement to include `attributes_config`:

```go
func (PostgresRepository) Create(ctx context.Context, tx database.Tx, orgID string, in CreateInput) (Product, error) {
	attrsConfig, err := encodeAttributeConfigs(in.AttributesConfig)
	if err != nil {
		return Product{}, err
	}
	p, err := scanProduct(tx.QueryRow(ctx, `
		with inserted as (
			insert into products (org_id,name,barcode,category_id,price,stock,unit_id,image,image_key,attributes_config)
			values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			returning id,name,barcode,category_id,price,stock,unit_id,image,image_key,active,attributes_config,created_at,updated_at
		)
		select `+productInsertedColumns+`
		from inserted
		join categories c on c.org_id=$1 and c.id=inserted.category_id
		join units u on u.org_id=$1 and u.id=inserted.unit_id
	`, orgID, in.Name, in.Barcode, in.CategoryID, in.Price, in.Stock, in.UnitID, in.Image, in.ImageKey, attrsConfig))
	if err != nil {
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Product{}, ErrBarcodeConflict
		}
		return Product{}, fmt.Errorf("create product: %w", err)
	}
	return p, nil
}
```

In `Update`, change the `update products p set` to include `attributes_config=$12` and pass `attrsConfig` as the new placeholder:

```go
func (PostgresRepository) Update(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID, in UpdateInput) (UpdateResult, error) {
	attrsConfig, err := encodeAttributeConfigs(in.AttributesConfig)
	if err != nil {
		return UpdateResult{}, err
	}
	result, err := scanUpdateResult(tx.QueryRow(ctx, `
		with previous as (
			select image_key from products where org_id=$1 and id=$2 for update
		), updated as (
			update products p set
				name=$3,barcode=$4,category_id=$5,price=$6,unit_id=$7,
				image=case when $10 then p.image else $8 end,
				image_key=case when $10 then p.image_key when p.image=$8 and $9='' then p.image_key else $9 end,
				active=$11,
				attributes_config=$12
			from previous
			where p.org_id=$1 and p.id=$2
			returning p.id,p.name,p.barcode,p.category_id,p.price,p.stock,p.unit_id,p.image,p.image_key,p.active,p.attributes_config,p.created_at,p.updated_at
		)
		select `+productUpdateColumns+`,previous.image_key
		from updated
		join categories c on c.org_id=$1 and c.id=updated.category_id
		join units u on u.org_id=$1 and u.id=updated.unit_id
		cross join previous`, orgID, id, in.Name, in.Barcode, in.CategoryID, in.Price, in.UnitID, in.Image, in.ImageKey, in.PreserveImage, in.Active, attrsConfig))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return UpdateResult{}, ErrNotFound
		}
		return UpdateResult{}, fmt.Errorf("update product: %w", err)
	}
	return result, nil
}
```

- [x] **Step 4: Add ListVariants, CreateVariant, UpdateVariant, DeleteVariant byID repository methods**

Append to `backend/internal/product/repository.go`:

```go
func (PostgresRepository) ListVariants(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID) ([]Variant, error) {
	rows, err := tx.Query(ctx, `
		select id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
		from product_variants
		where org_id=$1 and product_id=$2
		order by created_at,id
	`, orgID, productID)
	if err != nil {
		return nil, fmt.Errorf("list variants: %w", err)
	}
	defer rows.Close()
	variants, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Variant, error) { return scanVariant(row) })
	if err != nil {
		return nil, fmt.Errorf("scan variants: %w", err)
	}
	return variants, nil
}

func (PostgresRepository) GetVariant(ctx context.Context, tx database.Tx, orgID string, productID, variantID uuid.UUID) (Variant, error) {
	v, err := scanVariant(tx.QueryRow(ctx, `
		select id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
		from product_variants
		where org_id=$1 and product_id=$2 and id=$3
	`, orgID, productID, variantID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Variant{}, ErrVariantNotFound
		}
		return Variant{}, fmt.Errorf("get variant: %w", err)
	}
	return v, nil
}

func (PostgresRepository) CreateVariant(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID, in VariantInput) (Variant, error) {
	v, err := scanVariant(tx.QueryRow(ctx, `
		insert into product_variants (org_id,product_id,attributes,price,stock,barcode,image,image_key,active)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		returning id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
	`, orgID, productID, encodeVariantAttributes(in.Attributes), in.Price, in.Stock, in.Barcode, in.Image, in.ImageKey, in.Active))
	if err != nil {
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Variant{}, ErrVariantBarcodeConflict
		}
		return Variant{}, fmt.Errorf("create variant: %w", err)
	}
	return v, nil
}

func (PostgresRepository) UpdateVariant(ctx context.Context, tx database.Tx, orgID string, productID, variantID uuid.UUID, in VariantInput) (Variant, error) {
	v, err := scanVariant(tx.QueryRow(ctx, `
		update product_variants set
			attributes=$3,price=$4,stock=$5,barcode=$6,image=$7,image_key=$8,active=$9
		where org_id=$1 and product_id=$2 and id=$10
		returning id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
	`, orgID, productID, variantID, encodeVariantAttributes(in.Attributes), in.Price, in.Stock, in.Barcode, in.Image, in.ImageKey, in.Active, variantID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Variant{}, ErrVariantNotFound
		}
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Variant{}, ErrVariantBarcodeConflict
		}
		return Variant{}, fmt.Errorf("update variant: %w", err)
	}
	return v, nil
}

func (PostgresRepository) DeleteVariant(ctx context.Context, tx database.Tx, orgID string, productID, variantID uuid.UUID) error {
	tag, err := tx.Exec(ctx, `delete from product_variants where org_id=$1 and product_id=$2 and id=$3`, orgID, productID, variantID)
	if err != nil {
		return fmt.Errorf("delete variant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrVariantNotFound
	}
	return nil
}

func (PostgresRepository) CountActiveVariants(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID) (int, error) {
	var count int
	err := tx.QueryRow(ctx, `select count(*) from product_variants where org_id=$1 and product_id=$2 and active=true`, orgID, productID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count active variants: %w", err)
	}
	return count, nil
}

func (PostgresRepository) VariantSoldHistory(ctx context.Context, tx database.Tx, orgID string, variantID uuid.UUID) (bool, error) {
	var exists bool
	err := tx.QueryRow(ctx, `select exists(select 1 from stock_movements where org_id=$1 and product_variant_id=$2)`, orgID, variantID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check variant sold history: %w", err)
	}
	return exists, nil
}
```

- [x] **Step 5: Eager-load variants in service Get/List (service.go integration)**

This is done in Task 6 (service). Skip here.

- [x] **Step 6: Build the package**

Run: `cd backend && go build ./internal/product/...`
Expected: build succeeds. If `DecodeAttributeConfigs` exported unused, ignore (used internally).

- [x] **Step 7: Add variant repository test stub**

Add to `backend/internal/product/repository_test.go` a new test asserting `ListVariants` query compiles via interface conformance (unit tests hitting a real DB are out of scope unless a test harness exists). Run: `cd backend && go vet ./internal/product/...`. Expected: no vet errors.

- [x] **Step 8: Commit**

```bash
git add backend/internal/product/repository.go backend/internal/product/repository_test.go
git commit -m "Add variant repository CRUD and attributes_config integration"
```

## Task 6: Product service — variant validation & sync

**Files:**
- Modify: `backend/internal/product/service.go`
- Test: `backend/internal/product/service_test.go`

- [x] **Step 1: Add new sentinel errors and extend Repository interface**

In `service.go`, add to the `var` block:

```go
	ErrVariantNotFound       = errors.New("variant not found")
	ErrVariantBarcodeConflict = errors.New("variant barcode conflict")
	ErrMissingVariantId      = errors.New("variant id required")
	ErrInvalidAttributes      = errors.New("invalid variant attributes")
	ErrMinVariants            = errors.New("at least one active variant is required")
```

Extend the `Repository` interface:

```go
type Repository interface {
	List(context.Context, database.Tx, string, ListFilter) ([]Product, error)
	Create(context.Context, database.Tx, string, CreateInput) (Product, error)
	Get(context.Context, database.Tx, string, uuid.UUID) (Product, error)
	CategoryIsActive(context.Context, database.Tx, string, uuid.UUID) (bool, error)
	UnitIsActive(context.Context, database.Tx, string, uuid.UUID) (bool, error)
	Update(context.Context, database.Tx, string, uuid.UUID, UpdateInput) (UpdateResult, error)
	Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error)
	ListVariants(context.Context, database.Tx, string, uuid.UUID) ([]Variant, error)
	GetVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID) (Variant, error)
	CreateVariant(context.Context, database.Tx, string, uuid.UUID, VariantInput) (Variant, error)
	UpdateVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID, VariantInput) (Variant, error)
	DeleteVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID) error
	CountActiveVariants(context.Context, database.Tx, string, uuid.UUID) (int, error)
	VariantSoldHistory(context.Context, database.Tx, string, uuid.UUID) (bool, error)
}
```

- [x] **Step 2: Add attributes validation helper**

Append to `service.go`:

```go
func validateVariantAttributes(attrs map[string]string, config []AttributeConfig) error {
	if len(config) == 0 {
		if len(attrs) == 0 {
			return nil
		}
		return ErrInvalidAttributes
	}
	if len(attrs) != len(config) {
		return ErrInvalidAttributes
	}
	for _, attr := range config {
		value, ok := attrs[attr.Name]
		if !ok || strings.TrimSpace(value) == "" {
			return ErrInvalidAttributes
		}
		matched := false
		for _, option := range attr.Options {
			if option == value {
				matched = true
				break
			}
		}
		if !matched {
			return ErrInvalidAttributes
		}
	}
	return nil
}

func validateVariantBarcodeUnique(ctx context.Context, tx database.Tx, repo Repository, orgID string, barcode string, excludeProductID, excludeVariantID uuid.UUID) error {
	barcode = strings.TrimSpace(barcode)
	if barcode == "" {
		return nil
	}
	var productConflict bool
	err := tx.QueryRow(ctx, `select exists(select 1 from products where org_id=$1 and barcode=$2 and id<>$3 and active=true)`, orgID, barcode, excludeProductID).Scan(&productConflict)
	if err != nil {
		return fmt.Errorf("check barcode product conflict: %w", err)
	}
	if productConflict {
		return ErrVariantBarcodeConflict
	}
	var variantConflict bool
	err = tx.QueryRow(ctx, `select exists(select 1 from product_variants where org_id=$1 and barcode=$2 and id<>$3 and active=true)`, orgID, barcode, excludeVariantID).Scan(&variantConflict)
	if err != nil {
		return fmt.Errorf("check barcode variant conflict: %w", err)
	}
	if variantConflict {
		return ErrVariantBarcodeConflict
	}
	return nil
}
```

- [x] **Step 3: Eager-load variants in List and Get**

In `Service.List`, inside the `runner.Run` closure after `s.repository.List`, add variant loading:

```go
	var products []Product
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var queryErr error
		products, queryErr = s.repository.List(ctx, tx, identity.OrgID, filter)
		if queryErr != nil {
			return queryErr
		}
		for i := range products {
			variants, vErr := s.repository.ListVariants(ctx, tx, identity.OrgID, products[i].ID)
			if vErr != nil {
				return vErr
			}
			products[i].Variants = variants
		}
		return nil
	})
```

In `Service.Update`, after `s.repository.Get` and before update, load current variants if needed. (No mutation of variants in product Update path — variants go through their own endpoints. Product Update only persists `attributes_config`.)

- [x] **Step 4: Add CreateVariant / UpdateVariant / DeleteVariant service methods**

Append to `service.go`:

```go
func (s *Service) CreateVariant(ctx context.Context, identity database.Identity, productID uuid.UUID, input VariantInput) (Variant, error) {
	input.Barcode = strings.TrimSpace(input.Barcode)
	if input.Price < 1 || input.Stock < 0 {
		return Variant{}, ErrInvalidProduct
	}
	var created Variant
	err := s.runner.Run(ctx, identity, func(tx database.Tx) error {
		product, getErr := s.repository.Get(ctx, tx, identity.OrgID, productID)
		if getErr != nil {
			return getErr
		}
		if err := validateVariantAttributes(input.Attributes, product.AttributesConfig); err != nil {
			return err
		}
		if err := validateVariantBarcodeUnique(ctx, tx, s.repository, identity.OrgID, input.Barcode, productID, uuid.Nil); err != nil {
			return err
		}
		var createErr error
		created, createErr = s.repository.CreateVariant(ctx, tx, identity.OrgID, productID, input)
		return createErr
	})
	return created, err
}

func (s *Service) UpdateVariant(ctx context.Context, identity database.Identity, productID, variantID uuid.UUID, input VariantInput) (Variant, error) {
	input.Barcode = strings.TrimSpace(input.Barcode)
	if input.Price < 1 || input.Stock < 0 {
		return Variant{}, ErrInvalidProduct
	}
	var updated Variant
	err := s.runner.Run(ctx, identity, func(tx database.Tx) error {
		product, getErr := s.repository.Get(ctx, tx, identity.OrgID, productID)
		if getErr != nil {
			return getErr
		}
		if err := validateVariantAttributes(input.Attributes, product.AttributesConfig); err != nil {
			return err
		}
		if err := validateVariantBarcodeUnique(ctx, tx, s.repository, identity.OrgID, input.Barcode, productID, variantID); err != nil {
			return err
		}
		var updateErr error
		updated, updateErr = s.repository.UpdateVariant(ctx, tx, identity.OrgID, productID, variantID, input)
		return updateErr
	})
	return updated, err
}

func (s *Service) DeleteVariant(ctx context.Context, identity database.Identity, productID, variantID uuid.UUID) error {
	return s.runner.Run(ctx, identity, func(tx database.Tx) error {
		count, countErr := s.repository.CountActiveVariants(ctx, tx, identity.OrgID, productID)
		if countErr != nil {
			return countErr
		}
		if count <= 1 {
			return ErrMinVariants
		}
		sold, soldErr := s.repository.VariantSoldHistory(ctx, tx, identity.OrgID, variantID)
		if soldErr != nil {
			return soldErr
		}
		if sold {
			return s.repository.UpdateVariant(ctx, tx, identity.OrgID, productID, variantID, VariantInput{Active: false})
		}
		return s.repository.DeleteVariant(ctx, tx, identity.OrgID, productID, variantID)
	})
}
```

- [x] **Step 5: Add service tests**

Add to `backend/internal/product/service_test.go` test table entries for `validateVariantAttributes` (valid config match, missing key, unknown option, mismatched length). Use a new test func `TestValidateVariantAttributes` calling the package-private helper directly. Example:

```go
func TestValidateVariantAttributes(t *testing.T) {
	config := []AttributeConfig{{Name: "Ukuran", Options: []string{"S", "M", "L"}}}
	cases := []struct {
		name    string
		attrs   map[string]string
		wantErr bool
	}{
		{"valid", map[string]string{"Ukuran": "M"}, false},
		{"missing key", map[string]string{}, true},
		{"unknown option", map[string]string{"Ukuran": "XL"}, true},
		{"extra key", map[string]string{"Ukuran": "M", "Sugar": "Normal"}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateVariantAttributes(tc.attrs, config)
			if (err != nil) != tc.wantErr {
				t.Fatalf("got err=%v, wantErr=%v", err, tc.wantErr)
			}
		})
	}
}
```

- [x] **Step 6: Build and run tests**

Run: `cd backend && go build ./internal/product/... && go test ./internal/product/... -run TestValidateVariantAttributes -v`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add backend/internal/product/service.go backend/internal/product/service_test.go
git commit -m "Add variant service methods and validation"
```

## Task 7: Product handler — variant endpoints & error mapping

**Files:**
- Modify: `backend/internal/product/handler.go`

- [x] **Step 1: Register variant routes**

In `handler.go`, replace `Register`:

```go
func (h *Handler) Register(group fiber.Router) {
	group.Get("/products", h.list)
	group.Post("/products", h.create)
	group.Put("/products/:id", h.update)
	group.Delete("/products/:id", h.deactivate)
	group.Post("/products/:id/variants", h.createVariant)
	group.Patch("/products/:id/variants/:variantId", h.updateVariant)
	group.Delete("/products/:id/variants/:variantId", h.deleteVariant)
}
```

- [x] **Step 2: Extend productError with variant errors**

Add before the final `return respond.Error(c, err)` in `productError`:

```go
	if errors.Is(err, ErrVariantNotFound) {
		return respond.Error(c, apperror.New(404, "VARIANT_NOT_FOUND", "variant was not found"))
	}
	if errors.Is(err, ErrVariantBarcodeConflict) {
		return respond.Error(c, apperror.New(409, "BARCODE_CONFLICT", "barcode already exists"))
	}
	if errors.Is(err, ErrMissingVariantId) {
		return respond.Error(c, apperror.New(422, "MISSING_VARIANT_ID", "variant id is required for this product"))
	}
	if errors.Is(err, ErrInvalidAttributes) {
		return respond.Error(c, apperror.New(422, "INVALID_VARIANT_ATTRIBUTES", "variant attributes do not match the product configuration"))
	}
	if errors.Is(err, ErrMinVariants) {
		return respond.Error(c, apperror.New(409, "MIN_VARIANTS", "product must have at least one active variant"))
	}
```

- [x] **Step 3: Add variant handler methods**

Append to `handler.go`:

```go
func (h *Handler) createVariant(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	input, decodeErr := decode[VariantInput](c)
	if decodeErr != nil {
		return respond.Error(c, decodeErr)
	}
	item, err := h.service.CreateVariant(c.Context(), id, productID, input)
	if err != nil {
		return productError(c, err)
	}
	return c.Status(http.StatusCreated).JSON(fiber.Map{"data": item})
}

func (h *Handler) updateVariant(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	variantID, err := uuid.Parse(c.Params("variantId"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_VARIANT_ID", "variant ID is invalid"))
	}
	input, decodeErr := decode[VariantInput](c)
	if decodeErr != nil {
		return respond.Error(c, decodeErr)
	}
	item, err := h.service.UpdateVariant(c.Context(), id, productID, variantID, input)
	if err != nil {
		return productError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *Handler) deleteVariant(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	variantID, err := uuid.Parse(c.Params("variantId"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_VARIANT_ID", "variant ID is invalid"))
	}
	if err := h.service.DeleteVariant(c.Context(), id, productID, variantID); err != nil {
		return productError(c, err)
	}
	return c.Status(http.StatusNoContent).Send(nil)
}
```

- [x] **Step 4: Build**

Run: `cd backend && go build ./internal/product/...`
Expected: build succeeds.

- [x] **Step 5: Commit**

```bash
git add backend/internal/product/handler.go
git commit -m "Add variant HTTP endpoints and error mapping"
```

## Task 8: Backend integration verification

- [x] **Step 1: Wire routes in cmd/api (verify registration is unchanged)**

Run: `cd backend && go vet ./... && go test ./... -race`
Expected: all existing tests pass. If any test asserts the route count or registered paths, extend it.

- [x] **Step 2: Commit if any test fixtures updated**

```bash
git add -A backend && git commit -m "Verify backend integration for variants"
```

## Task 9: Checkout model — add VariantID

**Files:**
- Modify: `backend/internal/checkout/model.go`

- [x] **Step 1: Extend ItemInput and Item**

```go
type ItemInput struct {
	ProductID uuid.UUID `json:"productId"`
	VariantID *uuid.UUID `json:"variantId,omitempty"`
	Quantity  int       `json:"quantity"`
}

type Item struct {
	ProductID         uuid.UUID        `json:"productId"`
	VariantID         *uuid.UUID       `json:"variantId,omitempty"`
	VariantAttributes map[string]string `json:"variantAttributes,omitempty"`
	Name      string   `json:"name"`
	Barcode   string   `json:"barcode"`
	Image     string   `json:"image,omitempty"`
	Price     int      `json:"price"`
	Quantity  int      `json:"qty"`
}
```

- [x] **Step 2: Commit**

```bash
git add backend/internal/checkout/model.go
git commit -m "Add VariantID to checkout item model"
```

## Task 10: Checkout service — fingerprint & quantities key

**Files:**
- Modify: `backend/internal/checkout/service.go`

- [x] **Step 1: Update quantities aggregation to use product+variant key**

Replace the `for _, item := range input.Items` aggregation block:

```go
	quantities := map[string]ItemInput{}
	for _, item := range input.Items {
		if item.ProductID == [16]byte{} || item.Quantity < 1 {
			return Result{}, ErrInvalidCheckout
		}
		k := variantKey(item.ProductID, item.VariantID)
		existing := quantities[k]
		existing.ProductID = item.ProductID
		existing.VariantID = item.VariantID
		existing.Quantity += item.Quantity
		quantities[k] = existing
	}
```

Add the helper:

```go
func variantKey(productID uuid.UUID, variantID *uuid.UUID) string {
	if variantID == nil {
		return productID.String() + "|"
	}
	return productID.String() + "|" + variantID.String()
}
```

The `canonical, _ := json.Marshal(input)` already includes `VariantID` omitempty so the fingerprint differentiates variants. Good.

- [x] **Step 2: Run existing checkout tests**

Run: `cd backend && go test ./internal/checkout/... -race`
Expected: existing tests pass (they don't send VariantID → key works the same).

- [x] **Step 3: Commit**

```bash
git add backend/internal/checkout/service.go
git commit -m "Include VariantID in checkout fingerprint and quantities key"
```

## Task 11: Checkout repository — variant lookup, stock, movement

**Files:**
- Modify: `backend/internal/checkout/repository.go`

- [x] **Step 1: Extend lockedProduct to carry variant info**

```go
type lockedVariant struct {
	ID            uuid.UUID
	ProductID     uuid.UUID
	Attributes    map[string]string
	Price, Stock  int
	Barcode       string
	Image         string
	ImageKey      string
	Active        bool
}
```

- [x] **Step 2: Lock variants alongside products**

Replace the products-lock block (after entitlement check) with a version that also locks variants for items with `VariantID != nil`:

```go
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
```

- [x] **Step 3: Resolve item pricing/stock from variant when present**

Replace the per-item loop body `for _, requested := range input.Items` that builds `items`:

```go
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
```

- [x] **Step 4: Decrement variant stock and movement reference variant**

In the per-item stock update loop near line 137, branch on variant:

```go
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
```

- [x] **Step 5: Build & run tests**

Run: `cd backend && go build ./internal/checkout/... && go test ./internal/checkout/... -race`
Expected: existing tests pass (they don't use VariantID → fallback path).

- [x] **Step 6: Commit**

```bash
git add backend/internal/checkout/repository.go
git commit -m "Checkout resolves pricing/stock from variant and records variant movement"
```

## Task 12: Stock model & repository — variant support

**Files:**
- Modify: `backend/internal/stock/model.go`
- Modify: `backend/internal/stock/repository.go`

- [x] **Step 1: Extend Movement and CreateInput**

In `model.go` add fields:

```go
type Movement struct {
	ID                uuid.UUID    `json:"id"`
	ProductID         uuid.UUID    `json:"productId"`
	VariantID         *uuid.UUID   `json:"variantId,omitempty"`
	VariantAttributes string       `json:"variantAttributes,omitempty"`
	ProductName       string       `json:"productName"`
	ProductBarcode    string       `json:"productBarcode"`
	ProductCategory   string       `json:"productCategory"`
	ProductUnit       string       `json:"productUnit"`
	Type              MovementType `json:"type"`
	QuantityDelta     int          `json:"quantityDelta"`
	StockBefore       int          `json:"stockBefore"`
	StockAfter        int          `json:"stockAfter"`
	Reason            string       `json:"reason"`
	ReferenceType     *string      `json:"referenceType,omitempty"`
	ReferenceID       *uuid.UUID   `json:"referenceId,omitempty"`
	CreatedByUserID   string       `json:"createdByUserId"`
	CreatedByUserName string       `json:"createdByUserName,omitempty"`
	CreatedAt         time.Time    `json:"createdAt"`
}

type CreateInput struct {
	ProductID         uuid.UUID    `json:"productId"`
	VariantID         *uuid.UUID    `json:"variantId,omitempty"`
	Type              MovementType `json:"type"`
	Quantity          int          `json:"quantity"`
	Reason            string       `json:"reason"`
	CreatedByUserName string       `json:"createdByUserName,omitempty"`
}
```

- [x] **Step 2: Lock variant and update variant stock in Create**

Replace the `Create` function in `repository.go`:

```go
func (PostgresRepository) Create(ctx context.Context, tx database.Tx, identity database.Identity, input CreateInput) (CreateResult, error) {
	before, isActive, err := lockVariantStock(ctx, tx, identity.OrgID, input.ProductID, input.VariantID)
	if err != nil {
		return CreateResult{}, err
	}
	if !isActive {
		return CreateResult{}, ErrProductInactive
	}
	delta, after, err := ResolveManualMovement(input.Type, before, input.Quantity)
	if err != nil {
		return CreateResult{}, err
	}
	updated, err := updateStock(ctx, tx, identity.OrgID, input.ProductID, input.VariantID, after)
	if err != nil {
		return CreateResult{}, err
	}
	movement, err := insertMovement(ctx, tx, insertMovementInput{
		OrgID: identity.OrgID, ProductID: input.ProductID, VariantID: input.VariantID,
		Type: input.Type, QuantityDelta: delta, StockBefore: before, StockAfter: after,
		Reason: input.Reason, CreatedByUserID: identity.UserID, CreatedByUserName: input.CreatedByUserName,
	})
	if err != nil {
		return CreateResult{}, err
	}
	return CreateResult{Movement: movement, Product: updated}, nil
}

func lockVariantStock(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID, variantID *uuid.UUID) (int, bool, error) {
	if variantID != nil {
		var stock int
		var active bool
		err := tx.QueryRow(ctx, `select stock,active from product_variants where org_id=$1 and id=$2 for update`, orgID, *variantID).Scan(&stock, &active)
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, false, ErrProductNotFound
		}
		if err != nil {
			return 0, false, fmt.Errorf("lock variant: %w", err)
		}
		return stock, active, nil
	}
	product, err := lockProduct(ctx, tx, orgID, productID)
	if err != nil {
		return 0, false, err
	}
	return product.Stock, product.IsActive, nil
}

func updateStock(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID, variantID *uuid.UUID, stock int) (ProductStock, error) {
	if variantID != nil {
		var updated ProductStock
		err := tx.QueryRow(ctx, `update product_variants set stock=$3,updated_at=now() where org_id=$1 and id=$2 returning id,stock,updated_at`, orgID, *variantID, stock).Scan(&updated.ID, &updated.Stock, &updated.UpdatedAt)
		if err != nil {
			return ProductStock{}, fmt.Errorf("update variant stock: %w", err)
		}
		return updated, nil
	}
	return updateProductStock(ctx, tx, orgID, productID, stock)
}
```

- [x] **Step 3: Extend insertMovement and Movement scan with variant columns**

Update `insertMovementInput` to include `VariantID *uuid.UUID`, the `insert into stock_movements` columns to include `product_variant_id`, and `List` query/scan to include `sm.product_variant_id`. For List scan, add `&movement.VariantID`.

- [x] **Step 4: Build & run stock tests**

Run: `cd backend && go build ./internal/stock/... && go test ./internal/stock/... -race`
Expected: existing tests pass (no VariantID → fallback).

- [x] **Step 5: Commit**

```bash
git add backend/internal/stock/model.go backend/internal/stock/repository.go
git commit -m "Stock movements reference variant"
```

## Task 13: Frontend domain — cart keyed by variant

**Files:**
- Modify: `frontend/src/pos/domain.js`
- Test: `frontend/src/pos/domain.test.js`

- [x] **Step 1: Add variant helpers and rewrite addProductToCart**

Add at top of `domain.js` after the existing helpers:

```js
export function variantKey(productId, variantId) {
  return `${productId}|${variantId || ""}`;
}

export function formatVariantAttributes(attributes) {
  if (!attributes || Object.keys(attributes).length === 0) return "";
  return Object.entries(attributes).map(([k, v]) => `${k}: ${v}`).join(", ");
}
```

Replace `addProductToCart`:

```js
export function addProductToCart(cart, products, barcodeOrProductId, variant) {
  const product =
    products.find((item) => item.active && item.id === barcodeOrProductId) ||
    findProductByBarcode(products, barcodeOrProductId);
  if (!product) return { ok: false, error: "Product not found", cart };

  const targetVariant = variant || (product.variants && product.variants.length === 1 ? product.variants[0] : null);
  if (product.variants && product.variants.length > 1 && !targetVariant) {
    return { ok: false, error: "Select a variant", cart };
  }
  const variantId = targetVariant ? targetVariant.id : "";
  const variantStock = targetVariant ? targetVariant.stock : product.stock;
  const variantPrice = targetVariant ? targetVariant.price : product.price;
  if (variantStock <= 0) return { ok: false, error: "Product is out of stock", cart };

  const lineKey = variantKey(product.id, variantId);
  const existing = cart.find((item) => variantKey(item.productId, item.variantId) === lineKey);
  const nextQty = existing ? existing.qty + 1 : 1;
  if (nextQty > variantStock) return { ok: false, error: "Cart quantity exceeds stock", cart };

  const nextCart = existing
    ? cart.map((item) => (variantKey(item.productId, item.variantId) === lineKey ? { ...item, qty: nextQty } : item))
    : [
        ...cart,
        {
          productId: product.id,
          variantId,
          variantAttributes: targetVariant ? targetVariant.attributes : null,
          name: product.name,
          barcode: targetVariant ? targetVariant.barcode : product.barcode,
          price: variantPrice,
          qty: 1,
          stockAtAdd: variantStock,
        },
      ];
  return { ok: true, cart: nextCart, product, variant: targetVariant, quantity: nextQty };
}
```

- [x] **Step 2: Add domain tests**

Add to `domain.test.js`:

```js
import { addProductToCart, variantKey, formatVariantAttributes } from "./domain.js";

function variantProduct() {
  return {
    id: "p1", name: "Minuman", price: 8000, stock: 0, active: true,
    variants: [
      { id: "v1", attributes: { "Ukuran": "M" }, price: 8000, stock: 5, active: true },
      { id: "v2", attributes: { "Ukuran": "L" }, price: 10000, stock: 0, active: true },
    ],
  };
}

test("addProductToCart requires variant when >1 variants", () => {
  const r = addProductToCart([], [variantProduct()], "p1");
  expect(r.ok).toBe(false);
  expect(r.error).toBe("Select a variant");
});

test("addProductToCart adds chosen variant line", () => {
  const p = variantProduct();
  const v1 = p.variants[0];
  const r = addProductToCart([], [p], "p1", v1);
  expect(r.ok).toBe(true);
  expect(r.cart[0].variantId).toBe("v1");
  expect(r.cart[0].price).toBe(8000);
});

test("variantKey distinguishes lines", () => {
  expect(variantKey("p1", "v1")).not.toBe(variantKey("p1", "v2"));
});

test("formatVariantAttributes renders pairs", () => {
  expect(formatVariantAttributes({ "Ukuran": "M", "Sugar": "Normal" })).toBe("Ukuran: M, Sugar: Normal");
  expect(formatVariantAttributes(null)).toBe("");
});
```

- [x] **Step 3: Run tests**

Run: `cd frontend && bun run test`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add frontend/src/pos/domain.js frontend/src/pos/domain.test.js
git commit -m "Cart keyed by product+variant; add variant helpers"
```

## Task 14: Frontend api-client — checkout sends variantId; variant endpoints

**Files:**
- Modify: `frontend/src/pos/api-client.js`
- Test: `frontend/src/pos/api-client.test.js`

- [x] **Step 1: Update checkout items payload**

Replace the `checkout` method body's `items` mapping:

```js
      body: {
        items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId || undefined, quantity: item.qty })),
        payment,
        ...(cashierName ? { cashierName } : {}),
      },
```

- [x] **Step 2: Add variant endpoints**

Add inside the returned object before the closing brace:

```js
    async createVariant(productId, input, options = {}) {
      return (await request(`/api/v1/products/${encodeURIComponent(productId)}/variants`, { ...options, method: "POST", body: input })).data;
    },
    async updateVariant(productId, variantId, input, options = {}) {
      return (await request(`/api/v1/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`, { ...options, method: "PATCH", body: input })).data;
    },
    async deleteVariant(productId, variantId, options = {}) {
      return request(`/api/v1/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`, { ...options, method: "DELETE" });
    },
```

- [x] **Step 3: Add api-client test assertions**

Verify `checkout` calls include `variantId` in payload and variant endpoints exist. Run: `cd frontend && bun run test`.
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add frontend/src/pos/api-client.js frontend/src/pos/api-client.test.js
git commit -m "API client sends variantId and exposes variant endpoints"
```

## Task 15: Frontend store-data — variants in product payload

**Files:**
- Modify: `frontend/src/pos/store-data.js`

- [x] **Step 1: Extend toProductPayload**

```js
export function toProductPayload(product, includeStock) {
  return {
    name: String(product.name || "").trim(),
    barcode: String(product.barcode || "").trim(),
    categoryId: String(product.categoryId || "").trim(),
    price: parseNumberInput(product.price),
    ...(includeStock ? { stock: parseNumberInput(product.stock) } : {}),
    unitId: String(product.unitId || "").trim(),
    image: product.image || "",
    ...(!includeStock ? { active: product.active !== false } : {}),
    attributesConfig: Array.isArray(product.attributesConfig) ? product.attributesConfig : [],
  };
}
```

- [x] **Step 2: Extend applyCheckoutResult to update variant stock**

```js
export function applyCheckoutResult(products, result) {
  const updates = new Map(result.products.map((product) => [product.id, product]));
  return products.map((product) => {
    const update = updates.get(product.id);
    if (!update) return product;
    const variants = Array.isArray(product.variants) ? product.variants.map((v) => v.id === update.id ? { ...v, stock: update.stock, updatedAt: update.updatedAt } : v) : product.variants;
    return { ...product, stock: update.stock, updatedAt: update.updatedAt, variants };
  });
}
```

- [x] **Step 3: Run frontend tests**

Run: `cd frontend && bun run test`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add frontend/src/pos/store-data.js
git commit -m "Store data passes attributesConfig and syncs variant stock"
```

## Task 16: Frontend cart-storage — persist variantId

**Files:**
- Modify: `frontend/src/pos/cart-storage.js`

- [x] **Step 1: Include variantId in persisted/loaded cart lines**

Ensure the storage serialization keys each line by `productId+variantId` and retains `variantId` + `variantAttributes`. If the existing storage relies on `productId`, change the dedupe to use `variantKey`.

- [x] **Step 2: Run tests**

Run: `cd frontend && bun run test`
Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add frontend/src/pos/cart-storage.js frontend/src/pos/cart-storage.test.js 2>/dev/null
git commit -m "Cart storage persists variantId per line"
```

## Task 17: Frontend POS store — addToCart with variant

**Files:**
- Modify: `frontend/src/pos/store.jsx`

- [x] **Step 1: Extend addToCart to accept a variant argument**

Replace `addToCart`:

```js
  const addToCart = React.useCallback((barcodeOrProductId, variant) => {
    let response;
    setCart((current) => {
      response = addProductToCart(current, products, barcodeOrProductId, variant);
      return response.ok ? response.cart : current;
    });
    if (response && !response.ok) setNotice(response.error);
    return response;
  }, [products]);
```

Update `updateCartQty` to accept variantId and match lines by `variantKey`:

```js
  const updateCartQty = React.useCallback((productId, variantId, qty) => {
    const lineKey = variantKey(productId, variantId);
    const product = products.find((item) => item.id === productId);
    const variant = product?.variants?.find((v) => v.id === variantId);
    const maxStock = variant ? variant.stock : product?.stock;
    const nextQty = Math.max(0, Number(qty));
    if (!product) { setNotice("Product not found"); return { ok: false, error: "Product not found" }; }
    if (nextQty > maxStock) { setNotice("Cart quantity exceeds stock"); return { ok: false, error: "Cart quantity exceeds stock" }; }
    setCart((current) => nextQty === 0 ? current.filter((item) => variantKey(item.productId, item.variantId) !== lineKey) : current.map((item) => variantKey(item.productId, item.variantId) === lineKey ? { ...item, qty: nextQty } : item));
    setNotice("");
    return { ok: true };
  }, [products]);
```

Import `variantKey` from `./domain.js`.

- [x] **Step 2: Commit**

```bash
git add frontend/src/pos/store.jsx
git commit -m "Store addToCart accepts variant; updateCartQty keyed by variant"
```

## Task 18: Frontend VariantSelector component

**Files:**
- Create: `frontend/src/components/pos/VariantSelector.jsx`

- [x] **Step 1: Write the component**

```jsx
import React from "react";
import { Button, Icon } from "../primitives.jsx";
import { formatVariantAttributes } from "../../pos/domain.js";

export function VariantSelector({ product, onChoose, onClose }) {
  const config = Array.isArray(product.attributesConfig) ? product.attributesConfig : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const [selection, setSelection] = React.useState(() => {
    const initial = {};
    config.forEach((attr) => { if (attr.options.length === 1) initial[attr.name] = attr.options[0]; });
    return initial;
  });

  const matchedVariant = React.useMemo(() => (
    variants.find((v) => config.every((attr) => selection[attr.name] && v.attributes?.[attr.name] === selection[attr.name])) || null
  ), [variants, config, selection]);

  const isComplete = config.length > 0 && config.every((attr) => selection[attr.name]);
  const canAdd = Boolean(matchedVariant) && isComplete && matchedVariant.active && matchedVariant.stock > 0;

  return (
    <div className="variant-selector grid gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">{product.name}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Tutup"><Icon name="x" className="size-4" /></Button>
      </div>
      {config.map((attr) => (
        <div key={attr.name} className="grid gap-1.5">
          <p className="text-xs font-medium text-text-muted">{attr.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {attr.options.map((option) => {
              const selected = selection[attr.name] === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelection((s) => ({ ...s, [attr.name]: option }))}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${selected ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text hover:bg-surface-muted"}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {isComplete && matchedVariant && (
        <p className="text-xs text-text-muted">
          {formatVariantAttributes(matchedVariant.attributes)} · stok {matchedVariant.stock} {product.unit || "pcs"}
        </p>
      )}
      <Button variant="primary" disabled={!canAdd} onClick={() => onChoose(matchedVariant)}>
        Tambah ke keranjang
      </Button>
    </div>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/components/pos/VariantSelector.jsx
git commit -m "Add VariantSelector component"
```

## Task 19: Frontend ProductCard — variant label and selector trigger

**Files:**
- Modify: `frontend/src/components/pos/ProductCard.jsx`

- [x] **Step 1: Show variant count and open selector on add**

Wrap the `onAdd` handler in `PosProductCard` to inspect product variants:

```js
export function PosProductCard({ product, onAdd, onOpenVariants, disabled = false }) {
  const outOfStock = Number(product.stock) <= 0;
  const hasMultipleVariants = Array.isArray(product.variants) && product.variants.length > 1;
  const blocked = disabled || outOfStock;
  const { addFeedback, handleAdd } = useAddFeedback({ onAdd: () => {
    if (hasMultipleVariants) { onOpenVariants?.(product); return { ok: true }; }
    return onAdd?.();
  }, disabled: blocked });

  return (
    <ProductCardFrame
      product={product}
      outOfStock={blocked}
      addFeedback={addFeedback}
      className="pos-product-card"
      priceOnly
      showStockBadge={false}
      mediaAction={(
        <Button
          variant="primary"
          className="product-add-button pos-touch-target"
          disabled={blocked}
          aria-label={outOfStock ? `${product.name}: stok habis` : `Tambah ${product.name}`}
          onClick={handleAdd}
        >
          <span className="product-add-button-surface" aria-hidden="true">
            <Icon name="plus" className="size-5" />
          </span>
        </Button>
      )}
    >
      {hasMultipleVariants && (
        <p className="text-[11px] font-medium text-text-muted">{product.variants.length} variasi</p>
      )}
    </ProductCardFrame>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/components/pos/ProductCard.jsx
git commit -m "ProductCard opens variant selector for multi-variant products"
```

## Task 20: Frontend ProductCatalog — wire selector

**Files:**
- Modify: `frontend/src/components/pos/ProductCatalog.jsx`

- [x] **Step 1: Render selector dialog and pass onOpenVariants**

Add state and a dialog/Sheet rendering `VariantSelector`. On choose, call `addToCart(product.id, variant)` and close.

```jsx
import React from "react";
import { VariantSelector } from "./VariantSelector.jsx";

export function ProductCatalog({ products, onAdd, disabled }) {
  const [selectorProduct, setSelectorProduct] = React.useState(null);
  return (
    <>
      {/* existing grid maps PosProductCard, now also passing onOpenVariants={setSelectorProduct} */}
      {selectorProduct && (
        <VariantSelector
          product={selectorProduct}
          onChoose={(variant) => { onAdd?.(selectorProduct.id, variant); setSelectorProduct(null); }}
          onClose={() => setSelectorProduct(null)}
        />
      )}
    </>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/components/pos/ProductCatalog.jsx
git commit -m "ProductCatalog opens VariantSelector and adds chosen variant to cart"
```

## Task 21: Frontend CartRow — show variant attributes

**Files:**
- Modify: `frontend/src/components/pos/CartRow.jsx`

- [x] **Step 1: Render sub-label**

Under `<p className="line-clamp-2 text-sm font-semibold leading-5 text-text">{item.name}</p>` add:

```jsx
            {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
              <p className="text-xs text-text-muted">{Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(", ")}</p>
            )}
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/components/pos/CartRow.jsx
git commit -m "CartRow shows variant attributes sub-label"
```

## Task 22: Frontend product form — variant editor

**Files:**
- Modify: `frontend/src/pages/ProductsPage.jsx`

- [x] **Step 1: Add editor state for attributes and variants**

Track `editing.attributesConfig` (array) and `editing.variants` (array). When the simple toggle is on (empty `attributesConfig`), keep the single price/stock/barcode fields mapping to the single default variant. When attributes are added, render the variant matrix.

- [x] **Step 2: Render attribute editor**

Add chips input for attribute options and a text input for attribute name. Each attribute row has "Remove" that calls a helper rejecting removal when an active variant uses the attribute (≥2 active variants) — show inline error.

- [x] **Step 3: Render variant matrix**

For each cartesian combination of option arrays, render a row labelled with the attributes (read-only) and inputs for price, stock, barcode, image, active. Bind values to `editing.variants[i].*`.

- [x] **Step 4: Include attributesConfig & variants in the save payload**

Extend `toProductFormData` paths in `store-data.js` already done in Task 15 to carry `attributesConfig`. Variants are saved via the variant endpoints after product create; for product create, if no `attributesConfig` the existing single-variant default payload still flows. For product update with variants, after save loop variant endpoints to create/update/delete variants (or rely on dedicated UI controls).

- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/ProductsPage.jsx
git commit -m "Product form: variant attribute editor and variant matrix"
```

## Task 23: Frontend full test + lint

- [x] **Step 1: Run frontend tests**

Run: `cd frontend && bun run test`
Expected: PASS.

- [x] **Step 2: Run frontend build**

Run: `cd frontend && bun run build`
Expected: build succeeds.

- [x] **Step 3: Commit any fixture updates**

```bash
git add -A frontend && git commit -m "Verify frontend variant integration"
```

## Task 24: Backend full test + race

- [x] **Step 1: Format & vet**

Run: `cd backend && gofmt -w ./cmd ./internal && go vet ./...`
Expected: no errors.

- [x] **Step 2: Race tests**

Run: `cd backend && go test ./... -race`
Expected: PASS.

- [x] **Step 3: Commit formatting if changed**

```bash
git add -A backend && git commit -m "Format and verify backend variants"
```

---

## Notes for execution

- All Go placeholder placeholder constraints reference real SQL migrations written in Task 1.
- `ValidateProduct` (frontend) currently has no variant awareness; the form-side validation for variants lives in ProductsPage and the backend service.
- Cart storage (Task 16) must key by `productId+variantId` before adding dual-variant items or duplicate lines appear.
- Checkout stock movement insert now passes `requested.VariantID` (a `*uuid.UUID`) directly into the `product_variant_id` column; the column accepts NULL and existing rows stay NULL.