# Trial and Paid Transaction Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every new Balanja organization a 50-transaction lifetime trial, block only new checkout after the quota is exhausted, and let an administrator manually activate unlimited transactions.

**Architecture:** Add a tenant-scoped entitlement record and append-only administrative audit table. Checkout resolves idempotent replays first, then row-locks the entitlement, performs the sale, and increments usage in the same PostgreSQL transaction. The React store loads a capability summary from the API and renders design-system-backed quota warnings and configured WhatsApp/email upgrade actions.

**Tech Stack:** Go 1.25, Fiber v3, pgx v5, PostgreSQL/RLS, React 19, Vite 7, Tailwind CSS v4, Node test runner.

---

## Scope boundary

This plan implements the commercial boundary that can ship independently:

- trial provisioning;
- entitlement reads;
- atomic transaction quota enforcement;
- manual paid activation and suspension;
- quota/contact UX;
- audit and funnel events.

The shared 1,000-product, 1 GB photo, and two-staff safeguards are isolated in
`docs/superpowers/plans/2026-07-26-tenant-resource-guardrails.md`. They must not
delay the transaction-entitlement launch.

## File map

Backend:

- Create `backend/migrations/000012_organization_entitlements.up.sql` and
  `.down.sql`: entitlement, audit, and funnel-event persistence with RLS.
- Create `backend/migrations/000012_organization_entitlements_test.go`: static
  migration contract.
- Create `backend/internal/entitlement/model.go`: public summary and status
  constants.
- Create `backend/internal/entitlement/repository.go`: tenant reads,
  provisioning, checkout locks, usage increments, and event inserts.
- Create `backend/internal/entitlement/service.go`: read and event validation.
- Create `backend/internal/entitlement/handler.go`: authenticated HTTP routes.
- Create `backend/internal/entitlement/service_test.go` and `handler_test.go`.
- Modify `backend/internal/checkout/model.go`, `repository.go`, `service.go`,
  `handler.go`, and their tests: atomic quota enforcement and response summary.
- Create `backend/cmd/entitlement/main.go`: private activation/suspension CLI.
- Create `backend/internal/entitlement/admin.go` and `admin_test.go`: audited
  status transitions independent of Fiber.
- Modify `backend/cmd/api/main.go`: wire entitlement and checkout dependencies.
- Modify integration tests to cover migration, RLS, final-slot concurrency, and
  idempotent replay.
- Modify `backend/.env.example`, `backend/README.md`, and
  `docs/deployment.md`: operator workflow.

Frontend:

- Modify `frontend/DESIGN.md` first: quota hierarchy and upgrade-state rules.
- Create `frontend/src/components/design/EntitlementPatternsShowcase.jsx` and
  test; modify `DesignSystemPage.jsx`: canonical visual states.
- Modify `frontend/.env.example`: contact configuration.
- Create `frontend/src/entitlements/contact-links.js` and test: safe contact
  links.
- Create `frontend/src/components/entitlements/QuotaStatus.jsx` and test:
  normal, warning, urgent, and exhausted states.
- Modify `frontend/src/pos/api-client.js` and test: entitlement and event API.
- Modify `frontend/src/pos/store.jsx` and store tests: entitlement lifecycle and
  structured checkout errors.
- Modify `frontend/src/pages/RetailPosPage.jsx`,
  `frontend/src/components/pos/MobileCheckoutPanel.jsx`, and focused tests:
  checkout blocking without cart loss.

### Task 1: Add entitlement persistence and explicit backfill

**Files:**
- Create: `backend/migrations/000012_organization_entitlements.up.sql`
- Create: `backend/migrations/000012_organization_entitlements.down.sql`
- Create: `backend/migrations/000012_organization_entitlements_test.go`
- Modify: `backend/internal/integration/migration_contract_test.go`

- [ ] **Step 1: Write the failing migration contract test**

```go
func TestOrganizationEntitlementMigrationContract(t *testing.T) {
	t.Parallel()
	content, err := os.ReadFile("000012_organization_entitlements.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	required := []string{
		"create table organization_entitlements",
		"status text not null",
		"transactions_used bigint not null default 0",
		"support_reference text not null",
		"create table organization_entitlement_audit",
		"create table entitlement_events",
		"force row level security",
		"current_setting('app.org_id', true)",
	}
	for _, fragment := range required {
		if !strings.Contains(sql, fragment) {
			t.Errorf("migration missing %q", fragment)
		}
	}
}
```

- [ ] **Step 2: Run the migration test and verify it fails**

Run: `cd backend && go test ./migrations -run TestOrganizationEntitlementMigrationContract -count=1`

Expected: FAIL because migration `000012_organization_entitlements.up.sql` does
not exist.

- [ ] **Step 3: Add the migration**

Use this schema and preserve the existing `begin`/`commit` migration convention:

```sql
begin;

create table organization_entitlements (
  org_id text primary key,
  status text not null default 'trial'
    check (status in ('trial','paid_active','paid_suspended')),
  transaction_limit integer
    check (transaction_limit is null or transaction_limit > 0),
  transactions_used bigint not null default 0
    check (transactions_used >= 0),
  support_reference text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  activated_at timestamptz,
  activated_by text,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'trial' and transaction_limit = 50) or
    (status in ('paid_active','paid_suspended') and transaction_limit is null)
  )
);

create table organization_entitlement_audit (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  actor text not null check (btrim(actor) <> ''),
  previous_status text,
  new_status text not null
    check (new_status in ('trial','paid_active','paid_suspended')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table entitlement_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null check (name in (
    'transaction_10','transaction_25','transaction_40',
    'transaction_45','transaction_50','limit_rejected',
    'upgrade_whatsapp_clicked','upgrade_email_clicked'
  )),
  created_at timestamptz not null default now()
);

create unique index entitlement_events_org_milestone_key
  on entitlement_events (org_id, name)
  where name like 'transaction_%';

insert into organization_entitlements (
  org_id, status, transaction_limit, transactions_used,
  activated_at, activated_by
)
select org_id, 'paid_active', null, count(*) filter (where status='completed'),
       now(), 'migration-000012'
from transactions
group by org_id
on conflict (org_id) do nothing;

insert into organization_entitlements (
  org_id, status, transaction_limit, activated_at, activated_by
)
select org_id, 'paid_active', null, now(), 'migration-000012'
from store_settings
on conflict (org_id) do nothing;

alter table organization_entitlements enable row level security;
alter table organization_entitlements force row level security;
alter table organization_entitlement_audit enable row level security;
alter table organization_entitlement_audit force row level security;
alter table entitlement_events enable row level security;
alter table entitlement_events force row level security;

create policy organization_entitlements_tenant on organization_entitlements
to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));

create policy entitlement_events_tenant on entitlement_events
to balanja_api
using (org_id = current_setting('app.org_id', true))
with check (org_id = current_setting('app.org_id', true));

create policy organization_entitlement_audit_no_tenant_access
on organization_entitlement_audit to balanja_api using (false) with check (false);

grant select, insert, update on organization_entitlements to balanja_api;
grant select, insert on entitlement_events to balanja_api;

commit;
```

The backfill intentionally classifies all existing organizations as
`paid_active` to prevent deployment from blocking current stores. The operator
must review and explicitly suspend any store that should not remain active.

- [ ] **Step 4: Add the down migration**

```sql
begin;
drop table if exists entitlement_events;
drop table if exists organization_entitlement_audit;
drop table if exists organization_entitlements;
commit;
```

- [ ] **Step 5: Extend the integration migration list**

Add `"000011_stock_movement_user_name.up.sql"` and
`"000012_organization_entitlements.up.sql"` after migration 10 in every explicit
migration list under `backend/internal/integration`.

- [ ] **Step 6: Run migration tests**

Run: `cd backend && go test ./migrations ./internal/integration -run 'Migration|Contract' -count=1`

Expected: PASS; integration-only tests without database tags either pass or are
skipped according to their existing build constraints.

- [ ] **Step 7: Commit**

```bash
git add backend/migrations/000012_organization_entitlements.* backend/internal/integration
git commit -m "feat: add organization entitlement storage"
```

### Task 2: Build the tenant entitlement API

**Files:**
- Create: `backend/internal/entitlement/model.go`
- Create: `backend/internal/entitlement/repository.go`
- Create: `backend/internal/entitlement/service.go`
- Create: `backend/internal/entitlement/service_test.go`
- Create: `backend/internal/entitlement/handler.go`
- Create: `backend/internal/entitlement/handler_test.go`
- Modify: `backend/cmd/api/main.go`

- [ ] **Step 1: Write failing service tests**

```go
func TestSummaryDerivesTrialCapabilities(t *testing.T) {
	limit := int64(50)
	row := Record{Status: StatusTrial, TransactionLimit: &limit, TransactionsUsed: 45, SupportReference: "ABC123"}
	got := Summarize(row)
	if got.Remaining != 5 || !got.CanCheckout || got.UnlimitedTransactions {
		t.Fatalf("summary=%#v", got)
	}
}

func TestSummaryBlocksExhaustedAndSuspendedStores(t *testing.T) {
	limit := int64(50)
	trial := Summarize(Record{Status: StatusTrial, TransactionLimit: &limit, TransactionsUsed: 50})
	suspended := Summarize(Record{Status: StatusPaidSuspended, TransactionsUsed: 50})
	if trial.CanCheckout || suspended.CanCheckout {
		t.Fatalf("trial=%#v suspended=%#v", trial, suspended)
	}
}
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd backend && go test ./internal/entitlement -count=1`

Expected: FAIL because the package does not exist.

- [ ] **Step 3: Define the model**

```go
package entitlement

const (
	StatusTrial         = "trial"
	StatusPaidActive    = "paid_active"
	StatusPaidSuspended = "paid_suspended"
	TrialLimit          = int64(50)
)

type Record struct {
	OrgID, Status, SupportReference string
	TransactionLimit               *int64
	TransactionsUsed               int64
}

type Summary struct {
	Status                string `json:"status"`
	TransactionsUsed      int64  `json:"transactionsUsed"`
	TransactionLimit      *int64 `json:"transactionLimit"`
	Remaining             int64  `json:"remaining"`
	CanCheckout           bool   `json:"canCheckout"`
	UnlimitedTransactions bool   `json:"unlimitedTransactions"`
	SupportReference      string `json:"supportReference"`
}

func Summarize(record Record) Summary {
	unlimited := record.Status == StatusPaidActive
	remaining := int64(0)
	if record.TransactionLimit != nil && *record.TransactionLimit > record.TransactionsUsed {
		remaining = *record.TransactionLimit - record.TransactionsUsed
	}
	return Summary{
		Status: record.Status, TransactionsUsed: record.TransactionsUsed,
		TransactionLimit: record.TransactionLimit, Remaining: remaining,
		CanCheckout: unlimited || (record.Status == StatusTrial && remaining > 0),
		UnlimitedTransactions: unlimited,
		SupportReference: record.SupportReference,
	}
}
```

- [ ] **Step 4: Implement lazy, tenant-scoped provisioning**

`PostgresRepository.GetOrCreate` must execute:

```sql
insert into organization_entitlements (org_id,status,transaction_limit)
values ($1,'trial',50)
on conflict (org_id) do nothing;

select org_id,status,transaction_limit,transactions_used,support_reference
from organization_entitlements
where org_id=$1;
```

Wrap it in the existing `database.Runner`. This is the backend half of
organization bootstrap: the first authenticated entitlement read after Clerk
activates an organization creates the trial exactly once.

- [ ] **Step 5: Add `GET /api/v1/entitlement`**

The handler returns:

```json
{
  "data": {
    "status": "trial",
    "transactionsUsed": 0,
    "transactionLimit": 50,
    "remaining": 50,
    "canCheckout": true,
    "unlimitedTransactions": false,
    "supportReference": "A1B2C3D4E5"
  }
}
```

Map authentication absence to the existing `AUTH_REQUIRED` envelope. Repository
failures use the shared internal-error path.

- [ ] **Step 6: Add the bounded funnel-event route**

Register `POST /api/v1/entitlement/events`. Decode with unknown-field rejection
and accept only `upgrade_whatsapp_clicked` or `upgrade_email_clicked` from the
browser:

```go
type EventInput struct {
	Name string `json:"name"`
}

var clientEvents = map[string]struct{}{
	"upgrade_whatsapp_clicked": {},
	"upgrade_email_clicked":    {},
}
```

Insert the event with the authenticated `org_id`. Milestone events remain
server-owned and cannot be submitted by a client. Invalid names return HTTP 422
and `INVALID_ENTITLEMENT_EVENT`.

- [ ] **Step 7: Wire the handler**

```go
entitlementRepository := entitlement.PostgresRepository{}
entitlementService := entitlement.NewService(runner, entitlementRepository)
entitlementHandler := entitlement.NewHandler(entitlementService)
// inside Routes:
entitlementHandler.Register(router)
```

- [ ] **Step 8: Run tests**

Run: `cd backend && go test ./internal/entitlement ./internal/config ./internal/platform/httpserver -count=1`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/entitlement backend/cmd/api/main.go
git commit -m "feat: expose tenant entitlement summary"
```

### Task 3: Enforce quota atomically inside checkout

**Files:**
- Modify: `backend/internal/checkout/model.go`
- Modify: `backend/internal/checkout/service.go`
- Modify: `backend/internal/checkout/repository.go`
- Modify: `backend/internal/checkout/handler.go`
- Modify: `backend/internal/checkout/service_test.go`
- Create: `backend/internal/checkout/repository_test.go`
- Modify: `backend/internal/integration/checkout_test.go`

- [ ] **Step 1: Write failing handler and model tests**

Add an error and response contract:

```go
var ErrTransactionLimitReached = errors.New("transaction limit reached")

type Result struct {
	Transaction Transaction         `json:"transaction"`
	Products    []ProductStock      `json:"products"`
	Entitlement entitlement.Summary `json:"entitlement"`
	Replay      bool                `json:"-"`
}
```

Test `checkoutError`:

```go
func TestCheckoutErrorMapsTransactionLimit(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c fiber.Ctx) error {
		return checkoutError(c, ErrTransactionLimitReached)
	})
	response, _ := app.Test(httptest.NewRequest(http.MethodGet, "/", nil))
	if response.StatusCode != http.StatusPaymentRequired {
		t.Fatalf("status=%d", response.StatusCode)
	}
}
```

- [ ] **Step 2: Run focused checkout tests and verify failure**

Run: `cd backend && go test ./internal/checkout -run 'TransactionLimit|CheckoutError' -count=1`

Expected: FAIL because quota enforcement and mapping are absent.

- [ ] **Step 3: Resolve idempotency before quota**

Keep the current reservation/replay block first. Immediately after it, upsert
and lock the entitlement:

```sql
insert into organization_entitlements (org_id,status,transaction_limit)
values ($1,'trial',50)
on conflict (org_id) do nothing;

select org_id,status,transaction_limit,transactions_used,support_reference
from organization_entitlements
where org_id=$1
for update;
```

If an existing idempotency key already has `transaction_id`, return the replay
before evaluating the current plan. This permits a legitimate response retry
after a store becomes exhausted or suspended.

- [ ] **Step 4: Enforce before allocating transaction number**

Use `entitlement.Summarize(record)`. If `CanCheckout` is false, return
`ErrTransactionLimitReached` before product mutation and before the
`tenant_counters` statement.

- [ ] **Step 5: Increment after the sale is formed**

For trial only, execute this inside the same checkout transaction after the
transaction and stock rows are created:

```sql
update organization_entitlements
set transactions_used=transactions_used+1, updated_at=now()
where org_id=$1
returning org_id,status,transaction_limit,transactions_used,support_reference;
```

Increment `transactions_used` for both trial and `paid_active` so it remains a
lifetime operational counter. A null `transaction_limit` keeps paid checkout
unbounded. Insert milestone events with `on conflict do nothing` only when a
trial usage value becomes 10, 25, 40, 45, or 50.

- [ ] **Step 6: Map the stable API error**

Add this handler mapping:

```go
{ErrTransactionLimitReached, http.StatusPaymentRequired,
 "PLAN_TRANSACTION_LIMIT_REACHED",
 "the trial transaction limit has been reached"}
```

- [ ] **Step 7: Add integration coverage for the final slot and replay**

Seed an entitlement with `transactions_used=49` and stock 2. Run two checkout
requests concurrently with distinct idempotency keys. Assert:

```go
if success != 1 || limited != 1 {
	t.Fatalf("success=%d limited=%d errors=%v", success, limited, errorsByRequest)
}
```

Then replay the successful idempotency key and assert it succeeds with
`Replay=true`, usage remains 50, stock remains 1, and there is exactly one
transaction row.

- [ ] **Step 8: Run checkout tests**

Run: `cd backend && go test ./internal/checkout -count=1`

Expected: PASS.

Run with configured integration database:

`cd backend && go test -tags=integration ./internal/integration -run 'Checkout.*(Final|Limit|Replay)' -count=1`

Expected: PASS when `TEST_DATABASE_URL` and `TEST_RUNTIME_DATABASE_URL` are
available; otherwise report the missing environment rather than claiming the
integration test ran.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/checkout backend/internal/integration/checkout_test.go
git commit -m "feat: enforce trial transaction quota"
```

### Task 4: Add an audited administration command

**Files:**
- Create: `backend/internal/entitlement/admin.go`
- Create: `backend/internal/entitlement/admin_test.go`
- Create: `backend/cmd/entitlement/main.go`
- Modify: `backend/README.md`

- [ ] **Step 1: Write failing transition tests**

```go
func TestNormalizeAdminTransition(t *testing.T) {
	input, err := NormalizeAdminInput(AdminInput{
		OrgID: " org_123 ", Status: "paid_active",
		Actor: "dika", Note: "invoice INV-12",
	})
	if err != nil || input.OrgID != "org_123" {
		t.Fatalf("input=%#v err=%v", input, err)
	}
}

func TestNormalizeAdminTransitionRejectsTrialReset(t *testing.T) {
	_, err := NormalizeAdminInput(AdminInput{OrgID: "org", Status: "trial", Actor: "admin"})
	if !errors.Is(err, ErrInvalidAdminTransition) {
		t.Fatalf("err=%v", err)
	}
}
```

- [ ] **Step 2: Run tests and verify failure**

Run: `cd backend && go test ./internal/entitlement -run Admin -count=1`

Expected: FAIL because admin transition code is absent.

- [ ] **Step 3: Implement audited, idempotent transitions**

`AdminRepository.SetStatus` starts a transaction on the privileged connection,
locks the row, and runs:

```sql
update organization_entitlements
set status=$2,
    transaction_limit=null,
    activated_at=case when $2='paid_active' then coalesce(activated_at,now()) else activated_at end,
    activated_by=case when $2='paid_active' then $3 else activated_by end,
    suspended_at=case when $2='paid_suspended' then now() else null end,
    updated_at=now()
where org_id=$1;
```

If the current status already equals the requested status, return success
without adding a duplicate audit row. Otherwise insert:

```sql
insert into organization_entitlement_audit
  (org_id,actor,previous_status,new_status,note)
values ($1,$2,$3,$4,$5);
```

Reject `trial` as a CLI target so operators cannot accidentally grant a new
50-transaction block.

- [ ] **Step 4: Build the private CLI**

The command contract is:

```text
ADMIN_DATABASE_URL=postgres://... go run ./cmd/entitlement \
  --org-id org_123 \
  --status paid_active \
  --actor dika \
  --note "invoice INV-12"
```

Use `flag.FlagSet`, require `ADMIN_DATABASE_URL`, print the current store name
and old/new status, and exit non-zero on missing organization or validation
failure. Never accept the database URL as a CLI flag, where it would leak into
shell history.

- [ ] **Step 5: Run tests and compile the command**

Run: `cd backend && go test ./internal/entitlement -count=1 && go test ./cmd/entitlement -count=1`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/entitlement backend/cmd/entitlement backend/README.md
git commit -m "feat: add audited entitlement administration"
```

### Task 5: Define quota and upgrade visuals in the design system first

**Files:**
- Modify: `frontend/DESIGN.md`
- Create: `frontend/src/components/design/EntitlementPatternsShowcase.jsx`
- Create: `frontend/src/components/design/EntitlementPatternsShowcase.test.js`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`

- [ ] **Step 1: Write the failing design-system test**

```js
test("design system owns entitlement warning and exhausted states", async () => {
  const guide = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");
  const page = await readFile(new URL("../../pages/DesignSystemPage.jsx", import.meta.url), "utf8");
  assert.match(guide, /Transaction entitlement states/);
  assert.match(page, /EntitlementPatternsShowcase/);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `cd frontend && npm run test -- --test-name-pattern="entitlement warning"`

Expected: FAIL because the showcase and guidance do not exist.

- [ ] **Step 3: Document the visual contract**

Add `Transaction entitlement states` to `frontend/DESIGN.md`:

- normal usage is compact neutral metadata;
- usage 40–44 uses a low-emphasis warning;
- usage 45–49 uses warning surface and explicit upgrade action;
- exhausted uses a persistent warning surface near payment controls;
- limit failure never clears or obscures the cart;
- WhatsApp is primary only when configured; email is secondary;
- operational UI keeps existing compact spacing and token hierarchy;
- contact actions use descriptive labels and visible focus;
- the same state appears consistently on desktop and mobile.

- [ ] **Step 4: Add the showcase**

Render four static examples with existing `Badge`, `Button`, border, surface,
focus, and text tokens:

```jsx
const examples = [
  { used: 12, tone: "neutral", label: "12 dari 50 transaksi digunakan" },
  { used: 40, tone: "warning", label: "10 transaksi trial tersisa" },
  { used: 45, tone: "warning", label: "5 transaksi trial tersisa" },
  { used: 50, tone: "blocked", label: "Kuota trial telah habis" },
];
```

Do not create new color tokens solely for billing.

- [ ] **Step 5: Run focused tests**

Run: `cd frontend && npm run test -- --test-name-pattern="entitlement"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/DESIGN.md frontend/src/components/design/EntitlementPatternsShowcase.jsx frontend/src/components/design/EntitlementPatternsShowcase.test.js frontend/src/pages/DesignSystemPage.jsx
git commit -m "docs: define entitlement interface patterns"
```

### Task 6: Load entitlement state in the frontend store

**Files:**
- Modify: `frontend/src/pos/api-client.js`
- Modify: `frontend/src/pos/api-client.test.js`
- Modify: `frontend/src/pos/store.jsx`
- Modify: `frontend/src/pos/store-data.test.js`

- [ ] **Step 1: Write failing API-client tests**

```js
test("loads the active organization entitlement", async () => {
  let requestURL;
  const api = createAPIClient({
    getToken: async () => "token",
    fetchImpl: async (url) => {
      requestURL = url;
      return new Response(JSON.stringify({ data: { status: "trial", remaining: 50 } }));
    },
  });
  const value = await api.getEntitlement();
  assert.equal(requestURL, "/api/v1/entitlement");
  assert.equal(value.remaining, 50);
});
```

Also update the checkout fixture to include:

```js
entitlement: {
  status: "trial", transactionsUsed: 1, transactionLimit: 50,
  remaining: 49, canCheckout: true,
  unlimitedTransactions: false, supportReference: "ABC123",
}
```

- [ ] **Step 2: Run the API-client test and verify failure**

Run: `cd frontend && node --test src/pos/api-client.test.js`

Expected: FAIL because `getEntitlement` is undefined.

- [ ] **Step 3: Add API methods**

```js
async getEntitlement(options = {}) {
  return (await request("/api/v1/entitlement", options)).data;
},
async recordEntitlementEvent(name, options = {}) {
  return (await request("/api/v1/entitlement/events", {
    ...options, method: "POST", body: { name },
  })).data;
},
```

- [ ] **Step 4: Add store state**

Initialize:

```js
const [entitlement, setEntitlement] = React.useState(null);
const [entitlementError, setEntitlementError] = React.useState("");
const [entitlementLoading, setEntitlementLoading] = React.useState(false);
```

Expose `loadEntitlement({ force, signal })`. Load it when the signed-in
`POSStoreProvider` mounts. On checkout success, replace it with
`result.entitlement`. On `PLAN_TRANSACTION_LIMIT_REACHED`, preserve the cart,
force-refresh entitlement, and return:

```js
{ ok: false, code: error.code, error: "Kuota trial telah habis" }
```

Network errors return their original code and never set the entitlement to an
exhausted state.

- [ ] **Step 5: Run focused tests**

Run: `cd frontend && node --test src/pos/api-client.test.js src/pos/store-data.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pos/api-client.js frontend/src/pos/api-client.test.js frontend/src/pos/store.jsx frontend/src/pos/store-data.test.js
git commit -m "feat: load transaction entitlement state"
```

### Task 7: Build safe contact actions and quota status

**Files:**
- Modify: `frontend/.env.example`
- Create: `frontend/src/entitlements/contact-links.js`
- Create: `frontend/src/entitlements/contact-links.test.js`
- Create: `frontend/src/components/entitlements/QuotaStatus.jsx`
- Create: `frontend/src/components/entitlements/QuotaStatus.test.js`

- [ ] **Step 1: Write failing contact-link tests**

```js
test("builds encoded WhatsApp and email upgrade links", () => {
  const contact = upgradeContacts({
    whatsapp: "628123456789",
    email: "upgrade@example.com",
    storeName: "Toko A & B",
    supportReference: "ABC123",
  });
  assert.match(contact.whatsapp, /^https:\/\/wa\.me\/628123456789\?text=/);
  assert.match(decodeURIComponent(contact.whatsapp), /Toko A & B/);
  assert.match(contact.email, /^mailto:upgrade@example\.com\?/);
  assert.doesNotMatch(contact.whatsapp, /token|transaction/i);
});

test("omits invalid contact channels", () => {
  assert.deepEqual(upgradeContacts({ whatsapp: "abc", email: "bad" }), {});
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `cd frontend && node --test src/entitlements/contact-links.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement strict normalization**

Normalize WhatsApp to 8–15 digits after removing spaces, `+`, and punctuation;
reject any other characters after normalization. Validate email with a compact
single-address check and reject newline characters. Build the message solely
from `storeName` and `supportReference`:

```js
const message = `Halo, saya ingin mengaktifkan paket berbayar Balanja untuk ${safeStoreName}. ID toko: ${safeReference}.`;
```

- [ ] **Step 4: Add deployment variables**

```dotenv
VITE_UPGRADE_WHATSAPP_NUMBER=
VITE_UPGRADE_EMAIL=
```

Do not put real production contact values in the repository.

- [ ] **Step 5: Implement `QuotaStatus`**

Props:

```js
{
  entitlement, error, loading, storeName,
  contacts, onRefresh, onContact
}
```

Rules:

- hide for `paid_active`;
- neutral at usage below 40;
- warning at 40–44;
- urgent at 45–49;
- exhausted at 50 or `canCheckout=false`;
- unavailable state uses `Status paket belum dapat diperiksa` and `Coba lagi`;
- contact anchors call `onContact("upgrade_whatsapp_clicked")` or
  `onContact("upgrade_email_clicked")`;
- use `rel="noreferrer"` for WhatsApp's new tab.

- [ ] **Step 6: Run component tests**

Run: `cd frontend && node --test src/entitlements/contact-links.test.js src/components/entitlements/QuotaStatus.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/.env.example frontend/src/entitlements frontend/src/components/entitlements
git commit -m "feat: add safe trial upgrade actions"
```

### Task 8: Integrate the quota UX without losing the cart

**Files:**
- Modify: `frontend/src/pages/RetailPosPage.jsx`
- Modify: `frontend/src/pages/RetailPosPage.test.js`
- Modify: `frontend/src/components/pos/MobileCheckoutPanel.jsx`
- Modify: `frontend/src/components/pos/pos-components.test.js`
- Modify: `frontend/src/pos/store.jsx`

- [ ] **Step 1: Write failing POS behavior tests**

Assert source/component behavior for:

```js
assert.match(source, /PLAN_TRANSACTION_LIMIT_REACHED/);
assert.match(source, /Upgrade untuk melanjutkan/);
assert.match(source, /QuotaStatus/);
assert.doesNotMatch(store, /setCart\(\[\]\)[\s\S]*PLAN_TRANSACTION_LIMIT_REACHED/);
```

Add a `MobileCheckoutPanel` component test proving an exhausted store can still
open the cart/payment details even though final submission is unavailable.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js src/components/pos/pos-components.test.js`

Expected: FAIL because entitlement UI is not connected.

- [ ] **Step 3: Derive checkout capabilities**

```js
const planBlocksCheckout = store.entitlement?.canCheckout === false;
const checkoutDisabled = store.cart.length === 0 || checkoutPending || planBlocksCheckout;
```

Keep mobile panel expansion dependent only on cart presence and pending state;
pass a separate `submitDisabled` to the final transaction button. Do not disable
cart inspection merely because the plan blocks submission.

- [ ] **Step 4: Render canonical status**

Render `QuotaStatus` immediately above desktop and mobile payment actions. For
the exhausted state, final action copy becomes:

```jsx
{planBlocksCheckout ? "Upgrade untuk melanjutkan" :
 checkoutPending ? "Menyelesaikan…" : "Selesaikan transaksi"}
```

Contact actions use:

```js
upgradeContacts({
  whatsapp: import.meta.env.VITE_UPGRADE_WHATSAPP_NUMBER,
  email: import.meta.env.VITE_UPGRADE_EMAIL,
  storeName: store.settings.storeName,
  supportReference: store.entitlement.supportReference,
})
```

- [ ] **Step 5: Preserve the cart on backend rejection**

The store already clears the cart only inside the successful branch. Retain that
invariant and return the stable error code so `RetailPosPage` shows one upgrade
toast rather than a generic network toast.

- [ ] **Step 6: Run focused and full frontend verification**

Run: `cd frontend && npm run test`

Expected: all frontend tests PASS.

Run: `cd frontend && npm run build`

Expected: Vite production build completes successfully.

- [ ] **Step 7: Visually inspect the design-system and POS states**

Verify at wide desktop and narrow mobile widths:

- normal usage;
- 40-transaction warning;
- 45-transaction urgent warning;
- exhausted trial with populated cart;
- entitlement network failure;
- paid state with no quota warning;
- keyboard focus and reduced-motion behavior.

Confirm the design-system showcase and `frontend/DESIGN.md` match the production
component. If production treatment changes during inspection, update those two
design-system sources in the same commit.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/RetailPosPage.jsx frontend/src/pages/RetailPosPage.test.js frontend/src/components/pos/MobileCheckoutPanel.jsx frontend/src/components/pos/pos-components.test.js frontend/src/pos/store.jsx frontend/DESIGN.md frontend/src/components/design
git commit -m "feat: surface trial quota in checkout"
```

### Task 9: Complete integration, operations, and rollout verification

**Files:**
- Modify: `backend/internal/integration/rls_test.go`
- Modify: `backend/internal/integration/checkout_test.go`
- Modify: `backend/README.md`
- Modify: `docs/deployment.md`
- Create: `docs/operations/entitlements.md`

- [ ] **Step 1: Add RLS integration assertions**

Create entitlements for `org_a` and `org_b`, run through the runtime connection
with `app.org_id=org_a`, and assert only `org_a` is visible. Assert tenant role
cannot insert into `organization_entitlement_audit`.

- [ ] **Step 2: Document the activation runbook**

Include exact commands for:

```bash
cd backend
ADMIN_DATABASE_URL=postgres://... go run ./cmd/entitlement \
  --org-id org_123 --status paid_active --actor operator@example.com \
  --note "invoice INV-12 paid"
```

Also document suspension, `GET /api/v1/entitlement` verification, safe handling
of the admin URL, audit queries, and rollback. State that existing organizations
are backfilled paid to avoid accidental production lockout.

- [ ] **Step 3: Run formatting and backend verification**

Run: `cd backend && gofmt -w ./cmd ./internal`

Run: `cd backend && go vet ./...`

Expected: no diagnostics.

Run: `cd backend && go test ./... -race`

Expected: all non-integration packages PASS.

- [ ] **Step 4: Run database verification**

With test database variables configured:

```bash
cd backend
go test -tags=integration ./internal/integration -count=1
```

Expected: all integration tests PASS, including RLS, final quota concurrency,
and idempotent replay.

- [ ] **Step 5: Run final frontend verification**

```bash
cd frontend
npm run test
npm run build
```

Expected: tests PASS and production build succeeds.

- [ ] **Step 6: Perform staging smoke test**

Verify:

1. Fresh organization receives `trial`, limit 50, usage 0.
2. Usage 49 checkout advances to 50.
3. Next new checkout returns HTTP 402 and
   `PLAN_TRANSACTION_LIMIT_REACHED`.
4. Cart remains populated.
5. WhatsApp/email links contain only store name and support reference.
6. Admin activation changes status to `paid_active`.
7. `Periksa status pembayaran` enables checkout without sign-out.
8. Suspension blocks checkout while all read pages remain available.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/integration backend/README.md docs/deployment.md docs/operations/entitlements.md
git commit -m "docs: add entitlement operations and rollout"
```
