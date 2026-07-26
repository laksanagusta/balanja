# Tenant Resource Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the common one-store safeguards of 1,000 active products and 1 GB of attached product photos while keeping the two-staff limit honest until Balanja owns a membership-management boundary.

**Architecture:** Extend organization entitlements with resource counters and add per-product image byte metadata. Product create/reactivation and image replacement lock the tenant entitlement before checking or changing usage, so concurrent requests cannot exceed a limit. Clerk remains authoritative for membership; the API reports that staff enforcement is unavailable until a separate staff-management feature is designed.

**Tech Stack:** Go 1.25, Fiber v3, pgx v5, PostgreSQL/RLS, Cloudflare R2 through AWS SDK v2, React 19, Node test runner.

---

## Scope boundary

Run this plan only after
`docs/superpowers/plans/2026-07-26-trial-paid-transaction-entitlements.md`.
It deliberately does not invent a Clerk invitation flow that Balanja does not
currently have. A future staff-management spec must enforce the two-member
maximum at invitation and membership-creation boundaries before marketing that
limit as an active control.

## File map

- Create `backend/migrations/000013_tenant_resource_usage.up.sql` and `.down.sql`.
- Create `backend/migrations/000013_tenant_resource_usage_test.go`.
- Create `backend/migrations/000014_storage_reservations.up.sql` and `.down.sql`.
- Create `backend/migrations/000014_storage_reservations_test.go`.
- Modify `backend/internal/entitlement/model.go` and `repository.go`: expose
  product/photo capabilities and lock resource usage.
- Modify `backend/internal/product/model.go`, `service.go`, `repository.go`,
  `handler.go`, and tests: active-product and attached-photo limits.
- Modify `backend/internal/platform/objectstore/store.go`, `r2.go`, and tests:
  preserve exact stored byte size.
- Modify frontend product form/store error handling and tests.
- Modify `frontend/DESIGN.md` and the design-system master-data/product showcase
  before changing the feature UI.
- Create `docs/operations/resource-limits.md`.

### Task 1: Persist resource usage and product image bytes

**Files:**
- Create: `backend/migrations/000013_tenant_resource_usage.up.sql`
- Create: `backend/migrations/000013_tenant_resource_usage.down.sql`
- Create: `backend/migrations/000013_tenant_resource_usage_test.go`
- Modify: `backend/internal/integration/migration_contract_test.go`

- [ ] **Step 1: Write the failing contract test**

```go
func TestTenantResourceUsageMigration(t *testing.T) {
	content, err := os.ReadFile("000013_tenant_resource_usage.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, fragment := range []string{
		"add column active_product_limit",
		"add column photo_storage_limit_bytes",
		"add column active_products_used",
		"add column photo_storage_used_bytes",
		"add column image_bytes",
	} {
		if !strings.Contains(sql, fragment) {
			t.Errorf("missing %q", fragment)
		}
	}
}
```

- [ ] **Step 2: Run and verify failure**

Run: `cd backend && go test ./migrations -run TestTenantResourceUsageMigration -count=1`

Expected: FAIL because migration 13 is absent.

- [ ] **Step 3: Add resource columns and safe backfill**

```sql
begin;

alter table organization_entitlements
  add column active_product_limit integer not null default 1000
    check (active_product_limit > 0),
  add column photo_storage_limit_bytes bigint not null default 1073741824
    check (photo_storage_limit_bytes > 0),
  add column active_products_used integer not null default 0
    check (active_products_used >= 0),
  add column photo_storage_used_bytes bigint not null default 0
    check (photo_storage_used_bytes >= 0),
  add column staff_limit integer not null default 2
    check (staff_limit > 0),
  add column staff_limit_enforced boolean not null default false;

alter table products
  add column image_bytes bigint not null default 0 check (image_bytes >= 0);

update organization_entitlements e
set active_products_used = counts.value
from (
  select org_id, count(*)::integer value
  from products where active group by org_id
) counts
where counts.org_id=e.org_id;

commit;
```

Existing image rows have unknown byte size and remain at zero. Before enabling
the photo hard limit, run the reconciliation step in Task 5 to populate their
sizes; do not guess sizes from URLs.

- [ ] **Step 4: Add down migration**

Drop `products.image_bytes`, then the six new entitlement columns in one
transaction.

- [ ] **Step 5: Run migration tests and commit**

Run: `cd backend && go test ./migrations -count=1`

Expected: PASS.

```bash
git add backend/migrations/000013_tenant_resource_usage.* backend/internal/integration/migration_contract_test.go
git commit -m "feat: persist tenant resource usage"
```

### Task 2: Enforce 1,000 active products under concurrency

**Files:**
- Modify: `backend/internal/entitlement/model.go`
- Modify: `backend/internal/entitlement/repository.go`
- Modify: `backend/internal/product/service.go`
- Modify: `backend/internal/product/repository.go`
- Modify: `backend/internal/product/handler.go`
- Modify: `backend/internal/product/service_test.go`
- Modify: `backend/internal/product/repository_test.go`
- Modify: `backend/internal/integration/rls_test.go`

- [ ] **Step 1: Write failing product-limit tests**

```go
func TestCreateRejectsActiveProductLimit(t *testing.T) {
	repository := &fakeRepository{resource: entitlement.Resources{
		ActiveProductLimit: 1000, ActiveProductsUsed: 1000,
	}}
	_, err := NewService(fakeRunner{}, repository).Create(
		context.Background(), database.Identity{OrgID: "org", UserID: "user"},
		CreateInput{
			Name: "Teh", Barcode: "8990001", CategoryID: uuid.New(),
			Price: 5000, Stock: 0, UnitID: uuid.New(),
		},
	)
	if !errors.Is(err, ErrActiveProductLimitReached) {
		t.Fatalf("err=%v", err)
	}
}
```

Also test an update from inactive to active at 1,000 is rejected, while editing
an already-active product and archiving a product remain allowed.

- [ ] **Step 2: Run and verify failure**

Run: `cd backend && go test ./internal/product -run ActiveProductLimit -count=1`

Expected: FAIL because the error and resource guard do not exist.

- [ ] **Step 3: Lock and update the shared counter**

Before create, or before an `active=false` to `active=true` update, execute:

```sql
select active_product_limit,active_products_used
from organization_entitlements
where org_id=$1
for update;
```

Reject when used is at the limit. After a successful activation:

```sql
update organization_entitlements
set active_products_used=active_products_used+1,updated_at=now()
where org_id=$1;
```

After successful deactivation, decrement with
`greatest(active_products_used-1,0)`. Counter mutation and product mutation must
share the existing tenant transaction.

- [ ] **Step 4: Map the API error**

Return HTTP 409:

```go
apperror.New(409, "ACTIVE_PRODUCT_LIMIT_REACHED",
	"the active product limit has been reached")
```

- [ ] **Step 5: Add concurrency integration coverage**

Seed usage 999, then concurrently create two active products with distinct
barcodes. Assert one succeeds, one returns the stable limit error, the active
product count is 1,000, and the stored counter is 1,000.

- [ ] **Step 6: Run and commit**

Run: `cd backend && go test ./internal/product -count=1`

Expected: PASS.

```bash
git add backend/internal/entitlement backend/internal/product backend/internal/integration
git commit -m "feat: enforce active product limit"
```

### Task 3: Track and enforce attached photo bytes

**Files:**
- Create: `backend/migrations/000014_storage_reservations.up.sql`
- Create: `backend/migrations/000014_storage_reservations.down.sql`
- Create: `backend/migrations/000014_storage_reservations_test.go`
- Modify: `backend/internal/platform/objectstore/store.go`
- Modify: `backend/internal/platform/objectstore/r2.go`
- Modify: `backend/internal/platform/objectstore/r2_test.go`
- Modify: `backend/internal/product/model.go`
- Modify: `backend/internal/product/service.go`
- Modify: `backend/internal/product/repository.go`
- Modify: `backend/internal/product/service_test.go`
- Modify: `backend/internal/product/handler.go`

- [ ] **Step 1: Write failing photo-limit tests**

```go
func TestReplaceImageRejectsPhotoStorageLimit(t *testing.T) {
	store := &fakeStore{}
	repository := &fakeRepository{resource: entitlement.Resources{
		PhotoStorageLimitBytes: 100, PhotoStorageUsedBytes: 90,
	}, current: Product{ImageBytes: 0}}
	_, err := NewService(fakeRunner{}, repository, WithImageStore(store)).
		Update(ctx, identity, productID, validUpdateInput(),
			ImageMutation{Mode: ImageReplace, Upload: &ImageUpload{Data: validJPEG(20)}})
	if !errors.Is(err, ErrPhotoStorageLimitReached) {
		t.Fatalf("err=%v", err)
	}
	if len(store.puts) != 0 {
		t.Fatal("rejected upload reached object storage")
	}
}
```

Add replacement tests where the old image is 40 bytes and the new image is 45
bytes, proving only the five-byte delta consumes capacity.

- [ ] **Step 2: Run and verify failure**

Run: `cd backend && go test ./internal/product -run PhotoStorageLimit -count=1`

Expected: FAIL.

- [ ] **Step 3: Preserve byte size in domain results**

Extend:

```go
type StoredObject struct {
	Key   string
	URL   string
	Bytes int64
}
```

`R2.Put` sets `Bytes: int64(len(input.Body))`. Add `ImageBytes int64` to product
models and include `image_bytes` in every product scan/insert/update statement.

- [ ] **Step 4: Reserve capacity before upload**

Validate image bytes first. Run a short tenant transaction that locks the
entitlement and verifies:

```go
next := used - previousImageBytes + int64(len(validated.Data))
if next > limit { return ErrPhotoStorageLimitReached }
```

For creates, previous bytes are zero. For replacements, load the current product
first. The reservation transaction increments usage and records a unique
reservation token. If `Put` fails, release the reservation. Product commit
consumes the reservation and stores `image_bytes`; retries with the same token
must not double count.

Create migration 14 with the reservation table:

```sql
create table organization_storage_reservations (
  id uuid primary key,
  org_id text not null,
  product_id uuid,
  previous_image_key text not null default '',
  new_image_bytes bigint not null check (new_image_bytes > 0),
  bytes_delta bigint not null,
  state text not null check (state in ('reserved','consumed','released')),
  created_at timestamptz not null default now()
);
```

Enable and force tenant RLS, add the standard `app.org_id` policy, and grant the
runtime role select/insert/update. The down migration drops only
`organization_storage_reservations`. Use a unique reservation ID generated
before upload. This avoids holding a database transaction open during an R2
network call.

When consuming a replacement reservation, lock the product and require its
current `image_key` to equal `previous_image_key`. If it changed concurrently,
mark the reservation released, decrement the reserved delta, delete the newly
uploaded object, and return a retryable `PRODUCT_IMAGE_CHANGED` conflict.

- [ ] **Step 5: Handle replacement and removal**

After product update commits, delete the previous object. Removal sets
`image_bytes=0` and decrements attached usage in the product transaction.
Object-delete failure is logged and leaves an orphan, but does not restore a
reference or corrupt the attached-byte counter. Task 5 reconciles orphans.

- [ ] **Step 6: Map the API error**

Return HTTP 409 and code `PHOTO_STORAGE_LIMIT_REACHED`. Keep
`IMAGE_TOO_LARGE` for the existing per-file 5 MiB limit.

- [ ] **Step 7: Run and commit**

Run: `cd backend && go test ./internal/product ./internal/platform/objectstore -count=1`

Expected: PASS.

```bash
git add backend/migrations backend/internal/product backend/internal/platform/objectstore
git commit -m "feat: enforce product photo storage limit"
```

### Task 4: Synchronize resource-limit UI with the design system

**Files:**
- Modify: `frontend/DESIGN.md`
- Modify: `frontend/src/components/design/MasterDataPatternsShowcase.jsx`
- Modify: `frontend/src/components/design/ProductPhotoShowcase.jsx`
- Modify: `frontend/src/pages/ProductsPage.jsx`
- Modify: `frontend/src/pos/store.jsx`
- Modify: focused frontend tests

- [ ] **Step 1: Write failing design contract tests**

Assert `frontend/DESIGN.md` and both showcase components contain the
`ACTIVE_PRODUCT_LIMIT_REACHED` and `PHOTO_STORAGE_LIMIT_REACHED` presentation
contracts before feature-page code changes.

- [ ] **Step 2: Run and verify failure**

Run: `cd frontend && npm run test -- --test-name-pattern="resource limit"`

Expected: FAIL.

- [ ] **Step 3: Document and demonstrate the states**

Use existing form error/toast primitives:

- active-product limit appears beside the save action and preserves form data;
- photo-storage limit appears beside image input and preserves all text fields;
- copy states the exact limit and suggests archiving a product or removing an
  unused photo;
- no destructive action is performed automatically.

- [ ] **Step 4: Propagate stable API errors**

In `store.saveProduct`, retain `error.code` and return:

```js
{
  ok: false,
  code: error.code,
  error: error.code === "ACTIVE_PRODUCT_LIMIT_REACHED"
    ? "Batas 1.000 produk aktif telah tercapai."
    : error.code === "PHOTO_STORAGE_LIMIT_REACHED"
      ? "Batas penyimpanan foto 1 GB telah tercapai."
      : error.message || "Produk gagal disimpan",
}
```

Do not clear or close the product form on either limit error.

- [ ] **Step 5: Run frontend tests and build**

Run: `cd frontend && npm run test && npm run build`

Expected: PASS and successful Vite build.

- [ ] **Step 6: Commit**

```bash
git add frontend/DESIGN.md frontend/src/components/design frontend/src/pages/ProductsPage.jsx frontend/src/pos/store.jsx frontend/src/**/*.test.js
git commit -m "feat: surface tenant resource limits"
```

### Task 5: Reconcile photo usage and document staff-limit truth

**Files:**
- Create: `backend/cmd/reconcile-storage/main.go`
- Create: `backend/internal/entitlement/storage_reconcile.go`
- Create: `backend/internal/entitlement/storage_reconcile_test.go`
- Modify: `backend/internal/entitlement/model.go`
- Modify: `backend/README.md`
- Create: `docs/operations/resource-limits.md`

- [ ] **Step 1: Write failing reconciliation tests**

Given referenced keys `{a.jpg: 20, b.jpg: 30}` and stored keys
`{a.jpg: 20, b.jpg: 30, orphan.jpg: 40}`, assert the reconciliation result is
50 attached bytes and identifies `orphan.jpg` without deleting it in dry-run
mode.

- [ ] **Step 2: Add object listing**

Extend the object-store administrative interface with:

```go
type ObjectInfo struct { Key string; Bytes int64 }
type AdministrativeStore interface {
	List(context.Context, string) ([]ObjectInfo, error)
	Delete(context.Context, string) error
}
```

Implement paginated R2 listing by the exact `products/<safe-org-id>/` prefix.

- [ ] **Step 3: Implement dry-run-first reconciliation**

The CLI requires `--org-id` and defaults to dry run. `--delete-orphans` must be
explicit. It compares database-referenced keys to R2 keys, updates
`products.image_bytes` and `photo_storage_used_bytes` only from authoritative
object sizes, and prints every orphan before optional deletion.

- [ ] **Step 4: Keep staff enforcement explicit**

Return these fields from the entitlement summary:

```go
StaffLimit         int  `json:"staffLimit"`
StaffLimitEnforced bool `json:"staffLimitEnforced"`
```

Keep `staffLimitEnforced=false`. Do not show “maksimal dua staf” as an enforced
UI capability. Document that implementation requires a separately approved
staff-management design covering Clerk invitations, direct membership creation,
external Dashboard changes, and reconciliation.

- [ ] **Step 5: Run full verification**

```bash
cd backend
gofmt -w ./cmd ./internal
go vet ./...
go test ./... -race
```

Expected: PASS.

With integration databases configured:

```bash
go test -tags=integration ./internal/integration -count=1
```

Expected: PASS, including concurrent product and photo reservations.

- [ ] **Step 6: Commit**

```bash
git add backend/cmd/reconcile-storage backend/internal/entitlement backend/README.md docs/operations/resource-limits.md
git commit -m "feat: reconcile tenant storage usage"
```
