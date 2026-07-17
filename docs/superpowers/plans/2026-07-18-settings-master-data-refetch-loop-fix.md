# Settings Master-Data Refetch Loop Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Settings master-data loads from restarting on every store update so category and unit creation requests can complete normally.

**Architecture:** Keep the existing tab-aware loading effect, but replace its dependency on the complete POS store value with the three memoized loader callbacks. This matches the established loading pattern in Dashboard, Products, and Cashier without changing mutation or backend behavior.

**Tech Stack:** React 19, Node test runner, Vite

---

## File Structure

- Modify `frontend/src/pages/SettingsPage.test.js`: add a regression contract for stable loader dependencies.
- Modify `frontend/src/pages/SettingsPage.jsx`: destructure stable loader callbacks and use them in the effect.

### Task 1: Stop the Settings refetch loop

**Files:**
- Modify: `frontend/src/pages/SettingsPage.test.js`
- Modify: `frontend/src/pages/SettingsPage.jsx`

- [ ] **Step 1: Write the failing regression assertions**

Add these assertions to the existing Settings test:

```js
assert.match(source, /const \{ loadCategories, loadSettings, loadUnits \} = store;/);
assert.match(source, /\[loadCategories, loadSettings, loadUnits, tab\]/);
assert.doesNotMatch(source, /\[store, tab\]/);
```

- [ ] **Step 2: Run the focused test and verify it fails on the unstable store dependency**

Run: `cd frontend && node --test src/pages/SettingsPage.test.js`

Expected: FAIL because `SettingsPage` still depends on `[store, tab]` and does not destructure the stable loader callbacks.

- [ ] **Step 3: Replace the unstable dependency with loader callbacks**

Immediately after `const store = usePOSStore();`, add:

```jsx
const { loadCategories, loadSettings, loadUnits } = store;
```

Inside the loading effect, replace the three calls:

```jsx
loadSettings({ force: true, signal: controller.signal }).finally(() => {
  if (!controller.signal.aborted) setIsPageLoading(false);
});

loadCategories({ includeArchived: true, force: true, signal: controller.signal });

loadUnits({ includeArchived: true, force: true, signal: controller.signal });
```

Replace the dependency list with:

```jsx
[loadCategories, loadSettings, loadUnits, tab]
```

Do not change `MasterDataManager`, the API client, or backend code.

- [ ] **Step 4: Run focused Settings and master-data tests**

Run: `cd frontend && node --test src/pages/SettingsPage.test.js src/components/settings/MasterDataManager.test.js src/pos/api-client.test.js`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit the fix**

```bash
git add frontend/src/pages/SettingsPage.jsx frontend/src/pages/SettingsPage.test.js
git commit -m "fix: stop settings master data refetch loop"
```

### Task 2: Verify the regression fix

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run all frontend tests**

Run: `cd frontend && npm test`

Expected: all tests PASS.

- [ ] **Step 2: Build the production frontend**

Run: `cd frontend && npm run build`

Expected: Vite exits successfully. Existing third-party `use client`, chart sourcemap, and chunk-size warnings are acceptable; new errors are not.

- [ ] **Step 3: Verify the authenticated interaction**

Open `/settings?tab=categories`, type a unique category name, and confirm the `Updating` badge does not appear because of typing. Select `Tambah` once and confirm the new category appears and the draft clears. Repeat at `/settings?tab=units` with a unique unit name.

- [ ] **Step 4: Check the final diff and working tree**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no unintended files.
