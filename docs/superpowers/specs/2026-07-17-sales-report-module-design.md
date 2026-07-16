# Sales Report Module Design

**Date:** 2026-07-17
**Status:** Approved design
**Scope:** MVP sales reporting for Balanja

## Summary

Balanja will add a dedicated sales-reporting module for business analysis and reconciliation. The module will be separate from the existing Dashboard and Transactions pages:

- Dashboard remains a quick 7/30-day operational summary.
- Sales Reports provides flexible periods, prior-period comparisons, sales breakdowns, cashier analysis, and CSV export.
- Transactions remains the detailed audit and search workspace.

The report will aggregate tenant-scoped transaction data directly in PostgreSQL. It will not introduce summary tables or background jobs at the expected scale of at most 500 transactions per shop per day.

## Goals

- Show reliable sales metrics for preset and custom date ranges.
- Compare the selected period with the immediately preceding period of equal length.
- Separate net sales, tax, and total received so “revenue” is not ambiguous.
- Analyze sales by product, payment method, and cashier.
- Exclude voided transactions from sales metrics while exposing void activity separately.
- Export both daily summaries and transaction-level detail as CSV.
- Keep on-screen and exported figures consistent by sharing filter and calculation rules.
- Preserve tenant isolation through the existing authenticated API and PostgreSQL RLS.

## Non-goals

The MVP does not include:

- profit, cost of goods sold, or gross margin because products do not store historical cost;
- category reporting because transaction item snapshots do not store category;
- PDF export;
- duplicated transaction tables inside the report page;
- partial refunds or refund accounting;
- scheduled or emailed reports;
- precomputed report tables, materialized views, or report jobs;
- role-based report access;
- speculative backfilling of historical cashier names.

## Users and access

Every authenticated user with an active organization may access the report for that organization. The current authorization model has no application roles, so the MVP does not distinguish owners, admins, and cashiers.

The server derives `org_id` and the requesting user from the verified Clerk JWT. The frontend never supplies an organization ID. All report queries run through the existing tenant transaction runner and RLS context.

## Information architecture

### Routes and navigation

- Frontend route: `/reports/sales`
- Navigation group: `Analisis`
- Navigation item: `Laporan Penjualan`

The report route is intentionally specific so future report types can live under `/reports/*` without changing this page's meaning.

### Relationship to existing pages

The report page does not render a full transaction table. Its `Lihat transaksi` handoff opens the Transactions page and carries compatible date and payment-method filters. Transactions remains responsible for audit, row-level inspection, searching, sorting, and pagination.

Dashboard calculations may share small domain helpers with reports when their semantics are identical. The implementation must not turn Dashboard into a thin alias of the report API or create a broad generic analytics abstraction before two consumers demonstrably need it.

## Page design

### Header and filters

The page opens on the last 30 calendar days. The compact header contains:

- period presets: `Hari ini`, `7 hari`, `30 hari`, `Bulan ini`, and `Rentang khusus`;
- a payment-method filter;
- a cashier filter;
- an active-filter count;
- `Lihat transaksi`;
- an `Ekspor CSV` menu with `Ringkasan harian` and `Detail transaksi`.

Preset changes apply immediately. A custom range applies only after both dates are valid and the user presses `Terapkan`. This avoids requests for incomplete or transient date selections.

The default period is the current local date and the 29 preceding local dates in `Asia/Jakarta`.

### Summary metrics

The first section contains:

- `Penjualan bersih`: sum of transaction subtotal;
- `Pajak`: sum of transaction tax;
- `Total diterima`: sum of transaction total;
- `Transaksi selesai`: count of completed transactions;
- `Rata-rata transaksi`: total received divided by completed transaction count;
- `Item terjual`: sum of item quantities from completed transactions.

Each metric includes the previous-period value, absolute change, and percentage change. If the previous value is zero, the UI shows `Tidak ada data pembanding` instead of an undefined or infinite percentage. Integer money values remain integer rupiah; only averages and percentages require controlled rounding.

### Void indicator

Voided activity appears separately from sales metrics and includes:

- count of voided transactions;
- original total value of voided transactions.

Voided values are informational and are never subtracted from or added to completed-sales figures. This reflects the current data model, which records status but does not model refund cash flows.

### Sales trend

- `Hari ini` uses hourly buckets in WIB.
- Multi-day periods use daily buckets in WIB.
- Empty buckets are returned as zero so lines and CSV summaries cover the complete selected period.
- The chart shows the selected period and its immediately preceding comparison period.
- For multi-day ranges, comparison buckets align by ordinal day rather than calendar label.

The report reuses the established Balanja chart components and chart palette. It does not introduce a new visualization library or decorative chart treatment.

### Breakdowns

The report includes:

- top 10 products by total received, also showing quantity sold;
- all payment methods present in the period, showing transaction count and total received;
- all cashiers present in the period, showing completed transaction count, item count, net sales, tax, and total received.

Product grouping uses the transaction snapshot's product ID, name, price, and quantity. It does not join the current product category because that would rewrite historical meaning when a product changes category.

Cashier grouping uses `cashier_user_id` as the stable key. `cashier_name` is display metadata. Missing names render as `Pengguna <short-id>` and remain visibly identifiable as a fallback rather than being silently guessed.

### Responsive and loading behavior

Desktop uses a compact grid consistent with the operational Dashboard. Small screens stack the header controls, summary cards, chart, and breakdown panels without changing their information order.

- Initial load uses a layout-matched skeleton.
- Filter refetches retain settled content, reduce the affected content opacity, and show `Memperbarui`.
- Controls remain available during refetch except the specific action already pending.
- Reduced-motion behavior follows `frontend/DESIGN.md`.

Any report-specific visual pattern must be added to the Design System Page and documented in `frontend/DESIGN.md` before or alongside its first use on the feature page. Production pages must consume production components, never showcase modules.

## Period and filter semantics

The frontend sends local calendar dates as `YYYY-MM-DD`. The backend owns all validation and converts the inclusive UI dates to a half-open timestamp range:

```text
[dateFrom at 00:00 WIB, day after dateTo at 00:00 WIB)
```

Rules:

- minimum range: one calendar day;
- maximum range: 366 calendar days;
- `dateFrom` must not be after `dateTo`;
- future dates may not extend beyond the current local date;
- comparison range: the immediately preceding range with the same number of calendar days;
- payment and cashier filters apply identically to current and comparison periods;
- metrics include only `completed` transactions;
- void indicators include only `voided` transactions.

The `Bulan ini` preset runs from the first day of the current WIB month through the current WIB date. Its comparison is the equal-length range immediately before the first day, not necessarily the complete previous calendar month.

## Backend design

### Module boundary

Add a focused backend domain under `backend/internal/report` with the established layers:

- handler: HTTP parsing, validation error mapping, and response headers;
- service: period construction, comparison semantics, and orchestration;
- repository: tenant-scoped SQL aggregation and streaming detail rows;
- model: request filters and report/export response types.

Each layer exposes report-specific interfaces so it can be tested independently. The report domain may reuse platform utilities but must not import frontend concepts.

### JSON endpoint

```http
GET /api/v1/reports/sales
```

Query parameters:

- `dateFrom` — required `YYYY-MM-DD`;
- `dateTo` — required `YYYY-MM-DD`;
- `paymentMethod` — optional supported payment method;
- `cashierUserId` — optional opaque cashier identifier with a conservative length limit.

The response data contains:

- selected and comparison period metadata;
- selected and comparison summary metrics;
- calculated metric changes;
- selected and comparison trend series;
- selected-period void metrics;
- selected-period top products;
- selected-period payment-method breakdown;
- selected-period cashier breakdown;
- cashier filter options found within the selected tenant and date range before payment/cashier filters are applied;
- a generation timestamp.

Breakdowns describe the selected period only. Prior-period comparison is limited to summary metrics and the trend series so the response stays understandable and bounded.

Cashier filter options are computed from both completed and voided transactions in the selected date range. They are independent of the current payment/cashier selection so applying a filter does not remove other valid choices from the control. The backend does not attempt organization-membership validation for an opaque cashier ID because the current schema has no membership table. The tenant predicate remains authoritative: an unknown or cross-tenant ID produces an empty report and reveals no external identity information.

### CSV endpoint

```http
GET /api/v1/reports/sales/export
```

It accepts the same filters plus:

- `kind=daily` for a daily summary;
- `kind=transactions` for transaction detail.

The server sends `text/csv; charset=utf-8`, a UTF-8 BOM, and an attachment filename containing the export kind and period. CSV follows RFC 4180 comma-separated quoting conventions.

`daily` has one row per selected local date, including dates with no activity. Columns cover date, completed count, item count, net sales, tax, total received, void count, and original void value.

`transactions` has one row per completed or voided transaction. Columns cover transaction number, WIB timestamp, cashier label, cashier user ID, payment method, item count, subtotal, tax, total, and status. Voided monetary values remain their original positive transaction values and are interpreted through the status column.

The detail export streams database rows through the HTTP response. It must not load the full result set or full CSV into memory.

### Query strategy

PostgreSQL performs aggregation within the selected and comparison bounds. The service does not load complete transaction histories and aggregate them in Go.

- Summary and payment/cashier breakdowns aggregate transaction columns.
- Item count and product breakdown expand the existing `items` JSONB snapshot within the bounded period.
- Daily and hourly series use generated time buckets so missing buckets return zero.
- Existing `(org_id, created_at, id)` transaction indexing provides the initial bounded scan path.

At the target scale, optimize query plans and add narrowly justified indexes only after representative `EXPLAIN ANALYZE` evidence. Do not introduce pre-aggregation as the first response to a slow query.

## Cashier snapshot completion

The transactions table already has nullable `cashier_name`, but checkout currently persists only `cashier_user_id`.

For new checkouts:

1. the signed-in frontend obtains the Clerk display name;
2. checkout sends it as optional display metadata;
3. backend trims it, enforces a conservative length limit, and stores it in `cashier_name`;
4. backend always obtains `cashier_user_id` from the verified JWT and never accepts it from the request.

The name is not an authorization input. A manipulated display name cannot change identity, tenancy, or grouping key. Historical null names are not backfilled from the current user profile because that would claim knowledge about a past snapshot that the system did not record.

## Frontend data flow

1. Route initialization creates the default 30-day filter in WIB.
2. The report page asks the API client for the JSON report.
3. The server validates filters, derives both periods, runs tenant-scoped aggregations, and returns one coherent report response.
4. Filter changes cancel obsolete requests through `AbortController`.
5. Settled data remains visible while the newest valid request is pending.
6. Export calls a dedicated API-client download method that handles the CSV response as a stream/blob instead of using the existing JSON envelope parser.
7. The browser saves the server-provided filename.

The report page owns its query state. Report data does not enter the shared POS product or transaction caches because one filtered report is not the canonical collection.

## Error handling

### Validation errors

The backend rejects:

- malformed or nonexistent calendar dates;
- inverted ranges;
- ranges longer than 366 days;
- dates beyond the current WIB date;
- unsupported payment methods;
- unsupported export kinds;
- empty or excessively long cashier identifiers when the optional filter is present.

Validation errors use stable application codes and concise user-safe messages. A cashier validation failure must not reveal whether that ID exists in another tenant.

### UI errors

- Initial failure: replace the skeleton with a report error state and `Coba lagi`.
- Refetch failure: retain the last successful report and show an error toast.
- Export failure: retain the page, re-enable the export action, and show an error toast.
- Empty completed period: show zero-valued metrics and established empty states; still show void information if present.
- Zero prior value: show `Tidak ada data pembanding` rather than an invalid percentage.

The JSON endpoint returns a single consistent report or an error; it does not expose partially calculated panels.

## CSV safety

CSV strings derived from stored or user-controlled text must be protected against spreadsheet formula execution. Before quoting, prefix a leading apostrophe when the first meaningful character is `=`, `+`, `-`, or `@`, or when the raw value begins with a tab or carriage return. Standard CSV quoting alone is not sufficient protection.

Numeric measures are emitted as plain base-10 numbers without currency symbols or thousands separators so spreadsheet applications can aggregate them. Daily dates use `YYYY-MM-DD`; transaction timestamps include the WIB offset.

## Testing strategy

### Backend unit tests

- valid one-day and 366-day periods;
- rejected zero-length, inverted, future, and 367-day periods;
- equal-length prior-period derivation across month/year boundaries and leap years;
- WIB bucket construction;
- completed versus voided semantics;
- subtotal, tax, total, average, item, product, payment, and cashier aggregation;
- comparison absolute/percentage changes and zero-prior handling;
- missing cashier-name fallback;
- checkout cashier-name normalization while JWT user ID remains authoritative.

### Backend handler and repository tests

- valid and invalid JSON endpoint filters;
- both export kinds and response headers;
- daily zero-filled rows;
- detail export includes completed and voided rows;
- CSV BOM, column ordering, RFC 4180 escaping, and formula-injection protection;
- RLS prevents cross-organization reads;
- an unknown or cross-tenant cashier filter returns no rows and cannot reveal another tenant's activity;
- report totals and CSV totals reconcile for the same fixture.

### Frontend tests

- `/reports/sales` routing and the `Analisis` navigation entry;
- default 30-day WIB filter;
- preset and custom-range behavior;
- active filter count and filter reset;
- stale-request cancellation;
- initial loading, updating, empty, and error states;
- zero-prior comparison copy;
- product, payment, cashier, trend, and void rendering;
- both CSV download paths and export-error recovery;
- Transactions handoff preserves compatible filters;
- keyboard operation, accessible form labels, focus visibility, and reduced motion;
- report patterns exist in the Design System Page and their rules are reflected in `frontend/DESIGN.md`.

### Consistency invariants

- Daily selected-period totals equal the selected-period summary metrics.
- Completed rows in the detail export reconcile with completed report metrics.
- Voided rows never contribute to completed metrics.
- UI and both exports apply the same date, payment, cashier, tenant, and status semantics.

## Performance acceptance

Use representative staging data at up to 500 transactions per day.

- A 366-day JSON report should target p95 response time near two seconds on the target staging infrastructure.
- Detail export should begin sending rows without constructing the complete file in memory.
- Frontend refetches must remain interactive and preserve settled content.

If the target is missed, inspect query plans, reduce redundant scans, and add evidence-backed indexes. Reconsider pre-aggregation only if direct aggregation remains insufficient after those steps.

## Delivery boundaries

Implementation is complete when:

- the authenticated route and navigation entry exist;
- report JSON and both CSV endpoints follow the documented semantics;
- cashier names are captured for new transactions without weakening JWT identity;
- the report page implements all approved states and breakdowns;
- the Design System Page and `frontend/DESIGN.md` contain the report patterns used in production;
- consistency, tenant isolation, CSV safety, and accessibility tests pass;
- representative performance has been measured and documented.
