# Sales Report Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tenant-safe sales report with WIB date ranges, equal-period comparisons, product/payment/cashier breakdowns, void visibility, and daily/detail CSV export.

**Architecture:** A new Go report domain owns period validation, SQL aggregation, comparison math, CSV encoding, and HTTP delivery. A dedicated React route owns report query state and composes production report components documented first in the Design System Page and frontend/DESIGN.md. Dashboard remains a quick summary and Transactions remains the row-level audit workspace.

**Tech Stack:** Go 1.25, Fiber v3, pgx v5, PostgreSQL/RLS, React 19, Vite 7, Tailwind CSS v4, existing Balanja chart primitives, Node test runner.

---

## Execution precondition

Execute this plan in a dedicated codex/ worktree created from the branch containing:

- ef1a26c docs: define sales report module
- 2b40e7a docs: clarify product report metric

The primary workspace contains unrelated user changes. Stage only files named by the active task.

## File structure

Backend report domain:

- Create backend/internal/report/model.go for request, period, response, breakdown, and export-row contracts.
- Create backend/internal/report/period.go and period_test.go for WIB parsing and equal-length comparison periods.
- Create backend/internal/report/service.go and service_test.go for orchestration and comparison math.
- Create backend/internal/report/repository.go for bounded PostgreSQL aggregation and streamed detail iteration.
- Create backend/internal/report/csv.go and csv_test.go for RFC 4180 output and formula neutralization.
- Create backend/internal/report/handler.go and handler_test.go for JSON/CSV HTTP endpoints.
- Modify backend/cmd/api/main.go to register the report handler.
- Create backend/internal/integration/report_test.go for PostgreSQL reconciliation and tenant isolation.

Cashier snapshot:

- Modify backend/internal/checkout/model.go, service.go, service_test.go, and repository.go.
- Modify backend/internal/integration/checkout_test.go.
- Modify frontend/src/main.jsx, frontend/src/pos/store.jsx, frontend/src/pos/api-client.js, and its test.

Frontend report data and routing:

- Extend frontend/src/pos/api-client.js and its test with report/download methods.
- Create frontend/src/reports/report-utils.js and its test.
- Create frontend/src/transactions/transaction-filters.js and its test.
- Modify frontend/src/pages/TransactionsPage.jsx.
- Modify frontend/src/shared.jsx, routing.js, routing.test.js, App.jsx, and App.test.js.

Frontend UI and design system:

- Create frontend/src/components/reports/ReportMetricCard.jsx.
- Create frontend/src/components/reports/SalesTrendPanel.jsx.
- Create frontend/src/components/reports/ReportBreakdownPanels.jsx.
- Create frontend/src/components/reports/SalesReportToolbar.jsx.
- Create frontend/src/components/reports/ReportComponents.test.js.
- Create frontend/src/components/design/ReportPatternsShowcase.jsx and its test.
- Modify frontend/src/pages/DesignSystemPage.jsx and frontend/DESIGN.md before adding the feature page.
- Create frontend/src/pages/SalesReportPage.jsx and its test.
- Modify frontend/src/components/page-loading.jsx.

Performance:

- Create backend/internal/integration/report_performance_test.go.
- Create docs/performance/sales-report.md with measured results.

## Task 1: Build and validate WIB periods

**Files:**

- Create: backend/internal/report/model.go
- Create: backend/internal/report/period.go
- Create: backend/internal/report/period_test.go

- [ ] **Step 1: Write the failing period tests**

Add table-driven coverage for one day, 366 leap-year days, reversed dates, 367 days, a future date, unsupported payment, and an explicitly supplied blank cashier ID.

    func TestNormalizeFilterBuildsEqualPreviousPeriod(t *testing.T) {
        now := time.Date(2026, 7, 17, 9, 0, 0, 0, WIBLocation())
        got, err := NormalizeFilter(FilterInput{
            DateFrom: "2026-07-01", DateTo: "2026-07-17", PaymentMethod: " CASH ",
        }, now)
        if err != nil { t.Fatal(err) }
        if got.Current.Days != 17 ||
            got.Current.Start.Format("2006-01-02") != "2026-07-01" ||
            got.Current.End.Format("2006-01-02") != "2026-07-18" {
            t.Fatalf("current=%#v", got.Current)
        }
        if got.Previous.Start.Format("2006-01-02") != "2026-06-14" ||
            got.Previous.End.Format("2006-01-02") != "2026-07-01" {
            t.Fatalf("previous=%#v", got.Previous)
        }
        if got.PaymentMethod != "cash" { t.Fatalf("payment=%q", got.PaymentMethod) }
    }

- [ ] **Step 2: Run the test and verify failure**

    cd backend
    go test ./internal/report -run TestNormalizeFilter -v

Expected: FAIL because FilterInput and NormalizeFilter do not exist.

- [ ] **Step 3: Add the period contracts**

    type FilterInput struct {
        DateFrom, DateTo string
        PaymentMethod    string
        CashierUserID    string
        CashierProvided  bool
    }

    type Period struct {
        DateFrom string    `json:"dateFrom"`
        DateTo   string    `json:"dateTo"`
        Days     int       `json:"days"`
        Start    time.Time `json:"-"`
        End      time.Time `json:"-"`
    }

    type Query struct {
        Current, Previous Period
        PaymentMethod     string
        CashierUserID     string
    }

- [ ] **Step 4: Implement NormalizeFilter**

Parse YYYY-MM-DD using time.ParseInLocation with Asia/Jakarta. Use a fixed +07:00 fallback if timezone data cannot load. Treat dateTo as inclusive in input and create a half-open End with AddDate(0,0,1). Build Previous by subtracting Current.Days from Current.Start. Accept only empty, cash, and qris payments. Enforce a 255-byte cashier ID and reject a present-but-blank value.

- [ ] **Step 5: Run and commit**

    cd backend
    go test ./internal/report -run TestNormalizeFilter -v
    cd ..
    git add backend/internal/report/model.go backend/internal/report/period.go backend/internal/report/period_test.go
    git commit -m "feat: define sales report periods"

Expected: PASS, then one focused commit.

## Task 2: Orchestrate report data and comparisons

**Files:**

- Modify: backend/internal/report/model.go
- Create: backend/internal/report/service.go
- Create: backend/internal/report/service_test.go

- [ ] **Step 1: Write failing service tests**

Use a fake runner/repository. Assert one Query contains both periods, nil collections become empty arrays, and zero prior values return null percentage.

    func TestServiceReportBuildsComparisons(t *testing.T) {
        repo := &fakeRepository{data: ReportData{
            CurrentMetrics: Metrics{
                NetSales: 100000, Tax: 10000, TotalReceived: 110000,
                CompletedTransactions: 2, ItemsSold: 5, AverageTransaction: 55000,
            },
        }}
        got, err := NewService(fakeRunner{}, repo).Report(
            context.Background(),
            database.Identity{OrgID: "org-1", UserID: "user-1"},
            FilterInput{DateFrom: "2026-07-01", DateTo: "2026-07-02"},
            time.Date(2026, 7, 17, 9, 0, 0, 0, WIBLocation()),
        )
        if err != nil { t.Fatal(err) }
        if got.Comparisons["totalReceived"].Percent != nil {
            t.Fatalf("comparison=%#v", got.Comparisons["totalReceived"])
        }
        if got.TopProducts == nil || got.Cashiers == nil || got.CashierOptions == nil {
            t.Fatalf("collections=%#v", got)
        }
    }

- [ ] **Step 2: Run and verify failure**

    cd backend
    go test ./internal/report -run TestService -v

Expected: FAIL because report response types and Service are missing.

- [ ] **Step 3: Add response contracts**

Define the response types exactly enough that repository, service, handler, and frontend names cannot drift:

    type Metrics struct {
        NetSales              int64   `json:"netSales"`
        Tax                   int64   `json:"tax"`
        TotalReceived         int64   `json:"totalReceived"`
        CompletedTransactions int64   `json:"completedTransactions"`
        ItemsSold             int64   `json:"itemsSold"`
        AverageTransaction    float64 `json:"averageTransaction"`
    }

    type Comparison struct {
        Absolute  float64  `json:"absolute"`
        Percent   *float64 `json:"percent"`
        Direction string   `json:"direction"`
    }

    type VoidMetrics struct {
        Count         int64 `json:"count"`
        OriginalValue int64 `json:"originalValue"`
    }

    type TrendPoint struct {
        Bucket        string `json:"bucket"`
        Label         string `json:"label"`
        TotalReceived int64  `json:"totalReceived"`
    }

    type ProductBreakdown struct {
        ProductID string `json:"productId"`
        Label     string `json:"label"`
        Quantity  int64  `json:"quantity"`
        NetSales  int64  `json:"netSales"`
    }

    type PaymentBreakdown struct {
        PaymentMethod   string `json:"paymentMethod"`
        TransactionCount int64 `json:"transactionCount"`
        TotalReceived    int64 `json:"totalReceived"`
    }

    type CashierBreakdown struct {
        CashierUserID        string `json:"cashierUserId"`
        CashierName          string `json:"cashierName"`
        Label                string `json:"label"`
        CompletedTransactions int64 `json:"completedTransactions"`
        ItemsSold             int64 `json:"itemsSold"`
        NetSales              int64 `json:"netSales"`
        Tax                   int64 `json:"tax"`
        TotalReceived         int64 `json:"totalReceived"`
    }

    type CashierOption struct {
        CashierUserID string `json:"cashierUserId"`
        Label         string `json:"label"`
    }

    type ReportData struct {
        CurrentMetrics, PreviousMetrics Metrics
        Voids                          VoidMetrics
        CurrentTrend, PreviousTrend    []TrendPoint
        TopProducts                    []ProductBreakdown
        PaymentMethods                 []PaymentBreakdown
        Cashiers                       []CashierBreakdown
        CashierOptions                 []CashierOption
    }

    type Report struct {
        Period           Period                 `json:"period"`
        ComparisonPeriod Period                 `json:"comparisonPeriod"`
        Metrics          Metrics                `json:"metrics"`
        PreviousMetrics  Metrics                `json:"previousMetrics"`
        Comparisons      map[string]Comparison  `json:"comparisons"`
        Voids            VoidMetrics            `json:"voids"`
        Trend            []TrendPoint            `json:"trend"`
        ComparisonTrend  []TrendPoint            `json:"comparisonTrend"`
        TopProducts      []ProductBreakdown      `json:"topProducts"`
        PaymentMethods   []PaymentBreakdown      `json:"paymentMethods"`
        Cashiers         []CashierBreakdown      `json:"cashiers"`
        CashierOptions   []CashierOption         `json:"cashierOptions"`
        GeneratedAt      time.Time               `json:"generatedAt"`
    }

- [ ] **Step 4: Implement orchestration**

    func (s *Service) Report(ctx context.Context, id database.Identity, input FilterInput, now time.Time) (Report, error) {
        query, err := NormalizeFilter(input, now)
        if err != nil { return Report{}, err }
        var data ReportData
        err = s.runner.Run(ctx, id, func(tx database.Tx) error {
            var loadErr error
            data, loadErr = s.repository.Load(ctx, tx, id.OrgID, query)
            return loadErr
        })
        if err != nil { return Report{}, err }
        return buildReport(query, data, now.In(WIBLocation())), nil
    }

Calculate absolute change and one-decimal percentage. Direction is up, down, or neutral. Previous zero produces Percent nil. Apply the helper to all six metrics.

- [ ] **Step 5: Run and commit**

    cd backend
    go test ./internal/report -run 'TestService|TestComparison' -v
    cd ..
    git add backend/internal/report/model.go backend/internal/report/service.go backend/internal/report/service_test.go
    git commit -m "feat: orchestrate sales report comparisons"

## Task 3: Implement PostgreSQL summary and trends

**Files:**

- Create: backend/internal/report/repository.go
- Create: backend/internal/integration/report_test.go

- [ ] **Step 1: Write a failing integration test**

Seed two organizations, completed and voided rows, tax, multiple item quantities, selected/prior periods, and one day with no sale. Call the service as org_report_a.

    if got.Metrics.NetSales != 30000 || got.Metrics.Tax != 3000 || got.Metrics.TotalReceived != 33000 {
        t.Fatalf("metrics=%#v", got.Metrics)
    }
    if got.Voids.Count != 1 || got.Voids.OriginalValue != 8000 {
        t.Fatalf("voids=%#v", got.Voids)
    }
    if len(got.Trend) != 3 || got.Trend[1].TotalReceived != 0 {
        t.Fatalf("trend=%#v", got.Trend)
    }

- [ ] **Step 2: Run and verify compile failure**

    cd backend
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestSalesReportAggregatesTenantData -v

Expected: FAIL because PostgresRepository is undefined. Use only the isolated databases described in backend/README.md.

- [ ] **Step 3: Implement the bounded summary query**

Use this query shape and scan all money/count values as int64:

    select
      coalesce(sum(t.subtotal) filter (where t.status='completed'),0),
      coalesce(sum(t.tax) filter (where t.status='completed'),0),
      coalesce(sum(t.total) filter (where t.status='completed'),0),
      count(*) filter (where t.status='completed'),
      coalesce(sum(i.item_count) filter (where t.status='completed'),0),
      count(*) filter (where t.status='voided'),
      coalesce(sum(t.total) filter (where t.status='voided'),0)
    from transactions t
    left join lateral (
      select coalesce(sum((item->>'qty')::bigint),0) item_count
      from jsonb_array_elements(t.items) item
    ) i on true
    where t.org_id=$1 and t.created_at >= $2 and t.created_at < $3
      and ($4='' or t.payment_method=$4)
      and ($5='' or t.cashier_user_id=$5)

Compute average in Go as totalReceived/completed count.

- [ ] **Step 4: Implement zero-filled WIB trends**

Use generate_series. Hourly buckets apply when Period.Days equals 1; daily buckets apply otherwise. Aggregate created_at at time zone Asia/Jakarta and return ISO bucket plus 09.00 or 17 Jul label. Call summary and trend for Current and Previous inside Load.

- [ ] **Step 5: Run and commit**

    cd backend
    go test ./internal/report -v
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestSalesReportAggregatesTenantData -v
    cd ..
    git add backend/internal/report/repository.go backend/internal/integration/report_test.go
    git commit -m "feat: aggregate sales report summaries"

## Task 4: Add all selected-period breakdowns

**Files:**

- Modify: backend/internal/report/repository.go
- Modify: backend/internal/integration/report_test.go

- [ ] **Step 1: Add failing assertions**

    if got.TopProducts[0].Quantity != 3 || got.TopProducts[0].NetSales != 30000 {
        t.Fatalf("products=%#v", got.TopProducts)
    }
    if got.PaymentMethods[0].PaymentMethod != "cash" || got.PaymentMethods[0].TotalReceived != 33000 {
        t.Fatalf("payments=%#v", got.PaymentMethods)
    }
    if got.Cashiers[0].CashierUserID != "user-a" || got.Cashiers[0].Label != "Ayu" {
        t.Fatalf("cashiers=%#v", got.Cashiers)
    }

Also call with a cross-tenant cashier ID and assert zero metrics/trend/breakdowns without identity disclosure. CashierOptions may still contain date-scoped options from the authenticated tenant because option discovery intentionally ignores the selected cashier filter.

- [ ] **Step 2: Run and verify failure**

    cd backend
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestSalesReportAggregatesTenantData -v

Expected: FAIL because breakdowns are empty.

- [ ] **Step 3: Implement product and payment queries**

Product value must be snapshot price times quantity:

    select item->>'productId',
           (array_agg(item->>'name' order by t.created_at desc, t.id desc))[1],
           sum((item->>'qty')::bigint),
           sum((item->>'price')::bigint * (item->>'qty')::bigint)
    from transactions t
    cross join lateral jsonb_array_elements(t.items) item
    where t.org_id=$1 and t.status='completed'
      and t.created_at >= $2 and t.created_at < $3
      and ($4='' or t.payment_method=$4)
      and ($5='' or t.cashier_user_id=$5)
    group by item->>'productId'
    order by 4 desc, 3 desc, 1
    limit 10

Group completed rows by payment_method for count and totalReceived.

Use product ID as the grouping key and the most recent item-snapshot name in the selected period as the display label; do not join the current products table and do not use a lexical max as a fake historical label.

- [ ] **Step 4: Implement cashier and stable filter-option queries**

Group by cashier_user_id. Use the most recent nonblank cashier_name in range. Fallback label is Pengguna plus the first eight runes of the ID. Cashier options include completed and voided rows within the selected tenant/date range and deliberately ignore payment/cashier selection so options do not collapse after filtering.

- [ ] **Step 5: Run and commit**

    cd backend
    go test ./internal/report -v
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestSalesReportAggregatesTenantData -v
    cd ..
    git add backend/internal/report/repository.go backend/internal/integration/report_test.go
    git commit -m "feat: add sales report breakdowns"

## Task 5: Encode and stream safe CSV

**Files:**

- Modify: backend/internal/report/model.go
- Create: backend/internal/report/csv.go
- Create: backend/internal/report/csv_test.go
- Modify: backend/internal/report/service.go
- Modify: backend/internal/report/service_test.go
- Modify: backend/internal/report/repository.go
- Modify: backend/internal/integration/report_test.go

- [ ] **Step 1: Write failing CSV tests**

Test BOM, Indonesian header order, WIB timestamp, RFC 4180 quoting, daily zero rows, and formula prefixes = + - @ tab and carriage return.

    func TestWriteTransactionCSVNeutralizesFormula(t *testing.T) {
        var out bytes.Buffer
        rows := []TransactionRow{{
            Number: "TRX-000001", CashierLabel: "=HYPERLINK(\"https://bad\")",
            CashierUserID: "user-1", PaymentMethod: "cash", ItemCount: 2,
            Subtotal: 10000, Tax: 1000, Total: 11000, Status: "completed",
            CreatedAt: time.Date(2026, 7, 17, 2, 0, 0, 0, time.UTC),
        }}
        if err := WriteTransactionCSV(&out, rows); err != nil { t.Fatal(err) }
        if !strings.HasPrefix(out.String(), "\ufeff") || !strings.Contains(out.String(), "'=HYPERLINK") {
            t.Fatalf("csv=%q", out.String())
        }
    }

- [ ] **Step 2: Run and verify failure**

    cd backend
    go test ./internal/report -run 'TestWrite.*CSV|TestSafeCell' -v

Expected: FAIL because the writer does not exist.

- [ ] **Step 3: Implement pure encoders**

Add DailyRow with date, completedTransactions, itemsSold, netSales, tax, totalReceived, voidCount, and voidOriginalValue. Add TransactionRow with number, createdAt, cashierLabel, cashierUserId, paymentMethod, itemCount, subtotal, tax, total, and status. Daily headers are Tanggal, Transaksi Selesai, Item Terjual, Penjualan Bersih, Pajak, Total Diterima, Transaksi Void, and Nilai Void. Detail headers are Nomor Transaksi, Waktu WIB, Kasir, ID Kasir, Metode Pembayaran, Jumlah Item, Subtotal, Pajak, Total, and Status. Write BOM before encoding/csv.Writer and emit numeric measures as plain base-10 numbers.

    func safeCell(value string) string {
        if value == "" { return "" }
        if value[0] == '\t' || value[0] == '\r' { return "'" + value }
        trimmed := strings.TrimLeftFunc(value, unicode.IsSpace)
        if trimmed != "" && strings.ContainsRune("=+-@", rune(trimmed[0])) {
            return "'" + value
        }
        return value
    }

Flush and check csv.Writer.Error.

- [ ] **Step 4: Add repository export contracts**

    Daily(context.Context, database.Tx, string, Query) ([]DailyRow, error)
    StreamTransactions(context.Context, database.Tx, string, Query, func(TransactionRow) error) error

Daily uses selected filters and zero-filled dates. Detail orders by created_at,id, includes completed and voided, and yields each pgx row without a complete slice.

- [ ] **Step 5: Add service Prepare and export methods**

Prepare validates before streaming. ExportDaily loads at most 366 rows and encodes them. ExportTransactions writes the header/BOM once and encodes each yielded row inside the tenant runner callback.

- [ ] **Step 6: Reconcile CSV in integration tests**

Parse both exports with encoding/csv. Assert daily and completed detail sums match JSON metrics and void rows match only void metrics.

- [ ] **Step 7: Run and commit**

    cd backend
    go test ./internal/report -v
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestSalesReport -v
    cd ..
    git add backend/internal/report backend/internal/integration/report_test.go
    git commit -m "feat: export safe sales report csv"

## Task 6: Expose report HTTP endpoints

**Files:**

- Create: backend/internal/report/handler.go
- Create: backend/internal/report/handler_test.go
- Modify: backend/cmd/api/main.go

- [ ] **Step 1: Write failing handler tests**

Use a HandlerService interface and fake. Cover missing identity 401, bad period 422 INVALID_REPORT_FILTER, JSON success, unsupported kind 422, and CSV headers/BOM.

    if got := response.Header.Get("Content-Disposition"); got !=
        "attachment; filename=\"laporan-penjualan-harian-2026-07-01_2026-07-17.csv\"" {
        t.Fatalf("disposition=%q", got)
    }

- [ ] **Step 2: Run and verify failure**

    cd backend
    go test ./internal/report -run TestHandler -v

Expected: FAIL because Handler is undefined.

- [ ] **Step 3: Implement query extraction and JSON route**

    func (h *Handler) Register(g fiber.Router) {
        g.Get("/reports/sales", h.sales)
        g.Get("/reports/sales/export", h.export)
    }

Use c.Request().Queries() to detect cashierUserId presence. Map auth identity to database.Identity and inject h.now for deterministic tests.

- [ ] **Step 4: Implement CSV streaming**

Validate kind/query before headers. Set text/csv; charset=utf-8 and Content-Disposition. Use Fiber v3 Response().SendStreamWriter with a 30-second context timeout. Flush the bufio.Writer. Validation errors remain JSON before streaming; a failure after headers terminates the stream and cannot become JSON.

- [ ] **Step 5: Register the handler**

Construct report.NewHandler(report.NewService(runner, report.PostgresRepository{})) in backend/cmd/api/main.go and register it on the authenticated API group.

- [ ] **Step 6: Run and commit**

    cd backend
    gofmt -w internal/report cmd/api/main.go
    go test ./internal/report ./cmd/api -v
    cd ..
    git add backend/internal/report/handler.go backend/internal/report/handler_test.go backend/cmd/api/main.go
    git commit -m "feat: expose sales report endpoints"

## Task 7: Snapshot cashier display names

**Files:**

- Modify: backend/internal/checkout/model.go
- Modify: backend/internal/checkout/service.go
- Modify: backend/internal/checkout/service_test.go
- Modify: backend/internal/checkout/repository.go
- Modify: backend/internal/integration/checkout_test.go
- Modify: frontend/src/main.jsx
- Modify: frontend/src/pos/store.jsx
- Modify: frontend/src/pos/api-client.js
- Modify: frontend/src/pos/api-client.test.js

- [ ] **Step 1: Write failing backend normalization tests**

Set CashierName to two-space-padded Ayu Pratiwi and expect the repository input to contain the trimmed value. Add a 121-byte rejection case.

- [ ] **Step 2: Add the backend input and persistence**

Add CashierName string with json cashierName,omitempty. Trim before idempotency fingerprinting and reject over 120 bytes. Insert cashier_name with nil for empty. Populate result.Transaction.CashierName. Keep cashier_user_id exclusively from verified database.Identity.

- [ ] **Step 3: Extend checkout integration**

Set CashierName Ayu, then query cashier_user_id,cashier_name. Assert identity user ID and Ayu both persist.

- [ ] **Step 4: Update the failing frontend API test**

    await api.checkout({
      cart: [{ productId: "product-1", qty: 2 }],
      payment: { method: "cash", cashReceived: 10000 },
      cashierName: "Ayu Pratiwi",
    });

Expect cashierName in the body and no cashierUserId.

- [ ] **Step 5: Pass Clerk metadata from the composition boundary**

Import useUser in main.jsx. Pass user?.fullName || "" to POSStoreProvider as cashierName. Make the store forward it to api.checkout. Do not import Clerk in RetailPosPage.

- [ ] **Step 6: Run and commit backend**

    cd backend
    gofmt -w internal/checkout internal/integration/checkout_test.go
    go test ./internal/checkout -v
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestCheckout -v
    cd ..
    git add backend/internal/checkout backend/internal/integration/checkout_test.go
    git commit -m "feat: snapshot cashier names at checkout"

- [ ] **Step 7: Run and commit frontend**

    cd frontend
    node --test --test-name-pattern="checkout sends" src/pos/api-client.test.js
    npm run build
    cd ..
    git add frontend/src/main.jsx frontend/src/pos/store.jsx frontend/src/pos/api-client.js frontend/src/pos/api-client.test.js
    git commit -m "feat: send cashier name with checkout"

## Task 8: Add report methods to the API client

**Files:**

- Modify: frontend/src/pos/api-client.js
- Modify: frontend/src/pos/api-client.test.js

- [ ] **Step 1: Write failing tests**

Assert exact JSON report query encoding, signal propagation, CSV blob, quoted filename, safe fallback filename, and parsed JSON export errors.

    const file = await api.downloadSalesReport(
      { dateFrom: "2026-07-01", dateTo: "2026-07-17" },
      "daily",
    );
    assert.equal(file.filename, "laporan-penjualan-harian-2026-07-01_2026-07-17.csv");
    assert.equal(await file.blob.text(), "csv-body");

- [ ] **Step 2: Run and verify failure**

    cd frontend
    node --test --test-name-pattern="sales report" src/pos/api-client.test.js

Expected: FAIL because report methods do not exist.

- [ ] **Step 3: Extract authenticated fetchResponse**

Keep token, timeout, combined abort signal, and network error behavior in fetchResponse. Keep request responsible for JSON envelope parsing so existing API calls retain behavior.

- [ ] **Step 4: Implement both methods**

    async getSalesReport({ signal, ...filters } = {}) {
      const query = listQuery(filters, ["dateFrom", "dateTo", "paymentMethod", "cashierUserId"]);
      return (await request(`/api/v1/reports/sales${query}`, { signal })).data;
    }

    async downloadSalesReport(filters = {}, kind = "daily", { signal } = {}) {
      const query = listQuery({ ...filters, kind }, ["dateFrom", "dateTo", "paymentMethod", "cashierUserId", "kind"]);
      const response = await fetchResponse(`/api/v1/reports/sales/export${query}`, { signal });
      if (!response.ok) throw await responseError(response);
      return { blob: await response.blob(), filename: attachmentFilename(response, filters, kind) };
    }

Sanitize Content-Disposition to a basename without slash or backslash.

- [ ] **Step 5: Run and commit**

    cd frontend
    node --test src/pos/api-client.test.js
    cd ..
    git add frontend/src/pos/api-client.js frontend/src/pos/api-client.test.js
    git commit -m "feat: add sales report api client"

## Task 9: Add route and Transactions handoff

**Files:**

- Modify: frontend/src/shared.jsx
- Modify: frontend/src/routing.js
- Modify: frontend/src/routing.test.js
- Modify: frontend/src/App.jsx
- Modify: frontend/src/App.test.js
- Create: frontend/src/transactions/transaction-filters.js
- Create: frontend/src/transactions/transaction-filters.test.js
- Modify: frontend/src/pages/TransactionsPage.jsx

- [ ] **Step 1: Write failing tests**

Recognize /reports/sales as private. Parse paymentMethod/dateFrom/dateTo from a query string. Assert explicit WIB boundaries:

    assert.equal(dateBoundaryWIB("2026-07-01"), "2026-06-30T17:00:00.000Z");
    assert.equal(dateBoundaryWIB("2026-07-17", true), "2026-07-17T16:59:59.999Z");

- [ ] **Step 2: Run and verify failure**

    cd frontend
    node --test src/routing.test.js src/transactions/transaction-filters.test.js

Expected: FAIL because route/helper are missing.

- [ ] **Step 3: Add route/navigation**

Add reportsSales: /reports/sales. Add Analisis with Laporan Penjualan and existing file icon. Recognize the route and render SalesReportPage with onNavigate.

- [ ] **Step 4: Preserve query strings in navigate**

Parse new URL(target, window.location.origin), normalize only pathname, and keep search only when the path is allowed. Route state remains pathname.

- [ ] **Step 5: Initialize Transactions from URL**

Use readTransactionFilters(window.location.search). Replace browser-local dateBoundary with dateBoundaryWIB. Keep cashier out of the handoff because Transactions does not support a cashier filter.

- [ ] **Step 6: Run and commit**

    cd frontend
    node --test src/routing.test.js src/transactions/transaction-filters.test.js src/App.test.js
    cd ..
    git add frontend/src/shared.jsx frontend/src/routing.js frontend/src/routing.test.js frontend/src/App.jsx frontend/src/App.test.js frontend/src/transactions frontend/src/pages/TransactionsPage.jsx
    git commit -m "feat: route sales reports and transaction handoff"

## Task 10: Implement pure report UI utilities

**Files:**

- Create: frontend/src/reports/report-utils.js
- Create: frontend/src/reports/report-utils.test.js

- [ ] **Step 1: Write failing utility tests**

Cover today/7/30/month presets at a UTC-to-WIB boundary, default 30 days, custom 366-day validation, trend alignment, cashier fallback, compatible Transactions URL, comparison copy, and object URL cleanup.

    const now = new Date("2026-07-16T18:30:00.000Z");
    assert.deepEqual(presetRange("30d", now), {
      dateFrom: "2026-06-18", dateTo: "2026-07-17",
    });
    assert.equal(
      transactionHandoff({ dateFrom: "2026-07-01", dateTo: "2026-07-17", paymentMethod: "cash", cashierUserId: "user-1" }),
      "/transactions?dateFrom=2026-07-01&dateTo=2026-07-17&paymentMethod=cash",
    );

- [ ] **Step 2: Run and verify failure**

    cd frontend
    node --test src/reports/report-utils.test.js

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement exact exports**

    export function defaultReportFilters(now = new Date())
    export function presetRange(preset, now = new Date())
    export function validateCustomRange(dateFrom, dateTo, today)
    export function alignTrend(current = [], previous = [])
    export function transactionHandoff(filters)
    export function cashierLabel(name, userId)
    export function downloadBlob({ blob, filename }, browser = globalThis)

Use Intl.DateTimeFormat en-CA with timeZone Asia/Jakarta. Shift ISO dates using UTC calendar arithmetic.

- [ ] **Step 4: Implement download cleanup**

Create an object URL, click a hidden anchor with download filename, remove it, and revoke the URL in finally. Inject browser dependencies in tests.

- [ ] **Step 5: Run and commit**

    cd frontend
    node --test src/reports/report-utils.test.js
    cd ..
    git add frontend/src/reports/report-utils.js frontend/src/reports/report-utils.test.js
    git commit -m "feat: add sales report ui utilities"

## Task 11: Define report patterns in Design System first

**Files:**

- Create: frontend/src/components/reports/ReportMetricCard.jsx
- Create: frontend/src/components/reports/SalesTrendPanel.jsx
- Create: frontend/src/components/reports/ReportBreakdownPanels.jsx
- Create: frontend/src/components/reports/SalesReportToolbar.jsx
- Create: frontend/src/components/reports/ReportComponents.test.js
- Create: frontend/src/components/design/ReportPatternsShowcase.jsx
- Create: frontend/src/components/design/ReportPatternsShowcase.test.js
- Modify: frontend/src/pages/DesignSystemPage.jsx
- Modify: frontend/DESIGN.md

- [ ] **Step 1: Write failing pattern tests**

Assert metric absolute/percentage copy, zero-prior copy, current/previous trend and legend, product Penjualan bersih label, Hari ini/7 hari/30 hari/Bulan ini/Rentang khusus controls, active-filter count, two export kinds, DesignSystemPage import, and DESIGN.md product-tax rule.

- [ ] **Step 2: Run and verify failure**

    cd frontend
    node --test src/components/reports/ReportComponents.test.js src/components/design/ReportPatternsShowcase.test.js

Expected: FAIL because the pattern files are missing.

- [ ] **Step 3: Implement metric and trend**

ReportMetricCard accepts label, value, comparison, and formatAbsolute. Use Panel and mono tabular values. SalesTrendPanel aligns arrays and renders:

    <Line dataKey="current" stroke="var(--chart-line-primary)" showMarkers />
    <Line dataKey="previous" stroke="var(--color-text-muted)" strokeWidth={1.75} />

Add text legend markers so color is not the only differentiator.

- [ ] **Step 4: Implement breakdowns and toolbar**

Use Panel, DataTable, SelectField, Input, Button, Badge, and EmptyState. Product renders quantity and net sales. Payment/cashier use approved fields. Void is separate and never merged with completed totals. Toolbar is controlled and emits apply, reset, export, and handoff events; it performs no network request.

- [ ] **Step 5: Add showcase and DESIGN rules**

Render realistic fixtures through production report components. Import ReportPatternsShowcase immediately after DashboardPatternsShowcase. Add Sales reports rules to DESIGN.md: WIB periods, retained-content updating, six metrics, separate voids, prior comparison, product net sales, cashier fallback, CSV actions, keyboard behavior, and mobile stacking.

- [ ] **Step 6: Run, build, and commit**

    cd frontend
    node --test src/components/reports/ReportComponents.test.js src/components/design/ReportPatternsShowcase.test.js
    npm run build
    cd ..
    git add frontend/src/components/reports frontend/src/components/design/ReportPatternsShowcase.jsx frontend/src/components/design/ReportPatternsShowcase.test.js frontend/src/pages/DesignSystemPage.jsx frontend/DESIGN.md
    git commit -m "feat: define sales report ui patterns"

## Task 12: Build the production Sales Report page

**Files:**

- Create: frontend/src/pages/SalesReportPage.jsx
- Create: frontend/src/pages/SalesReportPage.test.js
- Modify: frontend/src/components/page-loading.jsx
- Modify: frontend/src/App.jsx

- [ ] **Step 1: Write failing page contracts**

Assert defaultReportFilters, getSalesReport with AbortController signal, settled report retained during loading, skeleton only before first success, Memperbarui during refetch, toast error on export, transactionHandoff use, and no showcase imports.

- [ ] **Step 2: Run and verify failure**

    cd frontend
    node --test src/pages/SalesReportPage.test.js

Expected: FAIL because the page is missing.

- [ ] **Step 3: Implement fetch lifecycle**

    const [filters, setFilters] = React.useState(() => defaultReportFilters());
    const [report, setReport] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [exporting, setExporting] = React.useState("");

Every applied filter change creates an AbortController. Ignore aborted requests. Initial failure shows error/retry. Refetch failure preserves report and shows a toast.

- [ ] **Step 4: Compose approved order**

Render compact title/toolbar, six metric cards, void indicator, trend, then product/payment/cashier breakdowns. Format money with formatPrice and counts with id-ID locale. Fade only report content during update, not controls.

- [ ] **Step 5: Implement export and handoff**

Call api.downloadSalesReport, then downloadBlob. Disable only the pending export action. Success toast says CSV berhasil dibuat. Failure toast says CSV gagal dibuat. Handoff uses only date/payment compatible filters.

- [ ] **Step 6: Add layout-matched skeleton**

Add SalesReportPageSkeleton with six metric blocks, separate void block, wide trend, and three breakdown panels. Reuse Skeleton and Panel; do not add a full-page spinner.

- [ ] **Step 7: Run, build, and commit**

    cd frontend
    node --test src/pages/SalesReportPage.test.js src/App.test.js src/routing.test.js
    npm run build
    cd ..
    git add frontend/src/pages/SalesReportPage.jsx frontend/src/pages/SalesReportPage.test.js frontend/src/components/page-loading.jsx frontend/src/App.jsx
    git commit -m "feat: add sales report workspace"

## Task 13: Add final reconciliation and accessibility coverage

**Files:**

- Modify: backend/internal/integration/report_test.go
- Modify: frontend/src/pages/SalesReportPage.test.js
- Modify: frontend/src/components/reports/ReportComponents.test.js

- [ ] **Step 1: Add backend invariants**

Assert daily and completed-detail sums equal JSON metrics; void detail equals only void metrics; filters apply to both periods; cashier options ignore dimensional selection but remain date/tenant scoped; unknown/cross-tenant cashier IDs reveal no foreign rows.

- [ ] **Step 2: Add frontend accessibility contracts**

Assert visible labels and inline custom-date errors, aria-pressed presets, aria-expanded popovers, unique export accessible names, focus-visible controls, status/live-region updating and empty messages, and reduced-motion classes.

- [ ] **Step 3: Run focused suites**

    cd backend
    go test ./internal/report -race -count=1 -v
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestSalesReport -race -count=1 -v
    cd ../frontend
    node --test src/reports/report-utils.test.js src/components/reports/ReportComponents.test.js src/pages/SalesReportPage.test.js

Expected: PASS with exact reconciliation and no cross-tenant data.

- [ ] **Step 4: Commit**

    cd ..
    git add backend/internal/integration/report_test.go frontend/src/pages/SalesReportPage.test.js frontend/src/components/reports/ReportComponents.test.js
    git commit -m "test: reconcile sales report outputs"

## Task 14: Measure performance and verify the repository

**Files:**

- Create: backend/internal/integration/report_performance_test.go
- Create: docs/performance/sales-report.md

- [ ] **Step 1: Add an opt-in performance test**

Guard with:

    if os.Getenv("RUN_REPORT_PERF") != "1" {
        t.Skip("RUN_REPORT_PERF=1 is required")
    }

Seed 182,500 completed transactions for a unique tenant using PostgreSQL generate_series, distribute them over 365 days, warm once, measure 20 report calls, sort durations, and fail when p95 exceeds two seconds. Cleanup deletes only the unique tenant rows.

- [ ] **Step 2: Run representative measurement**

    cd backend
    RUN_REPORT_PERF=1 TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -run TestSalesReportPerformance -count=1 -v

Expected: PASS with printed p50/p95 and p95 at or below two seconds.

- [ ] **Step 3: Inspect query plans**

Run EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) for summary and product queries using the same tenant/date bounds. Confirm the existing org_id,created_at,id index bounds the scan and unrelated tenants are not scanned. Do not add an index without measured evidence.

- [ ] **Step 4: Record actual results**

Create docs/performance/sales-report.md with tested commit SHA, staging CPU/RAM/PostgreSQL version, dataset, exact command, observed p50/p95, detail-export first-byte/completion observations, summary/product plan findings, and the final pass/fail conclusion.

- [ ] **Step 5: Run full verification**

    cd backend
    gofmt -w cmd internal
    go vet ./...
    go test ./... -race -count=1
    TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test -tags=integration ./internal/integration -race -count=1 -v
    cd ../frontend
    npm run test
    npm run build

Expected: all tests pass and the production build completes.

- [ ] **Step 6: Inspect scope and commit**

    git status --short
    git diff --check
    git diff --stat
    git add backend/internal/integration/report_performance_test.go docs/performance/sales-report.md
    git commit -m "test: measure sales report performance"

Confirm no unrelated workspace files are staged.

## Final acceptance checklist

- [ ] /reports/sales is authenticated and appears under Analisis.
- [ ] Every active-organization user sees only that tenant.
- [ ] WIB preset/custom periods and equal comparison periods match the spec.
- [ ] Net sales, tax, total, completed count, item count, average, and void values reconcile.
- [ ] Product value is net item sales; no per-product tax allocation exists.
- [ ] Payment/cashier breakdowns share the applied filters.
- [ ] New checkout snapshots cashier name while JWT user ID remains authoritative.
- [ ] Daily/detail CSV is UTF-8 BOM, formula-neutralized, streamed, and reconcilable.
- [ ] Report handoff preserves only compatible date/payment filters.
- [ ] Initial, updating, empty, retry, export error, keyboard, focus, and reduced-motion states are covered.
- [ ] Production report patterns appear in Design System Page and DESIGN.md before feature-page use.
- [ ] Full backend/frontend suites and build pass.
- [ ] Representative 366-day performance results are recorded.
