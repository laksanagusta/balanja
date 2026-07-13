# Server-Side Pagination And Filtering Design

Date: 2026-07-13

## Summary

Move the Products, Transactions, and Stock movement tables from client-side slicing, filtering, and sorting to server-backed cursor pagination. Each page keeps its existing compact operational layout while loading only the requested rows and preserving immediate feedback during search and navigation.

The implementation uses one cursor contract across all three resources. Users navigate with Previous and Next; direct page-number jumps and exact total counts are intentionally excluded.

## Goals

- Keep large catalogs and append-only histories responsive as tenant data grows.
- Make filtering and sorting correct across the complete server dataset, not only the currently loaded batch.
- Use one predictable pagination interaction across Products, Transactions, and Stock.
- Preserve responsive typing, settled table content, and current filters during background requests.
- Keep catalog query state separate from the complete product cache used by POS and cart workflows.

## Non-Goals

- Direct navigation to a numbered page.
- Exact result counts or `totalPages`.
- Infinite scrolling or automatic loading on scroll.
- Pagination for Dashboard, Settings, transaction detail, or the stock product picker.
- A new query-state dependency.
- Persisting filters or cursors in the URL in this version.
- Redesigning the POS product grid. Its server-search and progressive-loading strategy can be handled separately.

## Existing Problems

- `DataTable` currently owns page state and slices the array it receives. This is only valid when the array contains the complete result set.
- Transactions fetch only the first 50 server rows, then filter, sort, and paginate that partial batch in the browser.
- Stock movement filtering is partly server-side, but sorting and the visible pager apply only to the fetched batch. The API already returns a next cursor that the table does not control.
- Products can server-search by `q`, but the catalog still loads up to 10,000 rows and paginates locally.
- The current footer reports `Showing X-Y of N`, where `N` can be only the loaded subset rather than the real result count.

## Chosen Approach

Use keyset cursor pagination for all three operational tables.

Every list request includes an allowlisted sort key and direction. The opaque cursor records the final row's active sort value plus its ID as a deterministic tie-breaker. The server returns the next cursor and whether another page exists. The frontend stores cursors it has already visited so Previous does not require a reverse cursor from the server.

This approach is preferred over offset pagination because new transactions and stock movements can arrive while a user is browsing. Keyset pagination avoids row duplication or omission caused by shifting offsets and does not require expensive exact counts.

## Common API Contract

All three list endpoints accept these query parameters:

- `q`: trimmed free-text search where supported.
- `limit`: page size; default 20, maximum 100.
- `sort`: endpoint-specific allowlisted field.
- `dir`: `asc` or `desc`.
- `cursor`: opaque cursor returned by the same endpoint, filter set, sort key, and direction.

Each successful response uses this envelope:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "opaque-value-or-empty",
    "hasNextPage": true
  }
}
```

`hasNextPage` is derived by querying `limit + 1` rows. The extra row is not returned. No exact total is computed.

Invalid filters, sort keys, directions, or limits return a stable 422 application error. Malformed or incompatible cursors return `400 INVALID_CURSOR`. The server never interpolates raw client sort values into SQL; it maps allowlisted values to known column expressions.

## Cursor Contract

The cursor is a versioned, opaque, URL-safe Base64 payload containing:

- cursor version
- active sort key
- active sort direction
- fingerprint of the normalized endpoint, filters, sort, direction, and page size
- normalized final sort value
- final row ID

The server recomputes the request fingerprint and compares it with the cursor. A cursor reused with different filters, sort, direction, or page size is rejected rather than producing ambiguous results. Query changes reset pagination in the frontend, so this should only occur for malformed or stale external requests.

Rows always include ID as the final tie-breaker, using the same direction as the selected sort. Null-capable sortable values must be normalized consistently in both ordering and cursor comparison. Endpoint repository tests must cover duplicate sort values so rows do not repeat or disappear at page boundaries.

## Endpoint Filters And Sorting

### Products

Endpoint: `GET /api/v1/products`

Filters:

- `q`: name, barcode, or category.
- `category`: exact category match.
- `active`: `true`, `false`, or omitted for all.

Sort allowlist:

- `createdAt` (default, descending)
- `name`
- `category`
- `price`
- `stock`

The response changes from a bare data array to the common paginated envelope. Small product search consumers, including the stock product picker, continue using `q` plus a fixed limit; their API helper unwraps `items` and deliberately discards pagination metadata.

### Transactions

Endpoint: `GET /api/v1/transactions`

Filters:

- `q`: transaction number or cashier name.
- `paymentMethod`: exact normalized payment method.
- `dateFrom`: inclusive RFC3339 lower bound.
- `dateTo`: inclusive RFC3339 upper bound.

Sort allowlist:

- `createdAt` (default, descending)
- `number`
- `paymentMethod`
- `total`

Status filtering is excluded because the current transaction history contains completed sales only. It can be added when refunds or other lifecycle states become real workflows.

### Stock Movements

Endpoint: `GET /api/v1/stock/movements`

Filters:

- Existing `q`, `type`, `productId`, `dateFrom`, and `dateTo` filters remain.

Sort allowlist:

- `createdAt` (default, descending)
- `productName`
- `type`
- `quantityDelta`
- `stockAfter`

Joined product values used for ordering and cursor comparison must use the same normalization expression. Repository queries should be checked with representative `EXPLAIN` output; add focused indexes only where an allowlisted sort or filter shows an actual expensive scan.

## Frontend Architecture

### `DataTable`

`DataTable` becomes a rendering primitive. It receives rows that are already the visible server page and no longer slices data or owns page state.

It keeps column rendering, accessible sorting headers, row styling, and horizontal overflow behavior. A sort header calls the page controller, which resets the cursor and requests the first page in the new order.

### `TablePagination`

Extract a controlled pagination footer with:

- `rangeStart`
- `rangeEnd`
- `pageSize`
- `pageSizeOptions`
- `canPrevious`
- `canNext`
- `loading`
- `onPrevious`
- `onNext`
- `onPageSizeChange`

The footer says `Showing 1-20` without an `of N` suffix. It uses Previous and Next controls only. The current sequential page number may be shown as orientation text, but it is derived from local cursor history and is not a direct navigation control.

Default page size is 20 with options 20, 50, and 100. Changing page size resets to the first page.

### `useCursorTable`

Add a focused hook for request coordination. It owns:

- current rows and next cursor
- current request cursor
- visited cursor stack
- sort key and direction
- page size
- settled, initial-loading, updating, and error states
- request cancellation and stale-response protection

The resource page owns filter controls and passes normalized filters into the hook. Any filter, sort, or page-size change clears cursor history and loads the first page.

Next pushes the current request cursor onto the stack and loads `nextCursor`. Previous pops the stack and loads that cursor. Navigation is disabled while a request is active to prevent duplicate transitions.

### Page Ownership

- `ProductsPage` owns `q`, category, and active-state filters.
- `TransactionsPage` owns `q`, payment method, and date-range filters.
- `StockPage` owns visible `q` and movement-type filters. Its existing `productId`, `dateFrom`, and `dateTo` API filters remain available for future drill-downs but do not add visible controls in this version.

Search input state updates immediately. The normalized server query remains debounced by 220ms. Select and date filters request immediately.

### Filter Controls

- Products keeps search in the compact header and adds inline Category and Status `SelectField` controls before Add product.
- Transactions keeps search visible and adds a compact Filters button. Its anchored popover contains Payment method, Date from, Date to, and Clear filters; the button shows an active-filter count.
- Stock keeps its current inline search and Movement type controls.

Add a reusable controlled `TableFilterPopover` for the Transactions filter set. It opens from its trigger, keeps keyboard focus within the popover while open, closes on Escape or outside press, and does not block the underlying page with a modal scrim. It uses existing `Input`, `SelectField`, `Button`, border, radius, and focus tokens.

## Product Cache Boundary

The paginated Products catalog must not replace `store.products`. POS search, barcode/cart behavior, stock validation, and product pickers currently depend on that shared cache.

`ProductsPage` therefore uses a page-local paginated query for catalog rows while retaining existing product mutations. After create, update, or deactivate:

1. Update or invalidate the shared POS product cache through the existing store mutation path.
2. Refetch the current catalog query.
3. If the current page becomes empty and a previous cursor exists, navigate to the previous page and refetch.

Client-side duplicate barcode validation can improve immediate feedback for cached products, but the backend uniqueness constraint remains authoritative because a paginated page can never prove global uniqueness.

Transactions and stock movement history are page-local query results. Dashboard analytics already uses a dedicated server summary, so it must not depend on a partially loaded transaction page.

## Loading And Interaction

The interaction follows the existing Balanja loading contract and Apple-style response principles:

- Show a full matching skeleton only before the first successful page load.
- Keep settled rows mounted during filter, sort, page-size, and pagination requests.
- Show the compact `Updating` indicator and soften table opacity during a background request.
- Keep search typing immediate; never wait for the network before displaying input text.
- Disable Previous and Next only while their request is active or when no destination exists.
- Abort superseded search/filter requests and ignore stale responses that finish out of order.
- Do not animate row position changes with springs; a short opacity transition is sufficient and respects reduced motion.

## Error Handling

- Initial-load failure shows the established error/empty-state surface with Retry.
- Background failure preserves the current rows, restores full opacity, and shows an error toast with Retry available from the table state.
- An invalid cursor resets the page to the first cursor once and reports the issue if that retry also fails.
- An empty page caused by a concurrent deletion or deactivation retreats to the previous visited cursor when available.
- A mutation does not silently move users from a later history page to the first page. It refetches their current query unless that page no longer exists.

## Store And API Client Changes

The API client list methods return complete page objects instead of dropping metadata:

```js
{
  items: [],
  nextCursor: "",
  hasNextPage: false
}
```

Query builders serialize only defined filters and always URL-encode values. Transaction and product query builders gain their endpoint filters, sorting, and cursor parameters. Stock query building extends the existing implementation with sorting.

Global store list state should not pretend to be a complete collection when it contains one server page. Page-local list queries own Transactions, Stock history, and Products catalog rows. Shared store state remains responsible for POS product/cache mutations, cart behavior, settings, checkout, and stock mutation results.

## Design-System Contract

Update `/design-system` with a controlled server-table example showing:

- first page
- middle page with Previous and Next available
- final page with Next disabled
- updating state that preserves rows
- active search/filter state
- the anchored transaction filter popover

Update `DESIGN.md` before or alongside feature implementation. Document that operational tables use cursor pagination, never display an unverified total, reset to the first cursor when their query changes, and preserve settled rows during refetches.

The pagination footer remains compact and border-separated from the table. Familiar chevron icons accompany Previous and Next labels. Controls retain stable dimensions, visible focus states, and reduced-motion behavior.

## Testing

Backend tests:

- Every endpoint applies supported filters within the authenticated tenant.
- Every allowlisted sort works in ascending and descending directions.
- Unsupported sort keys and directions are rejected.
- Cursor encode/decode validates version, sort metadata, value type, and ID.
- Duplicate sort values cross page boundaries without duplicate or missing rows.
- `limit + 1` correctly derives `hasNextPage`.
- Maximum page size is enforced.
- Search and filter changes cannot reuse an incompatible cursor.

Frontend tests:

- API clients serialize all filters, sort state, page size, and cursor correctly.
- API clients preserve pagination metadata.
- `useCursorTable` moves Next and Previous through cursor history.
- Filter, sort, and page-size changes reset cursor history.
- Superseded requests are aborted or ignored.
- Existing rows remain available during updating and after a background failure.
- `TablePagination` disables unavailable or loading navigation.
- Product catalog pagination never overwrites the shared POS product cache.

Verification commands:

- `go test ./...`
- `npm run test`
- `npm run build`

Visual verification covers Products, Transactions, Stock, and `/design-system` at desktop and mobile widths. Confirm stable footer dimensions, no text overflow, immediate search typing, correct disabled controls, and no content replacement during refetch.

## Rollout

1. Introduce and test the shared backend cursor/filter contract.
2. Upgrade Products, Transactions, and Stock repositories and handlers.
3. Preserve pagination metadata in the frontend API client.
4. Add `useCursorTable` and controlled `TablePagination`.
5. Migrate Products, Transactions, and Stock one page at a time.
6. Synchronize `/design-system` and `DESIGN.md`.
7. Run backend, frontend, build, and authenticated visual verification.

## Acceptance Criteria

- Products, Transactions, and Stock fetch no more than the selected server page size plus one detection row.
- Search, visible filters, and sortable columns operate across the complete tenant dataset.
- Previous and Next work without exact counts or direct page jumps.
- Newly inserted history rows do not cause duplicate or missing rows while paging.
- Table content remains responsive and stable during background requests.
- Catalog pagination does not corrupt POS product/cart state.
- The design-system page and `DESIGN.md` describe and demonstrate the final controlled pagination pattern.
- Backend tests, frontend tests, and production build pass.

## Resolved Decisions

- Cursor pagination is shared across Products, Transactions, and Stock.
- Navigation uses Previous and Next; direct page jumps are not required.
- Exact totals are not shown or computed.
- Default page size is 20 with 20, 50, and 100 options.
- Server-side filtering and sorting are part of the same query contract.
- Product catalog page results remain separate from the shared POS product cache.
