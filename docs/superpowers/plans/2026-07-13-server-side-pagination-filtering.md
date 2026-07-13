# Server-Side Pagination And Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace partial client-side table pagination, filtering, and sorting with consistent server-backed cursor pagination for Products, Transactions, and Stock movements.

**Architecture:** Add one shared opaque cursor codec in Go, then let each resource own its allowlisted filters, sort expressions, and typed cursor value. On the frontend, keep server-page rows local to each operational page, coordinate requests through `useCursorTable`, and render a controlled `TablePagination` below the presentational `DataTable`. Preserve the full shared product cache used by POS; catalog pagination must never overwrite it.

**Tech Stack:** Go 1.24, Fiber v3, pgx v5, PostgreSQL keyset pagination, React 19, Tailwind CSS v4, Node test runner, Vite 7.

---

## Execution Prerequisite

The primary workspace currently contains uncommitted Stock management, sorting, loading-state, API, and design-system changes that are not present in this worktree's `8f48d3e` baseline. Before implementing Task 1, create a user-approved baseline commit containing those existing changes and bring it onto `codex/server-side-pagination`. Do not copy `.env` files and do not start implementation from the old worktree snapshot: `backend/internal/stock`, `frontend/src/pages/StockPage.jsx`, and `frontend/src/lib/sorting.js` are required inputs to this plan.

After integrating that baseline, verify:

```bash
cd backend && go test ./...
cd ../frontend && npm run test
```

Expected: both commands exit 0 before pagination work begins.

## File Structure

### Backend

- Create `backend/internal/platform/cursor/cursor.go`: shared versioned cursor encoding, decoding, and query fingerprinting.
- Create `backend/internal/platform/cursor/cursor_test.go`: codec, tampering, and compatibility tests.
- Modify `backend/internal/product/{model,handler,service,repository}.go`: product filters, sort allowlist, typed keyset predicate, page envelope.
- Modify `backend/internal/product/{service,repository}_test.go`: product query validation and page-boundary tests.
- Modify `backend/internal/transaction/{model,handler,service,repository}.go`: transaction filters and dynamic keyset sorting.
- Modify `backend/internal/transaction/{service,repository}_test.go`: transaction filter and cursor tests.
- Modify `backend/internal/stock/{model,handler,service,repository}.go`: shared cursor contract and server-side sorting.
- Modify `backend/internal/stock/{service,repository}_test.go`: stock sort and duplicate-boundary tests.
- Create `backend/migrations/000008_server_list_indexes.{up,down}.sql`: focused indexes for allowlisted list ordering.
- Create `backend/internal/integration/server_list_indexes_test.go`: migration contract test.

### Frontend

- Modify `frontend/src/pos/api-client.js`: preserve page metadata and serialize all list query parameters.
- Modify `frontend/src/pos/api-client.test.js`: API request/response contract tests.
- Modify `frontend/src/pos/store-data.js` and its tests: normalize page items without discarding metadata.
- Create `frontend/src/lib/cursor-pagination.js` and `.test.js`: pure cursor-history state transitions.
- Create `frontend/src/hooks/useCursorTable.js`: request lifecycle, abort, stale-response protection, and settled-row preservation.
- Create `frontend/src/components/TablePagination.jsx`: controlled Previous/Next footer.
- Create `frontend/src/components/TablePagination.test.js`: source contract and range tests.
- Create `frontend/src/components/TableFilterPopover.jsx`: anchored non-modal transaction filters.
- Modify `frontend/src/components/primitives.jsx`: remove client pagination ownership from `DataTable`.
- Modify `frontend/src/pages/{Products,Transactions,Stock}Page.jsx`: page-local server queries and visible filters.
- Modify `frontend/src/pos/store.jsx` and tests: remove partial history-list ownership while preserving mutations and POS product cache.
- Modify `frontend/src/components/design/DataTableShowcase.jsx`, `frontend/src/pages/DesignSystemPage.jsx`, and `frontend/DESIGN.md`: document and demonstrate the controlled server-table contract.

## Task 1: Shared Backend Cursor Contract

**Files:**
- Create: `backend/internal/platform/cursor/cursor.go`
- Create: `backend/internal/platform/cursor/cursor_test.go`

- [ ] **Step 1: Write failing cursor tests**

```go
package cursor

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestEncodeDecode(t *testing.T) {
	value, _ := json.Marshal("Teh")
	want := Payload{Version: CurrentVersion, Sort: "name", Direction: "asc", Fingerprint: Fingerprint("products", "q=", "limit=20"), Value: value, ID: uuid.New()}
	raw, err := Encode(want)
	if err != nil { t.Fatal(err) }
	got, err := Decode(raw)
	if err != nil { t.Fatal(err) }
	if got.Sort != want.Sort || got.Direction != want.Direction || got.Fingerprint != want.Fingerprint || got.ID != want.ID || string(got.Value) != string(want.Value) {
		t.Fatalf("decoded payload = %#v, want %#v", got, want)
	}
}

func TestDecodeRejectsInvalidPayload(t *testing.T) {
	for _, raw := range []string{"not-base64", "e30"} {
		if _, err := Decode(raw); err != ErrInvalid { t.Fatalf("Decode(%q) err=%v, want ErrInvalid", raw, err) }
	}
}

func TestCompatibleRejectsDifferentQuery(t *testing.T) {
	payload := Payload{Version: CurrentVersion, Sort: "name", Direction: "asc", Fingerprint: "one", Value: json.RawMessage(`"Tea"`), ID: uuid.New()}
	if err := Compatible(payload, "name", "asc", "two"); err != ErrInvalid { t.Fatalf("err=%v, want ErrInvalid", err) }
}
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd backend && go test ./internal/platform/cursor -run Test -v`

Expected: FAIL because the package and exported contract do not exist.

- [ ] **Step 3: Implement the shared codec**

```go
package cursor

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
)

const CurrentVersion = 1

var ErrInvalid = errors.New("invalid cursor")

type Payload struct {
	Version     int             `json:"v"`
	Sort        string          `json:"s"`
	Direction   string          `json:"d"`
	Fingerprint string          `json:"f"`
	Value       json.RawMessage `json:"x"`
	ID          uuid.UUID       `json:"id"`
}

func Fingerprint(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(sum[:])
}

func Encode(payload Payload) (string, error) {
	if payload.Version != CurrentVersion || payload.Sort == "" || (payload.Direction != "asc" && payload.Direction != "desc") || payload.Fingerprint == "" || len(payload.Value) == 0 || payload.ID == uuid.Nil {
		return "", ErrInvalid
	}
	value, err := json.Marshal(payload)
	if err != nil { return "", ErrInvalid }
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func Decode(raw string) (Payload, error) {
	var payload Payload
	value, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil || json.Unmarshal(value, &payload) != nil {
		return Payload{}, ErrInvalid
	}
	if _, err = Encode(payload); err != nil { return Payload{}, ErrInvalid }
	return payload, nil
}

func Compatible(payload Payload, sort, direction, fingerprint string) error {
	if payload.Sort != sort || payload.Direction != direction || payload.Fingerprint != fingerprint { return ErrInvalid }
	return nil
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `cd backend && go test ./internal/platform/cursor -v`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/platform/cursor
git commit -m "feat: add shared list cursor contract"
```

## Task 2: Products Server Pagination, Filters, And Sorting

**Files:**
- Modify: `backend/internal/product/model.go`
- Modify: `backend/internal/product/handler.go`
- Modify: `backend/internal/product/service.go`
- Modify: `backend/internal/product/repository.go`
- Modify: `backend/internal/product/service_test.go`
- Modify: `backend/internal/product/repository_test.go`

- [ ] **Step 1: Write failing product service tests**

Extend the fake repository to capture `ListFilter`, then add:

```go
func TestServiceListNormalizesProductQuery(t *testing.T) {
	repo := &capturingRepository{}
	service := NewService(fakeRunner{}, repo)
	page, err := service.List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Query: " tea ", Category: " Drinks ", Active: boolPtr(true), Limit: 20, Sort: "name", Direction: "asc",
	})
	if err != nil { t.Fatal(err) }
	if repo.filter.Query != "tea" || repo.filter.Category != "Drinks" { t.Fatalf("filter=%#v", repo.filter) }
	if page.Items == nil || page.HasNextPage { t.Fatalf("page=%#v", page) }
}

func TestServiceListRejectsUnsupportedProductSort(t *testing.T) {
	service := NewService(fakeRunner{}, &capturingRepository{})
	_, err := service.List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{Sort: "barcode", Direction: "asc", Limit: 20})
	if !errors.Is(err, ErrInvalidProduct) { t.Fatalf("err=%v", err) }
}
```

- [ ] **Step 2: Run product tests and verify RED**

Run: `cd backend && go test ./internal/product -run 'TestServiceList' -v`

Expected: FAIL because `Page`, `Sort`, `Direction`, `Category`, and `Active` are not implemented.

- [ ] **Step 3: Add the product page model and normalization**

```go
type ListFilter struct {
	Query     string
	Category  string
	Active    *bool
	Limit     int
	Sort      string
	Direction string
	Cursor    string
}

type Page struct {
	Items       []Product
	NextCursor  string
	HasNextPage bool
}

var productSorts = map[string]struct{}{"createdAt": {}, "name": {}, "category": {}, "price": {}, "stock": {}}

func normalizeListFilter(filter ListFilter) (ListFilter, error) {
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Category = strings.TrimSpace(filter.Category)
	if filter.Limit == 0 { filter.Limit = 20 }
	if filter.Limit < 1 || filter.Limit > 100 { return ListFilter{}, ErrInvalidProduct }
	if filter.Sort == "" { filter.Sort = "createdAt" }
	if filter.Direction == "" { filter.Direction = "desc" }
	if _, ok := productSorts[filter.Sort]; !ok || (filter.Direction != "asc" && filter.Direction != "desc") { return ListFilter{}, ErrInvalidProduct }
	return filter, nil
}
```

Change `Repository.List` to return `[]Product` for a normalized filter containing a decoded typed cursor. The service requests `Limit + 1`, trims the extra row, and encodes the last returned row using its active sort value and ID.

- [ ] **Step 4: Add handler parsing and the common envelope**

Parse `q`, `category`, `active`, `limit`, `sort`, `dir`, and `cursor`. Reject an `active` value other than `true` or `false` with 422. Return:

```go
return c.JSON(fiber.Map{
	"data": page.Items,
	"meta": fiber.Map{"nextCursor": page.NextCursor, "hasNextPage": page.HasNextPage},
})
```

Map a shared cursor compatibility failure to `400 INVALID_CURSOR`; keep filter validation as `422 INVALID_PRODUCT`.

- [ ] **Step 5: Write failing product order and page-boundary tests**

```go
func TestResolveProductOrder(t *testing.T) {
	tests := []struct{ sort, dir, column, op string }{
		{"createdAt", "desc", "p.created_at", "<"},
		{"name", "asc", "p.name", ">"},
		{"category", "asc", "p.category", ">"},
		{"price", "desc", "p.price", "<"},
		{"stock", "asc", "p.stock", ">"},
	}
	for _, tt := range tests {
		got, err := resolveProductOrder(tt.sort, tt.dir)
		if err != nil { t.Fatal(err) }
		if got.Column != tt.column || got.Operator != tt.op || got.Direction != tt.dir { t.Fatalf("order=%#v", got) }
	}
}

func TestServiceListUsesLastVisibleDuplicateAsNextCursor(t *testing.T) {
	firstID, secondID, extraID := uuid.New(), uuid.New(), uuid.New()
	repo := &capturingRepository{rows: []Product{{ID: firstID, Name: "Tea"}, {ID: secondID, Name: "Tea"}, {ID: extraID, Name: "Tea"}}}
	page, err := NewService(fakeRunner{}, repo).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{Limit: 2, Sort: "name", Direction: "asc"})
	if err != nil { t.Fatal(err) }
	if len(page.Items) != 2 || !page.HasNextPage { t.Fatalf("page=%#v", page) }
	payload, err := cursor.Decode(page.NextCursor)
	if err != nil { t.Fatal(err) }
	if payload.ID != secondID || string(payload.Value) != `"Tea"` { t.Fatalf("payload=%#v", payload) }
}
```

Add `capturingRepository` beside the existing fake:

```go
type capturingRepository struct { fakeRepository; filter ListFilter; rows []Product }
func (r *capturingRepository) List(_ context.Context, _ database.Tx, _ string, filter ListFilter) ([]Product, error) {
	r.filter = filter
	return r.rows, nil
}
func boolPtr(value bool) *bool { return &value }
```

Run: `cd backend && go test ./internal/product -run 'TestResolveProductOrder|TestServiceListUsesLastVisibleDuplicateAsNextCursor' -v`

Expected: FAIL against the old fixed `created_at,id` query.

- [ ] **Step 6: Implement allowlisted product SQL ordering**

Use a switch, never raw request values:

```go
type listOrder struct { Column, Operator, Direction string }

func resolveProductOrder(sort, direction string) (listOrder, error) {
	operator := ">"
	if direction == "desc" { operator = "<" }
	var column string
	switch sort {
	case "name": column = "p.name"
	case "category": column = "p.category"
	case "price": column = "p.price"
	case "stock": column = "p.stock"
	case "createdAt": column = "p.created_at"
	default: return listOrder{}, ErrInvalidProduct
	}
	return listOrder{Column: column, Operator: operator, Direction: direction}, nil
}
```

Build the keyset predicate from the allowlisted column and validated direction:

```sql
where p.org_id=$1
  and ($2='' or p.name ilike '%'||$2||'%' or p.barcode ilike '%'||$2||'%' or p.category ilike '%'||$2||'%')
  and ($3='' or p.category=$3)
  and ($4::boolean is null or p.active=$4)
  and ($5::text is null or (SORT_COLUMN,p.id) OP ($6,SORT_ID))
order by SORT_COLUMN DIRECTION, p.id DIRECTION
limit $7
```

Only substitute `SORT_COLUMN`, `OP`, and `DIRECTION` from the switch/validated enum. Decode cursor value into `time.Time`, `string`, or `int` according to `Sort` before calling the repository.

- [ ] **Step 7: Run product tests**

Run: `cd backend && go test ./internal/product -v`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/product
git commit -m "feat: paginate and filter products on server"
```

## Task 3: Transactions Server Filtering And Dynamic Cursor Sorting

**Files:**
- Modify: `backend/internal/transaction/model.go`
- Modify: `backend/internal/transaction/handler.go`
- Modify: `backend/internal/transaction/service.go`
- Modify: `backend/internal/transaction/repository.go`
- Modify: `backend/internal/transaction/service_test.go`
- Modify: `backend/internal/transaction/repository_test.go`

- [ ] **Step 1: Write failing transaction filter tests**

```go
func TestServiceListNormalizesTransactionFilters(t *testing.T) {
	repo := &capturingRepository{}
	service := NewService(fakeRunner{}, repo)
	_, err := service.List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{
		Query: " TRX ", PaymentMethod: " CASH ", Limit: 20, Sort: "total", Direction: "desc",
	})
	if err != nil { t.Fatal(err) }
	if repo.filter.Query != "TRX" || repo.filter.PaymentMethod != "cash" { t.Fatalf("filter=%#v", repo.filter) }
}

func TestServiceListRejectsDateRangeInReverse(t *testing.T) {
	to := time.Now()
	from := to.Add(time.Hour)
	_, err := NewService(fakeRunner{}, &capturingRepository{}).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{DateFrom: &from, DateTo: &to})
	if !errors.Is(err, ErrInvalidFilter) { t.Fatalf("err=%v", err) }
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd backend && go test ./internal/transaction -run 'TestServiceList' -v`

Expected: FAIL because `ListFilter` and filter validation do not exist.

- [ ] **Step 3: Replace positional List arguments with `ListFilter`**

```go
type ListFilter struct {
	Query         string
	PaymentMethod string
	DateFrom      *time.Time
	DateTo        *time.Time
	Limit         int
	Sort          string
	Direction     string
	Cursor        string
}

type Page struct {
	Items       []Transaction `json:"items"`
	NextCursor  string        `json:"nextCursor,omitempty"`
	HasNextPage bool          `json:"hasNextPage"`
}
```

Normalize payment method to lowercase. Allow only `createdAt`, `number`, `paymentMethod`, and `total`; default to `createdAt desc`. Use the shared cursor fingerprint and typed value handling.

- [ ] **Step 4: Parse transaction query parameters**

The handler parses `q`, `paymentMethod`, `dateFrom`, `dateTo`, `limit`, `sort`, `dir`, and `cursor`. Date values must be RFC3339. Return 422 for malformed filters and `400 INVALID_CURSOR` for incompatible cursors.

- [ ] **Step 5: Write and run failing transaction order tests**

```go
func TestResolveTransactionOrder(t *testing.T) {
	tests := []struct{ sort, dir, column, op string }{
		{"createdAt", "desc", "t.created_at", "<"},
		{"number", "asc", "t.number", ">"},
		{"paymentMethod", "asc", "t.payment_method", ">"},
		{"total", "desc", "t.total", "<"},
	}
	for _, tt := range tests {
		got, err := resolveTransactionOrder(tt.sort, tt.dir)
		if err != nil { t.Fatal(err) }
		if got.Column != tt.column || got.Operator != tt.op || got.Direction != tt.dir { t.Fatalf("order=%#v", got) }
	}
}
```

Add a service test whose fake repository captures `ListFilter` and returns three rows with the same `Total` for limit 2. Decode `NextCursor` and assert its ID is the second returned row, not the extra detection row. Add a handler test that sends `q`, `paymentMethod`, `dateFrom`, and `dateTo` and asserts the captured normalized filter contains all four values.

Run: `cd backend && go test ./internal/transaction -run 'TestResolveTransactionOrder|TestServiceListUsesLastVisibleDuplicateAsNextCursor|TestHandlerListFilters' -v`

Expected: FAIL against the current created-at-only query.

- [ ] **Step 6: Implement safe dynamic transaction ordering**

Map sort keys exactly:

```go
switch filter.Sort {
case "number": column = "t.number"
case "paymentMethod": column = "t.payment_method"
case "total": column = "t.total"
default: column = "t.created_at"
}
```

Apply `q`, payment method, and date bounds before the keyset predicate. Always order by the mapped column and `t.id` in the same validated direction, requesting `limit + 1` rows.

- [ ] **Step 7: Run transaction tests**

Run: `cd backend && go test ./internal/transaction -v`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/transaction
git commit -m "feat: filter and sort transaction pages"
```

## Task 4: Stock Movement Server Sorting On The Shared Cursor

**Files:**
- Modify: `backend/internal/stock/model.go`
- Modify: `backend/internal/stock/handler.go`
- Modify: `backend/internal/stock/service.go`
- Modify: `backend/internal/stock/repository.go`
- Modify: `backend/internal/stock/service_test.go`
- Modify: `backend/internal/stock/repository_test.go`

- [ ] **Step 1: Write failing stock sort tests**

```go
func TestServiceListDefaultsToNewestStockMovement(t *testing.T) {
	repo := &capturingRepository{}
	service := NewService(fakeRunner{}, repo)
	_, err := service.List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{Limit: 20})
	if err != nil { t.Fatal(err) }
	if repo.filter.Sort != "createdAt" || repo.filter.Direction != "desc" { t.Fatalf("filter=%#v", repo.filter) }
}

func TestServiceListRejectsUnsupportedStockSort(t *testing.T) {
	_, err := NewService(fakeRunner{}, &capturingRepository{}).List(context.Background(), database.Identity{OrgID: "org-1"}, ListFilter{Sort: "reason", Direction: "asc"})
	if !errors.Is(err, ErrInvalidStockMovement) { t.Fatalf("err=%v", err) }
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd backend && go test ./internal/stock -run 'TestServiceList' -v`

Expected: FAIL because Stock has no sort/direction fields and still owns a created-at-specific cursor type.

- [ ] **Step 3: Extend `ListFilter` and remove the duplicate codec**

Add `Sort`, `Direction`, and raw cursor fields. Allow `createdAt`, `productName`, `type`, `quantityDelta`, and `stockAfter`. Use `platform/cursor` and fingerprint all normalized stock filters, including RFC3339 dates and product ID.

- [ ] **Step 4: Add handler sort parsing**

Include `sort` and `dir` beside existing stock query parameters. Return `hasNextPage` in metadata.

- [ ] **Step 5: Write failing stock order tests**

```go
func TestResolveStockOrder(t *testing.T) {
	tests := []struct{ sort, dir, column, op string }{
		{"createdAt", "desc", "sm.created_at", "<"},
		{"productName", "asc", "coalesce(p.name,'')", ">"},
		{"type", "asc", "sm.type", ">"},
		{"quantityDelta", "desc", "sm.quantity_delta", "<"},
		{"stockAfter", "asc", "sm.stock_after", ">"},
	}
	for _, tt := range tests {
		got, err := resolveStockOrder(tt.sort, tt.dir)
		if err != nil { t.Fatal(err) }
		if got.Column != tt.column || got.Operator != tt.op || got.Direction != tt.dir { t.Fatalf("order=%#v", got) }
	}
}
```

Add a service test whose fake repository returns three movements with duplicate `ProductName` for limit 2. Decode the next cursor and assert it contains the second movement's normalized product name and ID.

Run: `cd backend && go test ./internal/stock -run 'TestResolveStockOrder|TestServiceListUsesLastVisibleDuplicateAsNextCursor' -v`

Expected: FAIL against the current fixed `sm.created_at desc, sm.id desc` query.

- [ ] **Step 6: Implement allowlisted stock ordering**

```go
switch filter.Sort {
case "productName": column = "coalesce(p.name,'')"
case "type": column = "sm.type"
case "quantityDelta": column = "sm.quantity_delta"
case "stockAfter": column = "sm.stock_after"
default: column = "sm.created_at"
}
```

Use the same expression in SELECT cursor extraction, keyset predicate, and ORDER BY. Keep all existing stock filters unchanged.

- [ ] **Step 7: Run stock and full backend tests**

Run: `cd backend && go test ./internal/stock ./internal/product ./internal/transaction ./internal/platform/cursor`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/stock
git commit -m "feat: sort stock movement cursor pages"
```

## Task 5: Focused Database Indexes

**Files:**
- Create: `backend/migrations/000008_server_list_indexes.up.sql`
- Create: `backend/migrations/000008_server_list_indexes.down.sql`
- Create: `backend/internal/integration/server_list_indexes_test.go`

- [ ] **Step 1: Write the failing migration contract test**

```go
func TestServerListIndexesMigration(t *testing.T) {
	up := readMigration(t, "000008_server_list_indexes.up.sql")
	for _, fragment := range []string{
		"products_org_name_id_idx",
		"products_org_category_id_idx",
		"products_org_price_id_idx",
		"products_org_stock_id_idx",
		"transactions_org_number_id_idx",
		"transactions_org_payment_method_id_idx",
		"transactions_org_total_id_idx",
		"stock_movements_org_quantity_delta_id_idx",
		"stock_movements_org_stock_after_id_idx",
	} {
		if !strings.Contains(up, fragment) { t.Fatalf("migration missing %s", fragment) }
	}
}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd backend && go test ./internal/integration -run TestServerListIndexesMigration -v`

Expected: FAIL because migration 000008 does not exist.

- [ ] **Step 3: Add reversible indexes**

```sql
create index products_org_name_id_idx on products (org_id, name, id);
create index products_org_category_id_idx on products (org_id, category, id);
create index products_org_price_id_idx on products (org_id, price, id);
create index products_org_stock_id_idx on products (org_id, stock, id);
create index transactions_org_number_id_idx on transactions (org_id, number, id);
create index transactions_org_payment_method_id_idx on transactions (org_id, payment_method, id);
create index transactions_org_total_id_idx on transactions (org_id, total, id);
create index stock_movements_org_quantity_delta_id_idx on stock_movements (org_id, quantity_delta, id);
create index stock_movements_org_stock_after_id_idx on stock_movements (org_id, stock_after, id);
```

The down migration drops exactly these indexes with `if exists`. Reuse existing created-at, stock type, and product indexes from earlier migrations rather than duplicating them.

- [ ] **Step 4: Run migration tests**

Run: `cd backend && go test ./internal/integration -run 'TestServerListIndexesMigration|TestMigration' -v`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/000008_server_list_indexes.* backend/internal/integration/server_list_indexes_test.go
git commit -m "perf: index server-paginated lists"
```

## Task 6: Frontend API Page Contracts

**Files:**
- Modify: `frontend/src/pos/api-client.js`
- Modify: `frontend/src/pos/api-client.test.js`
- Modify: `frontend/src/pos/store-data.js`
- Modify: `frontend/src/pos/store-data.test.js`

- [ ] **Step 1: Write failing API client tests**

```js
test("listProducts preserves cursor metadata and serializes catalog filters", async () => {
  const requests = [];
  const api = createAPIClient({ getToken: async () => "token", fetchImpl: async (url) => {
    requests.push(url);
    return new Response(JSON.stringify({ data: [{ id: "p1" }], meta: { nextCursor: "next", hasNextPage: true } }), { status: 200 });
  }});
  const page = await api.listProducts({ q: "tea", category: "Drinks", active: true, limit: 20, sort: "name", dir: "asc", cursor: "current" });
  assert.match(requests[0], /q=tea/);
  assert.match(requests[0], /category=Drinks/);
  assert.deepEqual(page, { items: [{ id: "p1" }], nextCursor: "next", hasNextPage: true });
});

test("listTransactions serializes server filters and sorting", async () => {
  let requestURL;
  const api = createAPIClient({ getToken: async () => "token", fetchImpl: async (url) => {
    requestURL = url;
    return new Response(JSON.stringify({ data: [], meta: { nextCursor: "", hasNextPage: false } }), { status: 200 });
  }});
  await api.listTransactions({ q: "TRX", paymentMethod: "cash", dateFrom: "2026-07-01T00:00:00Z", dateTo: "2026-07-13T23:59:59Z", limit: 20, sort: "total", dir: "desc", cursor: "c1" });
  assert.equal(requestURL, "/api/v1/transactions?q=TRX&paymentMethod=cash&dateFrom=2026-07-01T00%3A00%3A00Z&dateTo=2026-07-13T23%3A59%3A59Z&limit=20&sort=total&dir=desc&cursor=c1");
});

test("listStockMovements preserves server pagination metadata", async () => {
  let requestURL;
  const api = createAPIClient({ getToken: async () => "token", fetchImpl: async (url) => {
    requestURL = url;
    return new Response(JSON.stringify({ data: [], meta: { nextCursor: "n2", hasNextPage: true } }), { status: 200 });
  }});
  const page = await api.listStockMovements({ q: "tea", type: "restock", limit: 20, sort: "stockAfter", dir: "asc", cursor: "c1" });
  assert.equal(requestURL, "/api/v1/stock/movements?q=tea&type=restock&limit=20&sort=stockAfter&dir=asc&cursor=c1");
  assert.deepEqual(page, { items: [], nextCursor: "n2", hasNextPage: true });
});
```

- [ ] **Step 2: Run API tests and verify RED**

Run: `cd frontend && node --test src/pos/api-client.test.js src/pos/store-data.test.js`

Expected: FAIL because Products returns an array and Transactions/Stock omit new parameters or metadata.

- [ ] **Step 3: Implement one shared page normalizer and query builder**

```js
function normalizePage(envelope) {
  return {
    items: Array.isArray(envelope?.data) ? envelope.data : [],
    nextCursor: envelope?.meta?.nextCursor || "",
    hasNextPage: envelope?.meta?.hasNextPage === true,
  };
}

function listQuery(filters, keys) {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
```

`listProducts`, `listTransactions`, and `listStockMovements` return `normalizePage(envelope)`. `searchProducts` in store data unwraps `page.items`; paginated page callers retain the page object.

- [ ] **Step 4: Normalize transaction and stock items without losing metadata**

```js
export async function loadTransactionPage(api, options = {}) {
  const page = await api.listTransactions(options);
  return { ...page, items: normalizeTransactions(page.items) };
}

export async function loadStockMovementPage(api, options = {}) {
  const page = await api.listStockMovements(options);
  return { ...page, items: page.items.map(normalizeStockMovement) };
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run: `cd frontend && node --test src/pos/api-client.test.js src/pos/store-data.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pos/api-client.js frontend/src/pos/api-client.test.js frontend/src/pos/store-data.js frontend/src/pos/store-data.test.js
git commit -m "feat: preserve list pagination metadata"
```

## Task 7: Cursor Table State Controller

**Files:**
- Create: `frontend/src/lib/cursor-pagination.js`
- Create: `frontend/src/lib/cursor-pagination.test.js`
- Create: `frontend/src/hooks/useCursorTable.js`

- [ ] **Step 1: Write failing pure state tests**

```js
test("next and previous retain visited cursors", () => {
  let state = initialCursorState();
  state = moveNext(state, "cursor-2");
  assert.equal(state.cursor, "cursor-2");
  assert.deepEqual(state.previous, [""]);
  state = movePrevious(state);
  assert.equal(state.cursor, "");
  assert.deepEqual(state.previous, []);
});

test("reset clears cursor history", () => {
  const state = resetCursorState({ cursor: "cursor-3", previous: ["", "cursor-2"] });
  assert.deepEqual(state, { cursor: "", previous: [] });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend && node --test src/lib/cursor-pagination.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement pure cursor transitions**

```js
export function initialCursorState() { return { cursor: "", previous: [] }; }
export function resetCursorState() { return initialCursorState(); }
export function moveNext(state, nextCursor) {
  if (!nextCursor) return state;
  return { cursor: nextCursor, previous: [...state.previous, state.cursor] };
}
export function movePrevious(state) {
  if (!state.previous.length) return state;
  return { cursor: state.previous[state.previous.length - 1], previous: state.previous.slice(0, -1) };
}
export function pageRange(previousCount, pageSize, rowCount) {
  if (!rowCount) return { start: 0, end: 0, page: previousCount + 1 };
  const start = previousCount * pageSize + 1;
  return { start, end: start + rowCount - 1, page: previousCount + 1 };
}
```

- [ ] **Step 4: Implement `useCursorTable`**

The hook signature is:

```js
useCursorTable({ fetchPage, filters, initialSortKey, initialSortDir = "desc", initialPageSize = 20 })
```

It returns rows, sort state, page size, range, initial/loading/updating/error states, `canPrevious`, `canNext`, and actions `sortBy`, `next`, `previous`, `setPageSize`, `retry`, and `refresh`.

Use one `AbortController` and monotonically increasing request ID. On a reset-triggering query change, clear cursor history before fetching. Preserve existing rows whenever at least one request has settled successfully. Ignore `AbortError`; expose other errors without clearing settled rows.

- [ ] **Step 5: Run cursor tests**

Run: `cd frontend && node --test src/lib/cursor-pagination.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/cursor-pagination.js frontend/src/lib/cursor-pagination.test.js frontend/src/hooks/useCursorTable.js
git commit -m "feat: add cursor table controller"
```

## Task 8: Controlled Table Pagination And Filter Popover

**Files:**
- Create: `frontend/src/components/TablePagination.jsx`
- Create: `frontend/src/components/TablePagination.test.js`
- Create: `frontend/src/components/TableFilterPopover.jsx`
- Modify: `frontend/src/components/primitives.jsx`

- [ ] **Step 1: Write failing component source contracts**

```js
test("DataTable no longer slices client data", async () => {
  const source = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data\.slice\(/);
  assert.doesNotMatch(source, /paginated\s*=/);
});

test("TablePagination exposes controlled navigation", async () => {
  const source = await readFile(new URL("./TablePagination.jsx", import.meta.url), "utf8");
  for (const prop of ["canPrevious", "canNext", "onPrevious", "onNext", "onPageSizeChange"]) assert.match(source, new RegExp(prop));
  assert.doesNotMatch(source, /of\s*\{?total/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend && node --test src/components/TablePagination.test.js`

Expected: FAIL because `DataTable` owns local slicing and `TablePagination` does not exist.

- [ ] **Step 3: Remove pagination state from `DataTable`**

Delete `paginated`, `pageSize`, and `pageSizeOptions` props and all internal page/limit/slice effects. Render `data.map` directly and use the map index only for zebra styling, never for row identity when `row.id` exists.

- [ ] **Step 4: Implement controlled `TablePagination`**

Render stable 36px controls with existing `Icon` chevrons, a `Showing {start}-{end}` label, page orientation text, and page-size select options 20/50/100. Disable navigation when loading or unavailable. The component owns no page state.

- [ ] **Step 5: Implement anchored `TableFilterPopover`**

The component accepts `open`, `onOpenChange`, `activeCount`, and `children`. Use a relative wrapper, a Filters trigger, and an absolutely positioned surface below the trigger. Add Escape handling, an outside-press overlay behind only the popover layer, `aria-expanded`, and `aria-controls`. Do not add a modal scrim or spring animation.

- [ ] **Step 6: Run component and full frontend tests**

Run: `cd frontend && npm run test`

Expected: PASS after updating existing DataTable showcase tests that relied on client pagination.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/primitives.jsx frontend/src/components/TablePagination.jsx frontend/src/components/TablePagination.test.js frontend/src/components/TableFilterPopover.jsx
git commit -m "feat: add controlled table navigation"
```

## Task 9: Products Page Migration Without Corrupting POS Cache

**Files:**
- Modify: `frontend/src/pages/ProductsPage.jsx`
- Modify: `frontend/src/pos/store.jsx`
- Modify: `frontend/src/pos/store-data.test.js`

- [ ] **Step 1: Write a failing cache-boundary test**

```js
test("catalog page loading does not replace the shared POS products", async () => {
  const source = await readFile(new URL("../pages/ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /useCursorTable/);
  assert.match(source, /store\.api\.listProducts/);
  assert.doesNotMatch(source, /store\.loadProducts\(\{ force: true/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd frontend && node --test src/pos/store-data.test.js`

Expected: FAIL because Products still loads and filters the shared collection.

- [ ] **Step 3: Connect Products to `useCursorTable`**

Use debounced `q`, category, and active filters. Fetch through `store.api.listProducts` and pass `sort`, `dir`, `limit`, `cursor`, and signal. Remove `sortRows`, `filteredProducts`, and `<DataTable paginated>`.

Add Category options `All categories` plus retail categories, and Status options `All statuses`, `Active`, `Inactive`. Normalize these labels to omitted/category/boolean API values.

- [ ] **Step 4: Compose the controlled footer**

Render `TablePagination` below `DataTable` with the hook's range and navigation actions. Keep settled rows visible with the existing Updating badge and opacity treatment.

- [ ] **Step 5: Refresh both catalog and POS cache after mutations**

After successful save/deactivate, call the cursor table `refresh()` and `store.loadProducts({ force: true })`. If refresh returns an empty later page, use the hook's previous-page fallback. Backend barcode conflict remains authoritative.

- [ ] **Step 6: Run Products-related tests and build**

Run: `cd frontend && npm run test && npm run build`

Expected: PASS; existing Vite module-directive/chunk warnings may remain, but no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ProductsPage.jsx frontend/src/pos/store.jsx frontend/src/pos/store-data.test.js
git commit -m "feat: paginate product catalog on server"
```

## Task 10: Transactions Page Migration And Filters

**Files:**
- Modify: `frontend/src/pages/TransactionsPage.jsx`
- Modify: `frontend/src/pos/store.jsx`
- Modify: `frontend/src/pos/store-data.test.js`

- [ ] **Step 1: Write a failing transaction page contract test**

```js
test("transactions use a page-local cursor query", async () => {
  const source = await readFile(new URL("../pages/TransactionsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /useCursorTable/);
  assert.match(source, /TableFilterPopover/);
  assert.doesNotMatch(source, /store\.transactions\.filter/);
  assert.doesNotMatch(source, /sortRows/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd frontend && node --test src/pos/store-data.test.js`

Expected: FAIL against the client filter/sort implementation.

- [ ] **Step 3: Add page-local transaction query state**

Use `q`, `paymentMethod`, `dateFrom`, and `dateTo` filters. The fetcher calls `loadTransactionPage(store.api, request)`. Date inputs send start/end values as RFC3339 boundaries and remain empty when unset.

- [ ] **Step 4: Add the anchored filter UI**

Keep search visible. Add `TableFilterPopover` containing Payment method `SelectField`, Date from/date to inputs, and Clear filters. Show active count for non-empty payment/date filters. Resetting filters returns to the first cursor automatically.

- [ ] **Step 5: Remove partial transaction list ownership from the store**

Delete `transactions`, transaction refs/loading/loaded state, `loadTransactions`, and visibility-refresh calls for Transactions only after the page no longer consumes them. Do not change Dashboard, which uses its server summary endpoint.

- [ ] **Step 6: Run tests and build**

Run: `cd frontend && npm run test && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/TransactionsPage.jsx frontend/src/pos/store.jsx frontend/src/pos/store-data.test.js
git commit -m "feat: paginate and filter transaction history"
```

## Task 11: Stock Page Migration

**Files:**
- Modify: `frontend/src/pages/StockPage.jsx`
- Modify: `frontend/src/pos/store.jsx`
- Modify: `frontend/src/pos/store-data.test.js`

- [ ] **Step 1: Write the failing stock page contract test**

```js
test("stock history uses server cursor sorting", async () => {
  const source = await readFile(new URL("../pages/StockPage.jsx", import.meta.url), "utf8");
  assert.match(source, /useCursorTable/);
  assert.doesNotMatch(source, /sortRows/);
  assert.doesNotMatch(source, /loadStockMovements/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd frontend && node --test src/pos/store-data.test.js`

Expected: FAIL because Stock still loads through global store state and sorts the loaded batch.

- [ ] **Step 3: Connect Stock history to `useCursorTable`**

Keep visible debounced search and Movement type. Map the UI Product sort key to API `productName`; keep the other existing sortable columns. Fetch with `loadStockMovementPage(store.api, request)`.

- [ ] **Step 4: Keep mutation and picker behavior separate**

Continue using shared active products for the movement dialog and server-limited `searchProducts` for its picker. After a successful movement, apply returned product stock to the shared cache and call the table `refresh()`; do not replace catalog or POS products with movement-page data.

- [ ] **Step 5: Remove partial stock history ownership from store**

Delete stock movement rows, cursor, filters, refs, `loadStockMovements`, and stale refresh logic. Keep `createStockMovement` and product-stock application.

- [ ] **Step 6: Run tests and build**

Run: `cd frontend && npm run test && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/StockPage.jsx frontend/src/pos/store.jsx frontend/src/pos/store-data.test.js
git commit -m "feat: paginate stock movement history"
```

## Task 12: Design-System And Documentation Synchronization

**Files:**
- Modify: `frontend/src/components/design/DataTableShowcase.jsx`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Write a failing design-system contract test**

Add to `frontend/src/components/AppShell.test.js` or a new `frontend/src/components/design/DataTableShowcase.test.js`:

```js
test("design system demonstrates controlled cursor pagination", async () => {
  const source = await readFile(new URL("./DataTableShowcase.jsx", import.meta.url), "utf8");
  assert.match(source, /TablePagination/);
  assert.match(source, /TableFilterPopover/);
  assert.doesNotMatch(source, /paginated/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd frontend && node --test src/components/design/DataTableShowcase.test.js`

Expected: FAIL because the showcase still uses client pagination.

- [ ] **Step 3: Update the showcase**

Demonstrate first/middle/final navigation states with fixture rows and controlled state, an Updating toggle/state that leaves rows mounted, and the transaction filter popover with an active count. Keep the demo self-contained; it must not call production APIs.

- [ ] **Step 4: Synchronize `DESIGN.md`**

Document these exact rules:

```markdown
Operational table pagination is server-controlled and cursor-based. Use Previous and Next only; do not show an exact total unless the server actually computes one. Search remains immediate with a 220ms server debounce. Filter, sort, or page-size changes reset to the first cursor. Preserve settled rows during requests and show Updating instead of replacing the table with a skeleton.
```

Also document Products category/status filters, Transactions anchored payment/date filter popover, Stock search/type filters, page-size options 20/50/100, and the prohibition against replacing the shared POS product cache with a catalog page.

- [ ] **Step 5: Run frontend verification**

Run: `cd frontend && npm run test && npm run build`

Expected: all tests pass and build exits 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/design/DataTableShowcase.jsx frontend/src/components/design/DataTableShowcase.test.js frontend/src/pages/DesignSystemPage.jsx frontend/DESIGN.md
git commit -m "docs: define server table patterns"
```

## Task 13: Full Verification And Authenticated Visual QA

**Files:**
- Modify only files required by failures found in this task.

- [ ] **Step 1: Run backend formatting and tests**

```bash
cd backend
gofmt -w internal/platform/cursor internal/product internal/transaction internal/stock internal/integration/server_list_indexes_test.go
go test ./...
```

Expected: all packages pass.

- [ ] **Step 2: Run frontend tests and build**

```bash
cd frontend
npm run test
npm run build
```

Expected: all tests pass and build exits 0. Existing third-party `use client` and chunk-size warnings may remain; report them honestly.

- [ ] **Step 3: Run migration verification**

Apply all migrations to an isolated test database or run the project's migration integration path, then verify 000008 up and down. Never run the down migration against user data.

- [ ] **Step 4: Start the app and visually inspect authenticated routes**

Run the backend and frontend development servers on free ports. Inspect `/products`, `/transactions`, `/stock`, and `/design-system` at desktop and mobile widths.

Verify:

- Search text appears immediately while requests debounce.
- Settled rows remain visible during Next, Previous, filter, and sort requests.
- Previous/Next and page-size controls never shift dimensions.
- Product category/status and Stock type filters wrap without overlap.
- Transaction filter popover anchors to its trigger, closes on Escape/outside press, and has no modal scrim.
- Sort order remains globally correct across at least two pages with duplicate values.
- No footer claims an exact total.
- Catalog pagination does not remove POS products or break barcode/cart behavior.
- Reduced motion removes nonessential transitions.

- [ ] **Step 5: Review the final diff against the spec**

Run:

```bash
git diff --check
git status --short
```

Confirm every acceptance criterion in `docs/superpowers/specs/2026-07-13-server-side-pagination-filtering-design.md` maps to tested implementation and only intended files are included.

- [ ] **Step 6: Commit verification fixes when Step 1-5 changed files**

```bash
git add backend/internal backend/migrations frontend/src frontend/DESIGN.md
git commit -m "fix: address pagination verification findings"
```

Skip this commit when verification required no code changes.
