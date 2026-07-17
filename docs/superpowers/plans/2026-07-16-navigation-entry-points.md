# Navigation and Entry Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Dashboard the stable authenticated home, localize and group operational navigation, move cart scanning into Kasir, add a direct dashboard-to-stock action, and replace the mobile push-down menu with an accessible overlay.

**Architecture:** Keep route constants and navigation definitions in `shared.jsx`, with primary groups separated from system navigation. `AppShell` owns only navigation/account concerns; `RetailPosPage` owns the scanner that mutates its visible cart. Dashboard passes an explicit callback into `LowStockPanel`, while design documentation and a showcase component define the same information architecture before production changes.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, Node test runner, Clerk, Sonner.

---

## File Structure

- Create `frontend/src/components/design/NavigationPatternsShowcase.jsx` to document the approved menu hierarchy and entry-point mapping.
- Modify `frontend/DESIGN.md` and `frontend/src/pages/DesignSystemPage.jsx` before production UI changes.
- Modify `frontend/src/shared.jsx` to define localized primary groups and system navigation.
- Modify `frontend/src/routing.js` and `frontend/src/routing.test.js` to align unknown authenticated paths with Dashboard.
- Modify `frontend/src/components/AppShell.jsx` and `frontend/src/components/AppShell.test.js` to render grouped desktop navigation and the accessible mobile overlay without a global scanner.
- Modify `frontend/src/pages/RetailPosPage.jsx` and `frontend/src/pages/RetailPosPage.test.js` to own cart scanning.
- Modify `frontend/src/pages/DashboardPage.jsx`, `frontend/src/components/dashboard/LowStockPanel.jsx`, and `frontend/src/pages/DashboardPage.test.js` to add the direct stock action.
- Modify `frontend/src/landing/PosProductMockup.jsx` to mirror production labels and grouping.

### Task 1: Synchronize the Design System

**Files:**
- Modify: `frontend/DESIGN.md`
- Create: `frontend/src/components/design/NavigationPatternsShowcase.jsx`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`

- [ ] **Step 1: Document the approved navigation contract**

Add a `Navigation and entry points` subsection to `DESIGN.md` specifying Dashboard as home, localized visible groups, neutral active styling, scanner locality, mobile overlay semantics, and the dashboard stock action.

- [ ] **Step 2: Add the navigation showcase**

Create `NavigationPatternsShowcase.jsx` exporting a panel that renders `Ringkasan`, `Operasional`, `Catatan`, and `Sistem` examples plus concise scanner and dashboard handoff notes.

- [ ] **Step 3: Register the showcase**

Import `NavigationPatternsShowcase` in `DesignSystemPage.jsx` and render it before the production POS patterns.

- [ ] **Step 4: Check the documentation diff**

Run: `git diff --check -- frontend/DESIGN.md frontend/src/components/design/NavigationPatternsShowcase.jsx frontend/src/pages/DesignSystemPage.jsx`

Expected: exit code 0 with no output.

### Task 2: Align Route Fallbacks and Navigation Data

**Files:**
- Modify: `frontend/src/routing.test.js`
- Modify: `frontend/src/routing.js`
- Modify: `frontend/src/shared.jsx`

- [ ] **Step 1: Write the failing route test**

Change the authenticated unknown-path assertion to:

```js
assert.equal(normalizePath("/missing", true), "/dashboard");
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd frontend && node --test src/routing.test.js`

Expected: one failure showing actual `/pos` and expected `/dashboard`.

- [ ] **Step 3: Implement the Dashboard fallback and localized navigation model**

Return `/dashboard` for authenticated unknown paths. Define:

```js
export const navGroups = [
  { label: "Ringkasan", items: [["Dashboard", "grid", routes.dashboard]] },
  { label: "Operasional", items: [["Kasir", "receipt", routes.pos], ["Produk", "box", routes.products], ["Stok", "package", routes.stock]] },
  { label: "Catatan", items: [["Transaksi", "file", routes.transactions]] },
];

export const systemNavItems = [["Pengaturan", "settings", routes.settings]];
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `cd frontend && node --test src/routing.test.js`

Expected: all routing tests pass.

### Task 3: Correct the App Shell and Mobile Menu

**Files:**
- Modify: `frontend/src/components/AppShell.test.js`
- Modify: `frontend/src/components/AppShell.jsx`

- [ ] **Step 1: Write failing shell contract tests**

Add source assertions that the brand uses `routes.dashboard`, visible group labels are rendered, system navigation is separate, `BarcodeScanner` and `addToCart` are absent, and the mobile trigger contains `aria-label`, `aria-expanded`, and `aria-controls`. Assert the mobile sheet contains a dialog label, scrim close control, and neutral active classes rather than `variant={pathname === path ? "primary"`.

- [ ] **Step 2: Run the shell test and verify RED**

Run: `cd frontend && node --test src/components/AppShell.test.js`

Expected: new navigation and scanner-locality assertions fail.

- [ ] **Step 3: Remove global scanner ownership**

Remove `BarcodeScanner`, scanner state, product loading, and cart mutation from `AppShell`. Retain notice-to-toast handling.

- [ ] **Step 4: Render desktop groups and stable home**

Make both brand controls call `go(routes.dashboard)`. Render each primary group with its visible label, neutral active button, and `aria-current="page"` on the selected item. Render `systemNavItems` above the account control.

- [ ] **Step 5: Implement the mobile overlay**

Give the trigger `aria-label="Buka menu navigasi"`, `aria-expanded`, and `aria-controls="mobile-navigation"`. Render a fixed scrim and left/top anchored sheet with `role="dialog"`, `aria-modal="true"`, and `aria-label="Navigasi aplikasi"`. Reuse the grouped renderer and close on scrim, route selection, or Escape. Use transform/opacity transitions and `motion-reduce:transform-none`.

- [ ] **Step 6: Run the shell test and verify GREEN**

Run: `cd frontend && node --test src/components/AppShell.test.js`

Expected: all shell tests pass.

### Task 4: Move Cart Scanning Into Kasir

**Files:**
- Modify: `frontend/src/pages/RetailPosPage.test.js`
- Modify: `frontend/src/pages/RetailPosPage.jsx`

- [ ] **Step 1: Write the failing POS scanner test**

Assert `RetailPosPage.jsx` imports and renders `BarcodeScanner`, includes `Pindai barcode`, loads products while the scanner is open, calls `store.addToCart(code)`, reports success and failure through toasts, and does not close after detection.

- [ ] **Step 2: Run the POS test and verify RED**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js`

Expected: scanner ownership assertions fail.

- [ ] **Step 3: Implement local scanner state and lifecycle**

Add `scannerOpen`, load products with an abort controller when opened, and place a secondary `Pindai barcode` button in the Point of Sale header.

- [ ] **Step 4: Render the persistent scanner**

Render `BarcodeScanner` at page root. On detection, call `store.addToCart(code)` and report the result through Sonner without closing the scanner.

- [ ] **Step 5: Run the POS test and verify GREEN**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js`

Expected: all Retail POS tests pass.

### Task 5: Add the Dashboard-to-Stock Entry Point

**Files:**
- Modify: `frontend/src/pages/DashboardPage.test.js`
- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/src/components/dashboard/LowStockPanel.jsx`

- [ ] **Step 1: Write the failing dashboard test**

Assert `DashboardPage` accepts `onNavigate`, imports `routes`, passes `onManageStock={() => onNavigate(routes.stock)}`, and `LowStockPanel` renders a `Kelola stok` button when products exist.

- [ ] **Step 2: Run the dashboard test and verify RED**

Run: `cd frontend && node --test src/pages/DashboardPage.test.js`

Expected: action wiring assertions fail.

- [ ] **Step 3: Implement the explicit handoff**

Accept `onNavigate` in `DashboardPage`, pass the stock callback, accept `onManageStock` in `LowStockPanel`, import `Button`, and render a small secondary `Kelola stok` button beside the panel heading only when low-stock products exist.

- [ ] **Step 4: Run the dashboard test and verify GREEN**

Run: `cd frontend && node --test src/pages/DashboardPage.test.js`

Expected: all Dashboard tests pass.

### Task 6: Synchronize the Public Mockup and Verify

**Files:**
- Modify: `frontend/src/landing/PosProductMockup.jsx`
- Test: all frontend test files

- [ ] **Step 1: Match the production hierarchy**

Replace the flat mockup item list with labeled groups matching `Ringkasan`, `Operasional`, `Catatan`, and `Sistem`; keep `Kasir` selected.

- [ ] **Step 2: Run targeted tests**

Run: `cd frontend && node --test src/routing.test.js src/components/AppShell.test.js src/pages/RetailPosPage.test.js src/pages/DashboardPage.test.js`

Expected: all targeted tests pass.

- [ ] **Step 3: Run the full frontend test suite**

Run: `cd frontend && npm run test`

Expected: exit code 0 with no failed tests.

- [ ] **Step 4: Run lint if configured**

Run: `cd frontend && npm run lint`

Expected: exit code 0. If the script is not configured, report that fact and rely on build/tests.

- [ ] **Step 5: Build production assets**

Run: `cd frontend && npm run build`

Expected: Vite exits successfully and writes the production bundle.

- [ ] **Step 6: Check patch hygiene**

Run: `git diff --check`

Expected: exit code 0 with no output.
