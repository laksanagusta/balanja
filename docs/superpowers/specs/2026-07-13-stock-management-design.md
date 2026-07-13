# Stock Management Design

Date: 2026-07-13

## Summary

Add a dedicated Stock module for inventory movement management. The module introduces an append-only stock movement ledger while keeping `products.stock` as the cached current stock used by POS, products, and dashboard screens.

The first version covers stock quantity only. It does not include supplier, invoice, unit cost, margin, CSV export, role-based permissions, returns, transfer, or full purchase management.

## Goals

- Record every stock-changing event in an auditable ledger.
- Keep POS checkout fast by continuing to read and lock `products.stock`.
- Add manual stock movements for restock, reduce, and set exact stock.
- Make Products remain the master-data page and Stock become the quantity-management page.
- Keep frontend loading behavior menu-specific: Stock loads products and stock movements only.

## Non-Goals

- Supplier and purchase order workflows.
- Unit cost, COGS, gross margin, or valuation.
- CSV export.
- Role-based permission rules.
- Returns, stock transfer, or multi-location inventory.
- Replacing `products.stock` with computed stock from ledger in v1.

## Data Model

Add a new `stock_movements` table.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `org_id text not null`
- `product_id uuid not null references products(id)`
- `type text not null`
- `quantity_delta integer not null`
- `stock_before integer not null`
- `stock_after integer not null`
- `reason text not null`
- `reference_type text`
- `reference_id uuid`
- `created_by_user_id text not null`
- `created_at timestamptz not null default now()`

Allowed movement types:

- `sale`: created automatically by checkout.
- `restock`: manual stock increase.
- `reduce`: manual stock decrease for damaged/lost/manual removal.
- `set_exact`: manual correction where the submitted quantity is the target final stock.

Constraints:

- `quantity_delta <> 0`
- `stock_before >= 0`
- `stock_after >= 0`
- `btrim(reason) <> ''`
- `type in ('sale', 'restock', 'reduce', 'set_exact')`

Required indexes:

- `(org_id, created_at desc, id desc)` for cursor history.
- `(org_id, product_id, created_at desc, id desc)` for product-specific history.
- `(org_id, type, created_at desc, id desc)` for type filtering.

RLS follows existing tenant pattern:

- Enable and force RLS.
- Policy checks `org_id = current_setting('app.org_id', true)`.
- Runtime role gets `select, insert` on `stock_movements`.

## Stock Invariant

`products.stock` remains the current stock cache and must be updated in the same database transaction as the inserted movement.

Every stock-changing code path must follow this invariant:

1. Lock the product row with `FOR UPDATE`.
2. Calculate `stock_before`, `quantity_delta`, and `stock_after`.
3. Reject if `stock_after < 0`.
4. Update `products.stock`.
5. Insert `stock_movements`.
6. Commit.

No implementation should directly change `products.stock` outside checkout or the stock movement service.

## Backend API

### `GET /api/v1/stock/movements`

Returns paginated stock movement history.

Supported query parameters:

- `productId`
- `type`
- `q`
- `dateFrom`
- `dateTo`
- `cursor`
- `limit`

Rows should include joined product context:

- product name
- barcode
- category
- unit

Pagination should follow the transaction history pattern: cursor over `(created_at, id)` ordered descending.

### `POST /api/v1/stock/movements`

Creates a manual stock movement.

Request:

```json
{
  "productId": "uuid",
  "type": "restock | reduce | set_exact",
  "quantity": 10,
  "reason": "Barang masuk dari supplier"
}
```

Semantics:

- `restock`: `quantity_delta = +quantity`
- `reduce`: `quantity_delta = -quantity`
- `set_exact`: `quantity` is the target final stock; `quantity_delta = quantity - stock_before`

Rules:

- `quantity` must be a positive integer for `restock` and `reduce`.
- `quantity` must be zero or greater for `set_exact`.
- `reason` is required for all manual movements.
- Manual movements only apply to active products in v1.
- Any signed-in user in the org may create a manual movement in v1.
- The backend sets `created_by_user_id` from auth identity.

Response includes:

- created movement
- updated product stock

Errors:

- `404 PRODUCT_NOT_FOUND`
- `409 PRODUCT_INACTIVE`
- `409 INSUFFICIENT_STOCK`
- `422 INVALID_STOCK_MOVEMENT`

## Checkout Integration

Checkout must write `sale` stock movements for every item after inserting the transaction and while updating product stock.

For each item:

- `type = 'sale'`
- `quantity_delta = -quantity`
- `stock_before` from locked product row or current stock before decrement.
- `stock_after = stock_before - quantity`
- `reason = 'Completed sale ' || transaction_number`
- `reference_type = 'checkout'`
- `reference_id = transaction_id`
- `created_by_user_id = identity.user_id`

The checkout response can stay compatible with current frontend behavior by continuing to return updated product stock.

## Frontend UX

Add a new sidebar route:

- Label: `Stock`
- Path: `/stock`
- Icon: package/list-style icon from existing primitives
- Position: between `Products` and `Transactions`

### Stock Page Layout

Use the established catalog/history page pattern from `DESIGN.md`.

Sections:

- Header with title `Stock`, search input, and `New movement` secondary button.
- Movement history table.
- Empty state matching existing table panel style.

No dashboard cards in v1. Keep the page dense, operational, and consistent with Products and Transactions.

### New Movement Dialog

Fields:

- Product picker/searchable select for active products.
- Movement type: Restock, Reduce, Set exact stock.
- Quantity input with thousand separators.
- Required reason input.

Preview:

- Current stock
- Delta
- Stock after

Submit:

- Primary button: `Save movement`
- Pending label: `Saving...`
- Disable close/submit while request is in flight.

After success:

- Show success toast.
- Refresh products.
- Refresh stock movement list.

### Movement History Table

Columns:

- Date/time
- Product
- Type badge
- Delta
- Before -> After
- Reason
- User
- Reference

Filters:

- Search product/name/barcode/category
- Movement type
- Date range
- Cursor pagination

Delta styling:

- Positive deltas use success tone.
- Negative sale/reduce deltas use warning or danger tone.
- `set_exact` uses neutral badge plus signed delta.

## Frontend Store And API Client

Add API client methods:

- `listStockMovements(filters, options)`
- `createStockMovement(input, options)`

Add store methods:

- `loadStockMovements(filters)`
- `createStockMovement(input)`

The Stock page should load only:

- products for the picker and current stock display
- stock movements for history

It must not load settings or transactions.

## Testing

Backend tests:

- Restock increases product stock and inserts a movement.
- Reduce decreases product stock and inserts a movement.
- Set exact stock computes the correct delta.
- Negative final stock is rejected.
- Manual movement for inactive product is rejected.
- Checkout creates `sale` movements.
- Movement list supports filters and cursor pagination.

Migration/contract tests:

- `stock_movements` table exists.
- RLS is enabled and forced.
- Tenant policy exists.
- Runtime grants exist.
- Required indexes exist.

Frontend tests:

- API client sends manual movement payload correctly.
- Stock movement loader calls only stock/products APIs needed by the page.
- Thousand-separated quantity inputs are parsed into plain numbers.
- Stock after preview computes correctly for restock, reduce, and set exact.

Verification commands:

- `go test ./...`
- `npm run test`
- `npm run build`

## Rollout

1. Add schema and backend stock movement service.
2. Integrate checkout sale movements.
3. Add frontend API/store methods.
4. Add Stock route and page.
5. Add design-system documentation for the Stock page and movement dialog patterns if new reusable UI is introduced.

## Open Decisions

All decisions needed for v1 are resolved:

- Ledger uses append-only movement records plus cached `products.stock`.
- Movement types are sale, restock, reduce, and set exact.
- Quantity only, no cost/supplier/invoice in v1.
- Dedicated Stock menu.
- Manual actions: restock, reduce, set exact.
- Movement history has basic filters, no CSV export.
- All signed-in org users can create manual movements in v1.
