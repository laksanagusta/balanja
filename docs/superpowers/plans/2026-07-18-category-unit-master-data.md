# Category and Unit Master Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text product categories and units with tenant-scoped, editable, archivable master data that works consistently in Settings, Products, Cashier, and all product consumers.

**Architecture:** Add normalized `categories` and `units` tables with tenant-aware product foreign keys, expose explicit Go modules and REST endpoints for each entity, and make product requests use stable IDs while responses retain joined display names. The React store owns master collections; Settings manages them, Product selects or creates them inline, and current product displays resolve names by ID while transaction snapshots remain unchanged.

**Tech Stack:** PostgreSQL migrations and RLS, Go 1.24 with Fiber v3 and pgx v5, React 19, Vite 7, Tailwind CSS v4, Node test runner, Go tests.

**Branch constraint:** Execute in the current `codex/product-photo-r2` branch as requested. Keep every task in a separate commit because this branch also contains product-photo work.

---

## File Map

### Database and integration

- Create `backend/migrations/000010_category_unit_master_data.up.sql`: tables, deterministic backfill, product foreign keys, RLS, grants, indexes, and removal of text columns.
- Create `backend/migrations/000010_category_unit_master_data.down.sql`: restore product text projections before removing master tables.
- Create `backend/migrations/000010_category_unit_master_data_test.go`: migration contract assertions.
- Modify `backend/internal/integration/rls_test.go`: prove master rows and product references cannot cross tenants.
- Modify `backend/internal/integration/migration_forward_fix_test.go`: validate deterministic forward migration content.

### Backend feature modules

- Create `backend/internal/category/model.go`, `service.go`, `repository.go`, `handler.go`: category contract and persistence.
- Create `backend/internal/category/service_test.go`, `repository_test.go`, `handler_test.go`: category behavior.
- Create `backend/internal/unit/model.go`, `service.go`, `repository.go`, `handler.go`: unit contract and persistence.
- Create `backend/internal/unit/service_test.go`, `repository_test.go`, `handler_test.go`: unit behavior.
- Modify `backend/internal/platform/apperror/error.go` and `backend/internal/platform/respond/respond.go`: structured error details for archived-name conflicts and field errors.
- Modify `backend/cmd/api/main.go`: construct and register both handlers.

### Product backend

- Modify `backend/internal/product/model.go`: add category/unit IDs and switch inputs/filter to IDs.
- Modify `backend/internal/product/service.go`: validate stable references and preserve assigned archived references.
- Modify `backend/internal/product/repository.go`: joins, ID filtering, tenant-safe validation, and joined sorting.
- Modify `backend/internal/product/handler.go`: JSON and multipart ID fields plus error mapping.
- Modify `backend/internal/stock/repository.go`: join master tables for stock-history product projections and search.
- Modify `backend/internal/integration/server_list_indexes_test.go`: replace the removed text-category index contract.
- Modify product service, repository, handler, checkout, report, stock, dashboard, and integration tests that construct products directly.

### Frontend state and API

- Modify `frontend/src/pos/api-client.js` and `api-client.test.js`: master-data endpoints, error details, and `categoryId` product filter.
- Create `frontend/src/pos/master-data.js` and `master-data.test.js`: normalization, sorting, option building, and name resolution.
- Modify `frontend/src/pos/store.jsx` and `store.test.js`: master collections, load/mutation lifecycle, and refresh behavior.
- Modify `frontend/src/pos/store-data.js` and `store-data.test.js`: product ID payloads.

### Frontend UI and design system

- Create `frontend/src/components/settings/MasterDataManager.jsx`: reusable active/archive manager.
- Create `frontend/src/components/product/MasterDataSelectField.jsx`: finite selection plus inline create/restore.
- Create `frontend/src/components/design/MasterDataPatternsShowcase.jsx`: approved visual pattern.
- Modify `frontend/src/pages/DesignSystemPage.jsx` and `frontend/DESIGN.md`: document the pattern before feature-page integration.
- Modify `frontend/src/pages/SettingsPage.jsx`: query-backed Profile/Category/Unit tabs.
- Modify `frontend/src/pages/ProductsPage.jsx`: ID selections and inline create.
- Modify `frontend/src/pages/RetailPosPage.jsx`: ID-based active category tabs.
- Modify `frontend/src/pos/domain.js`: remove hard-coded category source and validate IDs.
- Modify `frontend/src/pages/ProductsPage.test.js`, `RetailPosPage.test.js`, `StockPage.test.js`, `DashboardPage.test.js`, `SalesReportPage.test.js`, `frontend/src/components/pos/pos-components.test.js`, `frontend/src/pos/api-client.test.js`, `store.test.js`, `store-data.test.js`, and `domain.test.js`.

## Task 1: Add the Normalized Database Migration

**Files:**
- Create: `backend/migrations/000010_category_unit_master_data.up.sql`
- Create: `backend/migrations/000010_category_unit_master_data.down.sql`
- Create: `backend/migrations/000010_category_unit_master_data_test.go`
- Modify: `backend/internal/integration/migration_forward_fix_test.go`

- [ ] **Step 1: Write the failing migration contract test**

```go
package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestCategoryUnitMasterDataMigrationContract(t *testing.T) {
	content, err := os.ReadFile("000010_category_unit_master_data.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, required := range []string{
		"create table categories",
		"create table units",
		"unique (org_id, id)",
		"lower(name)",
		"add column category_id uuid",
		"add column unit_id uuid",
		"foreign key (org_id, category_id)",
		"foreign key (org_id, unit_id)",
		"alter table categories force row level security",
		"alter table units force row level security",
		"drop column category",
		"drop column unit",
	} {
		if !strings.Contains(sql, required) {
			t.Errorf("migration missing %q", required)
		}
	}
}
```

- [ ] **Step 2: Run the migration test and verify it fails**

Run: `cd backend && go test ./migrations -run TestCategoryUnitMasterDataMigrationContract -v`

Expected: FAIL because `000010_category_unit_master_data.up.sql` does not exist.

- [ ] **Step 3: Write the forward and rollback migrations**

The forward migration must use this concrete sequence:

```sql
begin;

create table categories (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null check (name = btrim(name) and name <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create unique index categories_org_name_ci_key on categories (org_id, lower(name));

create table units (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null check (name = btrim(name) and name <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create unique index units_org_name_ci_key on units (org_id, lower(name));

insert into categories (org_id, name, created_at)
select org_id, category, created_at
from (
  select org_id, btrim(category) as category, created_at, id,
         row_number() over (partition by org_id, lower(btrim(category)) order by created_at, id) as position
  from products
) values_to_keep
where position = 1;

insert into units (org_id, name, created_at)
select org_id, unit, created_at
from (
  select org_id, btrim(unit) as unit, created_at, id,
         row_number() over (partition by org_id, lower(btrim(unit)) order by created_at, id) as position
  from products
) values_to_keep
where position = 1;

alter table products add column category_id uuid;
alter table products add column unit_id uuid;
update products p set category_id = c.id from categories c
where c.org_id = p.org_id and lower(c.name) = lower(btrim(p.category));
update products p set unit_id = u.id from units u
where u.org_id = p.org_id and lower(u.name) = lower(btrim(p.unit));
alter table products alter column category_id set not null;
alter table products alter column unit_id set not null;
alter table products add constraint products_category_tenant_fk
  foreign key (org_id, category_id) references categories (org_id, id);
alter table products add constraint products_unit_tenant_fk
  foreign key (org_id, unit_id) references units (org_id, id);
alter table products drop column category;
alter table products drop column unit;

create trigger categories_set_updated_at before update on categories
for each row execute function set_updated_at();
create trigger units_set_updated_at before update on units
for each row execute function set_updated_at();
alter table categories enable row level security;
alter table categories force row level security;
alter table units enable row level security;
alter table units force row level security;
create policy categories_tenant on categories to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
create policy units_tenant on units to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));
grant select, insert, update on categories, units to balanja_api;
commit;
```

Use this rollback sequence so a rollback preserves current names:

```sql
begin;
alter table products add column category text;
alter table products add column unit text;
update products p set category=c.name from categories c
where c.org_id=p.org_id and c.id=p.category_id;
update products p set unit=u.name from units u
where u.org_id=p.org_id and u.id=p.unit_id;
alter table products alter column category set not null;
alter table products alter column unit set not null;
alter table products add constraint products_category_not_blank check (btrim(category) <> '');
alter table products add constraint products_unit_not_blank check (btrim(unit) <> '');
create index products_org_category_id_idx on products (org_id,category,id);
alter table products drop constraint products_category_tenant_fk;
alter table products drop constraint products_unit_tenant_fk;
alter table products drop column category_id;
alter table products drop column unit_id;
drop policy categories_tenant on categories;
drop policy units_tenant on units;
drop table categories;
drop table units;
commit;
```

- [ ] **Step 4: Run migration contract and backend unit tests**

Run: `cd backend && go test ./migrations ./internal/integration -run 'TestCategoryUnitMasterDataMigrationContract|TestForwardFixMigrationAddsCategoryUnitMasterData' -v`

Expected: PASS.

- [ ] **Step 5: Commit the migration**

```bash
git add backend/migrations/000010_category_unit_master_data.up.sql backend/migrations/000010_category_unit_master_data.down.sql backend/migrations/000010_category_unit_master_data_test.go backend/internal/integration/migration_forward_fix_test.go
git commit -m "feat: normalize product category and unit data"
```

## Task 2: Build the Category Domain Module

**Files:**
- Create: `backend/internal/category/model.go`
- Create: `backend/internal/category/service.go`
- Create: `backend/internal/category/repository.go`
- Create: `backend/internal/category/service_test.go`
- Create: `backend/internal/category/repository_test.go`

- [ ] **Step 1: Write failing category service tests**

```go
func TestCreateNormalizesAndRejectsArchivedConflict(t *testing.T) {
	conflictID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	repository := &fakeRepository{createErr: &ArchivedNameConflict{ID: conflictID}}
	service := NewService(fakeRunner{}, repository)
	_, err := service.Create(context.Background(), database.Identity{OrgID: "org_a"}, WriteInput{Name: "  Minuman  "})
	var conflict *ArchivedNameConflict
	if !errors.As(err, &conflict) || conflict.ID != conflictID {
		t.Fatalf("Create() error = %#v", err)
	}
	if repository.input.Name != "Minuman" {
		t.Fatalf("normalized name = %q", repository.input.Name)
	}
}

func TestArchiveAndRestoreAreIdempotent(t *testing.T) {
	service := NewService(fakeRunner{}, &fakeRepository{})
	id := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	if _, err := service.Archive(context.Background(), database.Identity{OrgID: "org_a"}, id); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Restore(context.Background(), database.Identity{OrgID: "org_a"}, id); err != nil {
		t.Fatal(err)
	}
}
```

- [ ] **Step 2: Run category tests and verify they fail**

Run: `cd backend && go test ./internal/category -v`

Expected: FAIL because the package does not exist.

- [ ] **Step 3: Implement the category model and service contract**

```go
type Category struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type WriteInput struct { Name string `json:"name"` }

var (
	ErrInvalidName = errors.New("invalid category name")
	ErrNameConflict = errors.New("category name conflict")
	ErrNotFound = errors.New("category not found")
)

type ArchivedNameConflict struct { ID uuid.UUID }
func (e *ArchivedNameConflict) Error() string { return "archived category name conflict" }

type Repository interface {
	List(context.Context, database.Tx, string, bool) ([]Category, error)
	Create(context.Context, database.Tx, string, WriteInput) (Category, error)
	Rename(context.Context, database.Tx, string, uuid.UUID, WriteInput) (Category, error)
	SetActive(context.Context, database.Tx, string, uuid.UUID, bool) (Category, error)
}
```

`List` seeds the five category defaults only when `count(*)` for that organization is zero, then returns `order by lower(name), id`. `Create` and `Rename` trim names and map unique violations by querying the conflicting row: active becomes `ErrNameConflict`; archived becomes `&ArchivedNameConflict{ID: id}`. `SetActive` always writes the requested boolean and returns the row, making retries idempotent.

- [ ] **Step 4: Add repository query-shape tests and implementation**

Add this repository-level initialization test, then implement the repository with `pgx` scans and map `pgx.ErrNoRows` to `ErrNotFound`:

```go
func TestDefaultCategoriesAreStableAndAlphabetical(t *testing.T) {
	want := []string{"Minuman", "Perawatan", "Rumah Tangga", "Sembako", "Snack"}
	if !slices.Equal(defaultCategoryNames, want) {
		t.Fatalf("defaultCategoryNames = %#v", defaultCategoryNames)
	}
}
```

The `List` transaction first executes `insert into categories (org_id,name) select $1,name from unnest($2::text[]) name where not exists (select 1 from categories where org_id=$1) on conflict do nothing`, then selects `where org_id=$1 and ($2 or active) order by lower(name),id`. Repository query tests must assert those exact clauses.

- [ ] **Step 5: Run category tests**

Run: `cd backend && go test ./internal/category -v`

Expected: PASS.

- [ ] **Step 6: Commit the category module**

```bash
git add backend/internal/category
git commit -m "feat: add category master data service"
```

## Task 3: Build the Unit Domain Module

**Files:**
- Create: `backend/internal/unit/model.go`
- Create: `backend/internal/unit/service.go`
- Create: `backend/internal/unit/repository.go`
- Create: `backend/internal/unit/service_test.go`
- Create: `backend/internal/unit/repository_test.go`

- [ ] **Step 1: Write failing unit service tests**

```go
func TestDefaultUnitsAreStableAndAlphabetical(t *testing.T) {
	want := []string{"botol", "karton", "karung", "kg", "pack", "pcs", "renteng"}
	if !slices.Equal(defaultUnitNames, want) {
		t.Fatalf("defaultUnitNames = %#v", defaultUnitNames)
	}
}

func TestRenameTrimsUnitName(t *testing.T) {
	repository := &fakeRepository{}
	service := NewService(fakeRunner{}, repository)
	_, err := service.Rename(context.Background(), database.Identity{OrgID: "org_a"}, uuid.New(), WriteInput{Name: "  kg  "})
	if err != nil {
		t.Fatal(err)
	}
	if repository.input.Name != "kg" {
		t.Fatalf("name = %q", repository.input.Name)
	}
}
```

- [ ] **Step 2: Run unit tests and verify they fail**

Run: `cd backend && go test ./internal/unit -v`

Expected: FAIL because the package does not exist.

- [ ] **Step 3: Implement the explicit unit contract**

Seed exactly `pcs`, `pack`, `botol`, `kg`, `karung`, `renteng`, and `karton`; return them using `order by lower(name), id`. Do not introduce a generic master-data type or unit conversion fields.

```go
type Unit struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type WriteInput struct { Name string `json:"name"` }

var (
	ErrInvalidName = errors.New("invalid unit name")
	ErrNameConflict = errors.New("unit name conflict")
	ErrNotFound = errors.New("unit not found")
)

type ArchivedNameConflict struct { ID uuid.UUID }
func (e *ArchivedNameConflict) Error() string { return "archived unit name conflict" }

type Repository interface {
	List(context.Context, database.Tx, string, bool) ([]Unit, error)
	Create(context.Context, database.Tx, string, WriteInput) (Unit, error)
	Rename(context.Context, database.Tx, string, uuid.UUID, WriteInput) (Unit, error)
	SetActive(context.Context, database.Tx, string, uuid.UUID, bool) (Unit, error)
}
```

The unit `List` repository executes `insert into units (org_id,name) select $1,name from unnest($2::text[]) name where not exists (select 1 from units where org_id=$1) on conflict do nothing`, then selects `where org_id=$1 and ($2 or active) order by lower(name),id`. Map unique conflicts and `pgx.ErrNoRows` to the unit-specific errors above.

- [ ] **Step 4: Run unit tests**

Run: `cd backend && go test ./internal/unit -v`

Expected: PASS.

- [ ] **Step 5: Commit the unit module**

```bash
git add backend/internal/unit
git commit -m "feat: add unit master data service"
```

## Task 4: Expose Category and Unit HTTP APIs

**Files:**
- Create: `backend/internal/category/handler.go`
- Create: `backend/internal/category/handler_test.go`
- Create: `backend/internal/unit/handler.go`
- Create: `backend/internal/unit/handler_test.go`
- Modify: `backend/internal/platform/apperror/error.go`
- Modify: `backend/internal/platform/respond/respond.go`
- Modify: `backend/cmd/api/main.go`

- [ ] **Step 1: Write failing response-detail and handler tests**

```go
func TestArchivedConflictIncludesRecordID(t *testing.T) {
	id := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	app := categoryHandlerApp(serviceReturning(&ArchivedNameConflict{ID: id}))
	response, err := app.Test(jsonRequest(http.MethodPost, "/categories", `{"name":"Minuman"}`))
	if err != nil {
		t.Fatal(err)
	}
	var envelope struct {
		Error struct {
			Code string `json:"code"`
			Details map[string]string `json:"details"`
		} `json:"error"`
	}
	json.NewDecoder(response.Body).Decode(&envelope)
	if response.StatusCode != 409 || envelope.Error.Code != "CATEGORY_ARCHIVED_NAME_CONFLICT" || envelope.Error.Details["id"] != id.String() {
		t.Fatalf("status=%d envelope=%#v", response.StatusCode, envelope)
	}
}
```

- [ ] **Step 2: Run handler tests and verify they fail**

Run: `cd backend && go test ./internal/category ./internal/unit ./internal/platform/... -run 'ArchivedConflict|Handler' -v`

Expected: FAIL because handlers and error details do not exist.

- [ ] **Step 3: Extend the public application error safely**

```go
type Error struct {
	Code    string
	Message string
	Status  int
	Details map[string]any
	Cause   error
}

func WithDetails(err *Error, details map[string]any) *Error {
	err.Details = details
	return err
}
```

Add `details` to the response envelope only when non-empty. Extend frontend parsing in Task 6; existing clients remain compatible.

- [ ] **Step 4: Implement explicit handlers and routes**

Register category routes under `/categories` and unit routes under `/units`. Parse UUIDs with a `400 INVALID_CATEGORY_ID` or `400 INVALID_UNIT_ID`; decode bodies with unknown-field rejection; map errors to the exact codes from the approved design. `GET` parses `includeArchived` as a boolean. `POST` returns 201; PUT/archive/restore return 200.

```go
func (h *Handler) Register(group fiber.Router) {
	group.Get("/categories", h.list)
	group.Post("/categories", h.create)
	group.Put("/categories/:id", h.rename)
	group.Post("/categories/:id/archive", h.archive)
	group.Post("/categories/:id/restore", h.restore)
}
```

- [ ] **Step 5: Wire handlers in `backend/cmd/api/main.go` and run tests**

Run: `cd backend && gofmt -w internal/category internal/unit internal/platform cmd/api && go test ./internal/category ./internal/unit ./internal/platform/... ./cmd/api -v`

Expected: PASS.

- [ ] **Step 6: Commit the HTTP contract**

```bash
git add backend/internal/category backend/internal/unit backend/internal/platform/apperror/error.go backend/internal/platform/respond/respond.go backend/cmd/api/main.go
git commit -m "feat: expose category and unit APIs"
```

## Task 5: Move Product APIs to Master Data IDs

**Files:**
- Modify: `backend/internal/product/model.go`
- Modify: `backend/internal/product/service.go`
- Modify: `backend/internal/product/repository.go`
- Modify: `backend/internal/product/handler.go`
- Modify: `backend/internal/stock/repository.go`
- Modify: `backend/internal/integration/server_list_indexes_test.go`
- Modify: `backend/internal/product/service_test.go`
- Modify: `backend/internal/product/repository_test.go`
- Modify: `backend/internal/product/handler_test.go`
- Modify: `backend/internal/dashboard/service_test.go`
- Modify: `backend/internal/integration/checkout_test.go`
- Modify: `backend/internal/integration/rls_test.go`
- Modify: `backend/internal/stock/service_test.go`

- [ ] **Step 1: Write failing product-reference tests**

```go
func TestUpdateAllowsCurrentArchivedReferencesButRejectsNewOnes(t *testing.T) {
	currentCategory := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	currentUnit := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	repository := &fakeRepository{
		current: Product{CategoryID: currentCategory, UnitID: currentUnit},
		validReference: false,
	}
	service := NewService(fakeRunner{}, repository)
	input := UpdateInput{Name: "Tea", Barcode: "1", CategoryID: currentCategory, UnitID: currentUnit, Price: 100, Active: true}
	if _, err := service.Update(context.Background(), identity, uuid.New(), input); err != nil {
		t.Fatalf("preserving archived references: %v", err)
	}
	input.CategoryID = uuid.New()
	if _, err := service.Update(context.Background(), identity, uuid.New(), input); !errors.Is(err, ErrInvalidReference) {
		t.Fatalf("new archived reference error = %v", err)
	}
}
```

- [ ] **Step 2: Run focused product tests and verify they fail**

Run: `cd backend && go test ./internal/product -run 'Reference|ProductOrder|Multipart' -v`

Expected: FAIL because ID fields and reference validation do not exist.

- [ ] **Step 3: Change product types and multipart fields**

```go
type Product struct {
	ID uuid.UUID `json:"id"`
	Name string `json:"name"`
	Barcode string `json:"barcode"`
	CategoryID uuid.UUID `json:"categoryId"`
	Category string `json:"category"`
	Price int `json:"price"`
	Stock int `json:"stock"`
	UnitID uuid.UUID `json:"unitId"`
	Unit string `json:"unit"`
	Image string `json:"image"`
	ImageKey string `json:"-"`
	Active bool `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ListFilter struct { CategoryID uuid.UUID }
type CreateInput struct {
	Name string `json:"name"`
	Barcode string `json:"barcode"`
	CategoryID uuid.UUID `json:"categoryId"`
	Price int `json:"price"`
	Stock int `json:"stock"`
	UnitID uuid.UUID `json:"unitId"`
	Image string `json:"image"`
	ImageKey string `json:"-"`
}
type UpdateInput struct {
	Name string `json:"name"`
	Barcode string `json:"barcode"`
	CategoryID uuid.UUID `json:"categoryId"`
	Price int `json:"price"`
	UnitID uuid.UUID `json:"unitId"`
	Image string `json:"image"`
	ImageKey string `json:"-"`
	PreserveImage bool `json:"-"`
	Active bool `json:"active"`
}
```

Use explicit fields rather than grouped declarations in the final code so JSON tags remain correct. Multipart names are `categoryId` and `unitId`.

- [ ] **Step 4: Implement repository joins and validation**

Product selects join `categories c on c.org_id=p.org_id and c.id=p.category_id` and `units u on u.org_id=p.org_id and u.id=p.unit_id`. Sort category by `lower(c.name)`. Search category through `c.name`. Filter with `p.category_id=$3::uuid`. Add repository methods to load current references and validate that submitted references are active in the same tenant. Change stock-history queries to join both master tables and project `c.name`/`u.name`; change stock search from `p.category` to `c.name`. Replace the obsolete `products_org_category_id_idx` text-column assertion with the category foreign-key/index contract introduced by migration 000010.

- [ ] **Step 5: Update service validation and error mapping**

Create requires non-zero IDs and active references. Update allows a non-active reference only when it equals the existing product reference for that field. Map invalid references to `422 INVALID_PRODUCT_REFERENCE` with `details.field` equal to `categoryId` or `unitId`.

- [ ] **Step 6: Update all backend fixtures and run the backend suite**

Replace direct product inserts with seeded category/unit IDs in integration fixtures. Preserve transaction JSON assertions unchanged.

Run: `cd backend && gofmt -w internal cmd migrations && go test ./...`

Expected: PASS, with integration-tag tests skipped unless `TEST_DATABASE_URL` is configured.

- [ ] **Step 7: Commit product reference support**

```bash
git add backend/internal backend/cmd backend/migrations
git commit -m "feat: reference product master data by id"
```

## Task 6: Add Frontend Master Data API and Store State

**Files:**
- Modify: `frontend/src/pos/api-client.js`
- Modify: `frontend/src/pos/api-client.test.js`
- Create: `frontend/src/pos/master-data.js`
- Create: `frontend/src/pos/master-data.test.js`
- Modify: `frontend/src/pos/store.jsx`
- Modify: `frontend/src/pos/store.test.js`
- Modify: `frontend/src/pos/store-data.js`
- Modify: `frontend/src/pos/store-data.test.js`

- [ ] **Step 1: Write failing API and helper tests**

```js
test("master data API preserves archived conflict details", async () => {
  const api = createAPIClient({ getToken: async () => "token", fetchImpl: async () => new Response(JSON.stringify({
    error: { code: "CATEGORY_ARCHIVED_NAME_CONFLICT", message: "Archived", details: { id: "cat-1" } },
  }), { status: 409, headers: { "Content-Type": "application/json" } }) });
  await assert.rejects(() => api.createCategory({ name: "Minuman" }), (error) => error.details.id === "cat-1");
});

test("activeMasterOptions sorts active records and retains current archived value", () => {
  const items = [{ id: "b", name: "Snack", active: true }, { id: "a", name: "Lama", active: false }];
  assert.deepEqual(activeMasterOptions(items, "a"), [
    { value: "a", label: "Lama (Diarsipkan)", archived: true },
    { value: "b", label: "Snack", archived: false },
  ]);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `cd frontend && node --test src/pos/api-client.test.js src/pos/master-data.test.js src/pos/store-data.test.js`

Expected: FAIL because the API methods, `details`, and helpers do not exist.

- [ ] **Step 3: Implement API methods and product payload IDs**

Add `details = {}` to `APIError`. Add `listCategories`, `createCategory`, `renameCategory`, `archiveCategory`, `restoreCategory`, and the six parallel unit methods. Change product list query key from `category` to `categoryId`. Change `toProductPayload` to emit trimmed `categoryId` and `unitId` rather than names.

```js
async listCategories({ includeArchived = false, signal } = {}) {
  const query = listQuery({ includeArchived }, ["includeArchived"]);
  return (await request(`/api/v1/categories${query}`, { signal })).data;
}
async createCategory(input, options = {}) {
  return (await request("/api/v1/categories", { ...options, method: "POST", body: input })).data;
}
```

- [ ] **Step 4: Implement pure master-data helpers**

```js
export function sortMasterData(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) =>
    left.name.localeCompare(right.name, "id", { sensitivity: "base" }) || left.id.localeCompare(right.id));
}

export function activeMasterOptions(items, currentId = "") {
  return sortMasterData(items)
    .filter((item) => item.active || item.id === currentId)
    .map((item) => ({ value: item.id, label: `${item.name}${item.active ? "" : " (Diarsipkan)"}`, archived: !item.active }));
}

export function resolveMasterName(items, id, fallback = "") {
  return items.find((item) => item.id === id)?.name || fallback;
}
```

- [ ] **Step 5: Add store state and mutations**

Add `categories` and `units` to state, loading, loaded, last-loaded timestamps, refs, stale refresh, and public value. Implement `loadCategories({ includeArchived, force, signal })` and `loadUnits` plus entity-specific create/rename/archive/restore callbacks. Successful mutations replace or append the returned record and sort through `sortMasterData`; errors are rethrown so field-level UI can handle them without losing details.

- [ ] **Step 6: Run focused frontend tests**

Run: `cd frontend && node --test src/pos/api-client.test.js src/pos/master-data.test.js src/pos/store-data.test.js src/pos/store.test.js`

Expected: PASS.

- [ ] **Step 7: Commit frontend data support**

```bash
git add frontend/src/pos
git commit -m "feat: add frontend master data state"
```

## Task 7: Add the Master Data Design-System Patterns First

**Files:**
- Create: `frontend/src/components/settings/MasterDataManager.jsx`
- Create: `frontend/src/components/product/MasterDataSelectField.jsx`
- Create: `frontend/src/components/design/MasterDataPatternsShowcase.jsx`
- Create: `frontend/src/components/settings/MasterDataManager.test.js`
- Create: `frontend/src/components/product/MasterDataSelectField.test.js`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Write failing source-contract tests for the approved pattern**

```js
test("master data manager exposes active, archived, rename, archive, and restore controls", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  for (const label of ["Diarsipkan", "Ubah nama", "Arsipkan", "Pulihkan"]) assert.match(source, new RegExp(label));
});

test("master data select preserves inline errors and offers restore", async () => {
  const source = await readFile(new URL("./MasterDataSelectField.jsx", import.meta.url), "utf8");
  assert.match(source, /ARCHIVED_NAME_CONFLICT/);
  assert.match(source, /Pulihkan/);
  assert.match(source, /onCreated/);
});
```

- [ ] **Step 2: Run component tests and verify they fail**

Run: `cd frontend && node --test src/components/settings/MasterDataManager.test.js src/components/product/MasterDataSelectField.test.js`

Expected: FAIL because both components do not exist.

- [ ] **Step 3: Implement `MasterDataManager`**

The component receives `{ singularLabel, pluralLabel, items, loading, onCreate, onRename, onArchive, onRestore }`. Keep independent pending IDs, inline error text, an add input, alphabetized active rows, a disclosure for archived rows, a rename dialog, and an archive confirmation dialog. It never owns API access and never hard-deletes.

- [ ] **Step 4: Implement `MasterDataSelectField`**

The component wraps `SelectField` with `{ entityLabel, value, items, error, disabled, onChange, onCreate, onRestore }`. It builds active options with `activeMasterOptions`, preserves the current archived option, exposes an inline create row, catches archived-conflict codes, offers restore, and calls `onChange(saved.id)` after create or restore.

- [ ] **Step 5: Document and showcase the pattern before page integration**

Add `MasterDataPatternsShowcase` to `DesignSystemPage`. Update `frontend/DESIGN.md` with these exact rules: Settings uses query-backed neutral tabs; master lists keep active rows visible during mutations; archive is reversible; finite product selectors offer inline create; current archived values remain visible but cannot be newly assigned; and all lists are alphabetical.

- [ ] **Step 6: Run component and design-system tests**

Run: `cd frontend && node --test src/components/settings/MasterDataManager.test.js src/components/product/MasterDataSelectField.test.js src/pages/DesignSystemPage.test.js`

Expected: PASS. If `DesignSystemPage.test.js` does not exist, create it with a source assertion for `MasterDataPatternsShowcase` before running.

- [ ] **Step 7: Commit the design-system update**

```bash
git add frontend/DESIGN.md frontend/src/components/settings frontend/src/components/product/MasterDataSelectField.jsx frontend/src/components/product/MasterDataSelectField.test.js frontend/src/components/design/MasterDataPatternsShowcase.jsx frontend/src/pages/DesignSystemPage.jsx frontend/src/pages/DesignSystemPage.test.js
git commit -m "feat: define master data interface patterns"
```

## Task 8: Build Query-Backed Settings Tabs

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/SettingsPage.jsx`
- Create: `frontend/src/pages/SettingsPage.test.js`
- Modify: `frontend/src/components/page-loading.jsx`

- [ ] **Step 1: Write failing Settings behavior tests**

```js
test("settings tabs use query parameters with profile fallback", async () => {
  const source = await readFile(new URL("./SettingsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /tab=profile/);
  assert.match(source, /tab=categories/);
  assert.match(source, /tab=units/);
  assert.match(source, /Profil toko/);
  assert.match(source, /MasterDataManager/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd frontend && node --test src/pages/SettingsPage.test.js`

Expected: FAIL because Settings has no tabs.

- [ ] **Step 3: Preserve search parameters in app navigation state**

Change `usePathname` to keep `{ pathname, search }` in state and update both fields on `popstate` and `navigate`. Continue routing pages by `location.pathname`, pass `location.search` into `SettingsPage`, and implement `onTabChange={(tab) => navigate(`/settings?tab=${tab}`)}`. This makes browser Back rerender Settings even when only the query changes.

- [ ] **Step 4: Implement the three Settings tabs**

Normalize tab values to `profile`, `categories`, or `units`, defaulting to `profile`. Load settings only for Profile; load the selected master collection with `includeArchived: true` for Category or Unit. Render `MasterDataManager` with Indonesian entity-specific labels and store mutation callbacks. Retain settled content and show compact updating state.

- [ ] **Step 5: Update the Settings skeleton and run tests**

Run: `cd frontend && node --test src/pages/SettingsPage.test.js src/App.test.js src/routing.test.js`

Expected: PASS.

- [ ] **Step 6: Commit Settings management**

```bash
git add frontend/src/App.jsx frontend/src/pages/SettingsPage.jsx frontend/src/pages/SettingsPage.test.js frontend/src/components/page-loading.jsx
git commit -m "feat: manage categories and units in settings"
```

## Task 9: Replace Product Free Text with Master Data Selectors

**Files:**
- Modify: `frontend/src/pages/ProductsPage.jsx`
- Modify: `frontend/src/pages/ProductsPage.test.js`
- Modify: `frontend/src/pos/domain.js`
- Modify: `frontend/src/pos/domain.test.js`
- Modify: `frontend/src/pos/product-save.js`
- Modify: `frontend/src/pos/store-data.test.js`

- [ ] **Step 1: Write failing product form tests**

```js
test("product editor uses category and unit IDs with inline creation", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /categoryId/);
  assert.match(source, /unitId/);
  assert.match(source, /MasterDataSelectField/);
  assert.doesNotMatch(source, /label="Satuan"[\s\S]{0,200}<Input/);
});
```

- [ ] **Step 2: Run product tests and verify they fail**

Run: `cd frontend && node --test src/pages/ProductsPage.test.js src/pos/domain.test.js src/pos/store-data.test.js`

Expected: FAIL because the product draft still uses free-text fields.

- [ ] **Step 3: Change product validation and draft defaults**

`emptyProduct` receives the first active category and unit IDs after master data loads. `validateProduct` returns `Category is required` for a blank `categoryId` and `Unit is required` for a blank `unitId`; it no longer validates category/unit name strings.

- [ ] **Step 4: Load master data and integrate selectors**

Load active categories and units before opening a new editor. Replace category `SelectField` and unit `Input` with `MasterDataSelectField`. Pass current archived IDs during edit, store ID changes in the draft, and use store create/restore callbacks. Product filter options use active category IDs and submit `categoryId`. Resolve table category and unit labels by ID through the current master collections, falling back to joined response strings, so rename is visible on the page-local cursor result immediately.

- [ ] **Step 5: Run product and store tests**

Run: `cd frontend && node --test src/pages/ProductsPage.test.js src/pos/domain.test.js src/pos/store-data.test.js src/pos/store.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the Product integration**

```bash
git add frontend/src/pages/ProductsPage.jsx frontend/src/pages/ProductsPage.test.js frontend/src/pos/domain.js frontend/src/pos/domain.test.js frontend/src/pos/product-save.js frontend/src/pos/store-data.test.js
git commit -m "feat: select product category and unit master data"
```

## Task 10: Make Cashier and Product Consumers Resolve Current Names

**Files:**
- Modify: `frontend/src/pages/RetailPosPage.jsx`
- Modify: `frontend/src/pages/RetailPosPage.test.js`
- Modify: `frontend/src/components/pos/ProductCatalog.jsx`
- Modify: `frontend/src/components/pos/ProductCard.jsx`
- Modify: `frontend/src/pages/StockPage.jsx`
- Modify: `frontend/src/pages/DashboardPage.test.js`
- Modify: `frontend/src/pages/SalesReportPage.test.js`
- Modify: `frontend/src/pages/StockPage.test.js`
- Modify: `frontend/src/pos/store.test.js`
- Modify: `frontend/src/pos/domain.test.js`

- [ ] **Step 1: Write failing Cashier category behavior tests**

```js
test("cashier category tabs are active ID-based values with Semua first", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  assert.match(source, /categoryId/);
  assert.match(source, /activeCategories/);
  assert.match(source, />Semua</);
  assert.doesNotMatch(source, /retailCategories/);
});
```

- [ ] **Step 2: Run consumer tests and verify they fail**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js src/components/pos/pos-components.test.js src/stock/movement-preview.test.js`

Expected: FAIL because Cashier still imports hard-coded category strings.

- [ ] **Step 3: Implement ID-based Cashier filters**

Load categories with products and settings. Keep selected category ID as `""` for `Semua`. Render `Semua` first and active categories from the alphabetized store collection. Filter products by `product.categoryId`; archived-category products remain visible only with `Semua` and search. Preserve keyboard and `aria-pressed` behavior.

- [ ] **Step 4: Resolve current names in consumers**

Where a consumer renders a product, resolve category and unit from master collections by ID and fall back to joined `product.category` and `product.unit`. Do not alter transaction item rendering: transaction snapshots must remain historical. Update stock movement preview only when it consumes a live product; stock history continues using its stored response projection.

- [ ] **Step 5: Run consumer regression tests**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js src/components/pos/pos-components.test.js src/pages/DashboardPage.test.js src/pages/SalesReportPage.test.js src/stock/movement-preview.test.js`

Expected: PASS.

- [ ] **Step 6: Commit consumer integration**

```bash
git add frontend/src/pages frontend/src/components/pos frontend/src/stock frontend/src/dashboard
git commit -m "feat: use master data across product consumers"
```

## Task 11: Verify Tenant Safety, Migrations, Accessibility, and Full Regression

**Files:**
- Modify: `backend/internal/integration/rls_test.go`
- Modify: `backend/internal/integration/migration_forward_fix_test.go`
- Modify: any failing tests directly caused by the feature
- Do not modify unrelated production behavior to silence failures

- [ ] **Step 1: Add the integration assertions before running them**

Extend RLS coverage to create category and unit records for `org_a` and `org_b`, verify each role sees only its own rows, and assert that an `org_a` product cannot reference an `org_b` category or unit. Add a forward-migration integration case that starts with case-variant legacy values and verifies one canonical record plus valid product references after migration.

- [ ] **Step 2: Run database integration tests when configured**

Run: `cd backend && go test -tags=integration ./internal/integration -v`

Expected: PASS when `TEST_DATABASE_URL` is configured; otherwise tests explicitly SKIP with the existing environment message.

- [ ] **Step 3: Run formatting and complete backend verification**

Run: `cd backend && gofmt -w ./cmd ./internal ./migrations && go vet ./... && go test ./... -race`

Expected: all commands exit 0.

- [ ] **Step 4: Run complete frontend verification**

Run: `cd frontend && npm run test && npm run build`

Expected: all tests PASS and Vite build exits 0.

- [ ] **Step 5: Perform focused visual and accessibility checks**

Run the app at desktop and compact widths. Verify Settings tab focus order, archived disclosure, confirmation dialogs, inline error association, minimum touch targets, no overflow, Product inline create preserving the draft, Cashier `aria-pressed`, and reduced-motion behavior. Confirm `/design-system` shows the same patterns used in production.

- [ ] **Step 6: Confirm design documentation synchronization**

Run: `git diff --check && rg -n "master data|Kategori|Satuan|Diarsipkan" frontend/DESIGN.md frontend/src/pages/DesignSystemPage.jsx frontend/src/components/design/MasterDataPatternsShowcase.jsx`

Expected: no whitespace errors and matches in all three design-system surfaces.

- [ ] **Step 7: Commit final integration-test corrections**

```bash
git add backend/internal/integration frontend/DESIGN.md frontend/src
git commit -m "test: verify category and unit master data"
```

If Step 7 has no changes because every integration assertion was committed earlier, skip the empty commit and record the clean status in the execution handoff.

## Final Acceptance Check

- [ ] Categories and units are tenant-isolated, alphabetized, case-insensitively unique, renameable, archivable, and restorable.
- [ ] Default rows seed independently only when the corresponding master-data type has no rows.
- [ ] Products require stable active IDs for new assignments and preserve existing archived assignments.
- [ ] Product responses keep joined names; completed transaction snapshots are unchanged.
- [ ] Settings, Product inline creation, Cashier filtering, and other consumers use the same master collections.
- [ ] `frontend/DESIGN.md`, `/design-system`, and production pages agree.
- [ ] Backend unit, race, integration, frontend test, and frontend build checks pass.
