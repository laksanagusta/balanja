# Settings Master-Data Refetch Loop Fix Design

## Problem

The Settings data-loading effect depends on the complete POS store object. The provider creates a new store value whenever loading state changes. Entering a master-data tab starts a forced request, that request changes loading state, the store identity changes, and the effect immediately aborts and restarts the request. This creates a continuous refetch loop, keeps the `Updating` badge visible, and can prevent the category or unit `Tambah` request from completing reliably.

The regression was introduced when category and unit loading was added to `SettingsPage`; existing Dashboard, Products, and Cashier effects already depend on stable loader callbacks instead of the full store object.

## Fix

`SettingsPage` will destructure `loadSettings`, `loadCategories`, and `loadUnits` from the store. Its data-loading effect will depend only on the active `tab` and those stable callbacks.

The effect retains its current behavior:

- `profile` force-loads settings and manages the initial page-loading state.
- `categories` force-loads categories including archived records.
- `units` force-loads units including archived records.
- Changing tabs aborts the previous tab request.
- Local input changes and store loading-state updates do not restart the effect.

No changes are required to `MasterDataManager`, the API client, backend handlers, or database schema. The existing mutation pending state remains responsible for preventing duplicate `Tambah` submissions.

## Error Behavior

If `Tambah` fails after the refetch loop is removed, the existing inline error from `MasterDataManager` remains visible and preserves the typed name. A successful request clears the draft and merges the returned category or unit into the store collection.

## Testing

- Extend the Settings source-contract test to reject an effect dependency on `[store, tab]`.
- Require stable loader callback dependencies in the Settings effect.
- Run the focused Settings and master-data tests.
- Run all frontend tests and the production build.
- Verify in an authenticated browser that typing does not display `Updating` and that `Tambah` creates a category and a unit.
