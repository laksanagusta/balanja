# Sales report performance

Status: **benchmark not executed in this workspace**.

The implementation includes an opt-in PostgreSQL benchmark at `backend/internal/integration/report_performance_test.go`. It seeds 182,500 completed transactions (500/day for 365 days) into a unique tenant, warms the report once, measures 20 full JSON report calls, reports p50/p95, enforces a two-second p95 target, and deletes only that tenant's rows.

## Required measurement environment

- A disposable PostgreSQL database with the current migrations.
- Owner/admin connection in `TEST_DATABASE_URL` for bounded seed and cleanup.
- RLS runtime connection in `TEST_RUNTIME_DATABASE_URL`.
- Recorded CPU, RAM, PostgreSQL version, and commit SHA.

Run:

```bash
cd backend
RUN_REPORT_PERF=1 TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" \
  go test -tags=integration ./internal/integration -run TestSalesReportPerformance -count=1 -v
```

Then inspect `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` for the summary and product-breakdown queries with the same tenant and date bounds. Confirm the existing `transactions_org_cursor_idx (org_id, created_at desc, id desc)` bounds the tenant/date scan before proposing any additional index.

## Results

| Field | Result |
| --- | --- |
| Commit | Pending representative run |
| Infrastructure | Not available in this workspace |
| PostgreSQL version | Not measured |
| Dataset | 182,500 completed transactions, benchmark definition ready |
| JSON report p50 / p95 | Not measured |
| Detail CSV first byte / completion | Not measured |
| Summary query plan | Not inspected; test database unavailable |
| Product query plan | Not inspected; test database unavailable |
| Conclusion | Pending; no performance claim can be made yet |

Do not replace the pending values with estimates. Record only measurements from the disposable representative database.
