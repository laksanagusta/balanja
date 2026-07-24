# Category and Unit Master Data Design

## Summary

Balanja will replace free-text product categories and units with tenant-scoped master data. Users in a store can create, rename, archive, restore, and select categories and units. Archived values remain attached to existing products but are unavailable for new product assignments; historical transactions retain their original text snapshots independently of master data.

The first release covers only categories and units. It deliberately avoids a generic master-data framework, conversion rules, custom ordering, search, pagination, bulk actions, and role-based administration.

## Goals

- Let every authenticated user in a store manage that store's categories and units.
- Make product category and unit values consistent across Products, Stock, Cashier, Dashboard, Reports, and transaction workflows.
- Propagate category or unit renames to every product display without rewriting historical transaction snapshots.
- Let users archive obsolete values without breaking existing products.
- Provide editable default values for stores that do not yet have master data.
- Allow users to create a missing category or unit without leaving the product editor.

## Non-goals

- A generic, user-defined master-data type system.
- Unit names and symbols as separate fields.
- Unit conversions such as cartons to pieces.
- Manual or drag-and-drop ordering.
- Per-role permissions or an owner/admin role.
- Master-data search, pagination, bulk editing, or hard deletion.
- Rewriting category or unit snapshots in completed transactions.

## Existing Behavior

Products currently store `category` and `unit` as required text columns. Categories are also hard-coded in `frontend/src/pos/domain.js`, while units are entered through a free-text input. Product listing filters use category names. These independent sources allow inconsistent spelling and prevent a store from maintaining its own finite choices.

Settings is already the tenant-scoped entry point for store configuration, so category and unit management will live there rather than becoming a daily operational navigation item.

## Data Model

Create separate `categories` and `units` tables. Both tables have:

- `id uuid primary key`
- `org_id text not null`
- `name text not null`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Names are trimmed and unique per organization, case-insensitively, across active and archived records. An archived record therefore reserves its name. A request that tries to create the same name returns a distinct archived-name conflict so the client can offer restoration instead of creating a duplicate.

Both tables use forced row-level security and tenant policies equivalent to the existing product and settings policies.

Products gain required `category_id` and `unit_id` references. Database constraints must ensure the referenced row belongs to the same organization as the product. This can be enforced with tenant-aware composite foreign keys backed by unique `(org_id, id)` keys. A product may continue referencing an archived category or unit.

Product API responses include:

- `categoryId` and `unitId` as the stable source of identity.
- `category` and `unit` as joined display-name projections for compatibility and fallback rendering.

Product create and update requests accept `categoryId` and `unitId`; they no longer accept category or unit names as the source of truth.

## Migration Strategy

The forward migration runs atomically and follows this order:

1. Create the category and unit tables, indexes, update triggers, RLS policies, and grants.
2. For every organization represented in products, insert one category and unit record for each trimmed, case-insensitively unique current value.
3. Add nullable `category_id` and `unit_id` columns to products.
4. Backfill each product by matching its organization and normalized current text value.
5. Validate that every product has both references.
6. Add tenant-aware foreign keys and make both references non-null.
7. Update product indexes and queries to use the new identities.
8. Remove the old product text columns after the validation and constraints succeed.

If legacy values differ only by capitalization or surrounding whitespace, migration keeps one canonical display name per normalized value and connects all matching products to it. The canonical value is the trimmed form from the earliest product by creation time and ID, making the result deterministic.

Completed transaction item JSON remains untouched. It is a historical snapshot and must continue displaying the values captured at checkout time.

## Default Data

When a store requests categories or units and has no records of that type, the backend seeds the defaults inside the tenant transaction using conflict-safe inserts.

Default categories:

- `Sembako`
- `Minuman`
- `Snack`
- `Perawatan`
- `Rumah Tangga`

Default units:

- `pcs`
- `pack`
- `botol`
- `kg`
- `karung`
- `renteng`
- `karton`

Initialization is independent per type. A store with categories but no units receives only unit defaults. Once a type has any records, including archived records, the backend does not insert missing defaults. Default records behave exactly like user-created records and may be renamed or archived.

## Backend Boundaries

Use two explicit feature modules, `category` and `unit`, following the existing handler/service/repository structure. Each module owns validation, persistence, and HTTP mapping for one entity. They may share small internal helpers only when doing so removes mechanical duplication without merging their domain contracts.

Each service supports:

- List active records, optionally including archived records for Settings.
- Create a record.
- Rename a record.
- Archive a record idempotently.
- Restore a record idempotently.

The product service validates that submitted category and unit IDs exist, are active, and belong to the current organization. Existing products whose references later become archived remain valid. An update may preserve an already assigned archived reference, but may not newly assign a different archived reference.

Repository product lists join category and unit names. Product list filtering changes from a category-name filter to `categoryId`, eliminating ambiguity after renames.

## HTTP API

Category endpoints:

- `GET /api/v1/categories`
- `GET /api/v1/categories?includeArchived=true`
- `POST /api/v1/categories`
- `PUT /api/v1/categories/:id`
- `POST /api/v1/categories/:id/archive`
- `POST /api/v1/categories/:id/restore`

Unit endpoints mirror these paths under `/api/v1/units`.

Create accepts `{ "name": "..." }`. Rename accepts the same shape. List results are alphabetized case-insensitively by name, with ID as the deterministic tie-breaker.

Product list requests use `categoryId`. Product create and update payloads use `categoryId` and `unitId`.

### Error Contract

- Empty or otherwise invalid name: `422 INVALID_CATEGORY` or `422 INVALID_UNIT`.
- Duplicate active name: `409 CATEGORY_NAME_CONFLICT` or `409 UNIT_NAME_CONFLICT`.
- Matching archived name: `409 CATEGORY_ARCHIVED_NAME_CONFLICT` or `409 UNIT_ARCHIVED_NAME_CONFLICT`, including the archived record ID in structured error details.
- Missing record or cross-tenant ID: `404 CATEGORY_NOT_FOUND` or `404 UNIT_NOT_FOUND`.
- Invalid product reference: `422 INVALID_PRODUCT_REFERENCE`, with field-level details identifying `categoryId` or `unitId`.

Cross-tenant lookups intentionally return not found rather than revealing that a record exists in another store.

## Frontend State and Data Flow

The shared POS store owns tenant-wide category and unit collections, loading flags, settled-state flags, and mutation functions. Product catalog cursor pages remain page-local as they are today.

Products retain `categoryId`, `unitId`, and response-name fallbacks. Visible names are resolved from the latest master collection by ID first and from the response projection second. This makes a rename visible immediately across shared product data and page-local catalog rows without rewriting every product row.

Filters and selections hold IDs:

- The Products category filter submits `categoryId`.
- Cashier category tabs hold category IDs while displaying their current names.
- Product forms submit `categoryId` and `unitId`.

After a category or unit mutation, the store updates the relevant master collection from the successful server response. It does not replace settled pages with skeletons. Master-data loads follow the established initial-skeleton versus compact-updating behavior in `frontend/DESIGN.md`.

## Settings Experience

The Settings page contains three tabs:

- `Profil toko`
- `Kategori`
- `Satuan`

The selected tab is represented by `/settings?tab=profile`, `/settings?tab=categories`, or `/settings?tab=units`. Missing or invalid tab values resolve to `profile`.

The profile tab contains the existing store form and current-store summary. Category and unit tabs share a production component pattern while retaining entity-specific accessible labels and copy.

Each master-data tab contains:

- A compact labeled input and add action.
- An alphabetized active list.
- Rename and archive actions per active row.
- A collapsed archived section with restore actions.
- Inline validation and mutation feedback.

Archive confirmation states that existing products retain the value, while it becomes unavailable for new assignments. There is no hard-delete action.

The layout uses existing tokens, controls, panel hierarchy, loading language, and responsive behavior. The design-system page and `frontend/DESIGN.md` must document the new settings-tab, master-list, and finite-select inline-create patterns before or alongside production UI changes.

## Product Editor Experience

Category and Unit both use the controlled `SelectField` pattern. Only active records appear as ordinary choices.

Each selector includes an entity-specific inline create action at the bottom of its anchored searchable popover. Activating it replaces the option list with a compact input and quiet text actions. A successful create updates the master collection, selects the new record, and closes only the selector popover without closing the product dialog or discarding other draft fields. An exact archived-name match offers restore in the same inline flow.

If create returns an archived-name conflict, the form offers to restore the identified record. Successful restoration selects it automatically.

When editing a product assigned to an archived record:

- Its current value remains visible and is marked `Diarsipkan`.
- Saving without changing that field is allowed.
- If the user changes the selection, only active values can be selected.
- Once replaced, the archived value does not remain among ordinary choices.

Inline create and restore failures preserve both the product draft and the typed master-data name. Errors appear beside the affected control, with an error toast allowed only as supplemental feedback.

## Cashier and Other Consumers

Cashier category tabs contain `Semua` first, followed by active categories alphabetically. Archived categories do not receive filter tabs. Products assigned to archived categories remain sellable, searchable by product name or barcode, and visible under `Semua`.

Stock, Dashboard, Reports, and other product consumers display current category and unit names through the master collection or joined response projection. Completed transactions and reports derived from transaction snapshots keep historical category and unit strings.

## Mutation and Concurrency Behavior

- Create, rename, archive, and restore disable only the action currently in flight.
- Archive and restore are idempotent.
- Conflict-safe database constraints remain authoritative under concurrent requests.
- Default seeding uses upsert semantics and is safe when multiple first-load requests run concurrently.
- Settled lists remain visible at full contrast during refetch or mutation; background activity is announced through the shared visually hidden polite status rather than a visible badge.
- A failed inline mutation never closes its parent product dialog.

## Testing Strategy

### Backend

- Migration tests cover deterministic backfill, trimming, case-insensitive deduplication, required references, and preservation of product and transaction data.
- Migration contract tests cover the tables, indexes, constraints, policies, and grants.
- RLS and integration tests prove that records and product references cannot cross organizations.
- Category and unit service tests cover initialization, list ordering, create, rename, archive, restore, idempotency, case-insensitive conflicts, and archived-name conflicts.
- Product service and repository tests cover required IDs, active-reference validation, preservation of an assigned archived reference, rejection of a newly assigned archived reference, joins, and category-ID filtering.
- Handler tests cover successful response shapes and every documented status/code combination.
- Checkout regression tests prove transaction snapshots remain correct.

### Frontend

- API client and store tests cover list, create, rename, archive, restore, settled-state retention, and error mapping.
- Settings tests cover query-backed tabs, default tab fallback, active and archived sections, confirmations, loading states, and inline errors.
- Product dialog tests cover active options, inline creation, automatic selection, archived-name restoration, and preservation of drafts on failure.
- Regression tests cover editing a product with archived category or unit references.
- Cashier tests cover `Semua`, alphabetical active tabs, ID-based filtering, searchable products with archived categories, and unchanged checkout behavior.
- Product, Stock, Dashboard, Report, and transaction suites verify current-name rendering and historical snapshot behavior.
- Desktop and compact layouts are visually checked for overflow, focus order, accessible naming, and touch targets.

## Acceptance Criteria

- Every authenticated user can manage categories and units only within their current store.
- Store-specific defaults appear when a master-data type is first initialized and empty.
- Category and unit names are unique per store without regard to capitalization.
- Rename results appear consistently anywhere current product data is displayed.
- Archive removes a value from new assignments without breaking existing products or completed transactions.
- Restore makes a value selectable again.
- Product category and unit fields no longer accept arbitrary free text.
- Missing values can be created and selected inside the product editor.
- Active lists and Cashier category tabs use alphabetical ordering.
- Existing product, stock, checkout, dashboard, report, and transaction behavior continues to pass its regression suites.
- The production pages, design-system page, and `frontend/DESIGN.md` remain synchronized.
