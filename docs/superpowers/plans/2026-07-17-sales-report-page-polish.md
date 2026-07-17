# Sales Report Page Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all data-integrity, accessibility, visual-semantic, touch, and composition issues identified in the Sales Report page review.

**Architecture:** Treat a successful report response and its resolved filters as one snapshot. Keep draft/request state in the page controller while toolbar and report components receive explicit state and actions. Improve the shared `SelectField` at its primitive boundary, and compose report sections explicitly without boolean display modes.

**Tech Stack:** React 19, JavaScript ES modules, Node test runner, Tailwind CSS, Visx-based charts, Vite.

---

### Task 1: Record the Design System contract

**Files:**
- Modify: `frontend/DESIGN.md`
- Modify: `frontend/src/components/design/ReportPatternsShowcase.jsx`
- Test: `frontend/src/components/design/ReportPatternsShowcase.test.js`

- [ ] **Step 1: Add failing Design System assertions**

Assert that the showcase composes `VoidReportPanel` explicitly and that the production report pattern includes localized tooltip semantics. Run:

```bash
node --test src/components/design/ReportPatternsShowcase.test.js
```

Expected: FAIL before the explicit void composition is added.

- [ ] **Step 2: Update `frontend/DESIGN.md` before production UI**

Add the approved report contract:

```markdown
The visible report and every export or transaction handoff share the same last-successful filter snapshot. Draft filters are announced and ambiguous actions remain unavailable until the report resolves successfully.

Report presets use neutral segmented selection with 44px compact-screen targets. Background updates retain full data contrast. The previous-period trend is dashed consistently, and tooltips use Indonesian labels, dates, and Rupiah values.

Void reporting is composed explicitly beside breakdown panels; report components do not use boolean display modes.
```

- [ ] **Step 3: Compose the showcase explicitly**

Import and render `VoidReportPanel` before `ReportBreakdownPanels`, removing the redundant `voids` prop from the latter.

- [ ] **Step 4: Run the focused Design System test and commit only owned hunks**

Run the focused test and `git diff --check`. Stage only the Sales Report paragraph in dirty `frontend/DESIGN.md`, plus the showcase and test. Commit:

```bash
git commit -m "docs: refine sales report interaction patterns"
```

### Task 2: Make report actions use the resolved snapshot

**Files:**
- Modify: `frontend/src/reports/report-utils.js`
- Modify: `frontend/src/reports/report-utils.test.js`
- Modify: `frontend/src/pages/SalesReportPage.jsx`
- Modify: `frontend/src/pages/SalesReportPage.test.js`
- Modify: `frontend/src/components/reports/SalesReportToolbar.jsx`
- Modify: `frontend/src/components/reports/ReportComponents.test.js`

- [ ] **Step 1: Write failing data-integrity and toolbar assertions**

Add a pure filter comparison test:

```js
assert.equal(sameReportFilters(resolved, { ...resolved, preset: "custom" }), true);
assert.equal(sameReportFilters(resolved, { ...resolved, paymentMethod: "cash" }), false);
```

Assert source behavior for `{ data, filters }` snapshots, resolved-filter export/handoff, persistent refresh warning, form submission, dirty status, neutral presets, compact targets, and non-dimmed report content.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test src/reports/report-utils.test.js src/pages/SalesReportPage.test.js src/components/reports/ReportComponents.test.js
```

Expected: FAIL because snapshot ownership and toolbar form states do not exist.

- [ ] **Step 3: Implement filter equality and report snapshots**

Add `sameReportFilters` comparing only `dateFrom`, `dateTo`, `paymentMethod`, and `cashierUserId`. Replace the standalone report state with:

```js
const [reportSnapshot, setReportSnapshot] = React.useState(null);
```

On success store `{ data: value, filters: { ...appliedFilters } }`. Derive `report`, `resolvedFilters`, and `hasUnappliedChanges`. Use resolved filters for export and handoff. Keep a persistent `refreshError` after failed background requests.

- [ ] **Step 4: Convert the toolbar to an explicit form**

Use `<form onSubmit={...}>`, a submit Apply button, neutral compact-visual preset buttons, dirty/update status, a persistent refresh alert, and disabled export/handoff while no resolved snapshot matches the draft.

- [ ] **Step 5: Verify GREEN and commit**

Run focused tests, stage the six files, and commit:

```bash
git commit -m "fix: bind report actions to resolved filters"
```

### Task 3: Make SelectField keyboard-safe

**Files:**
- Create: `frontend/src/components/select-field-navigation.js`
- Create: `frontend/src/components/select-field-navigation.test.js`
- Modify: `frontend/src/components/primitives.jsx`
- Test: `frontend/src/components/reports/ReportComponents.test.js`

- [ ] **Step 1: Write failing navigation tests**

Define the desired helper behavior for ArrowDown, ArrowUp, Home, and End with wrapping and empty-list safety. Add source assertions for `aria-haspopup="listbox"`, `aria-controls`, `role="listbox"`, `role="option"`, `aria-selected`, conditional mounting, Escape, and outside pointer handling.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test src/components/select-field-navigation.test.js src/components/reports/ReportComponents.test.js
```

Expected: FAIL because the navigation module and listbox behavior do not exist.

- [ ] **Step 3: Implement the pure navigation helper**

Export `nextSelectIndex(current, length, key)` and return wrapped indices for Arrow keys, first/last for Home/End, and `-1` for empty collections.

- [ ] **Step 4: Upgrade SelectField**

Add stable trigger/label/listbox ids, container/trigger/option refs, conditional option mounting, keyboard navigation, selection, Escape focus restoration, and outside pointer dismissal. Use `h-11 md:h-9` for Input and Select triggers so compact screens receive 44px controls.

- [ ] **Step 5: Verify GREEN and stage only owned primitive hunks**

Run focused tests. Use partial staging for `primitives.jsx` so pre-existing Button/Input/DataTable changes remain unstaged. Commit:

```bash
git commit -m "fix: make report selects keyboard accessible"
```

### Task 4: Align chart semantics and component composition

**Files:**
- Modify: `frontend/src/components/reports/SalesTrendPanel.jsx`
- Modify: `frontend/src/components/reports/ReportBreakdownPanels.jsx`
- Modify: `frontend/src/components/reports/ReportComponents.test.js`
- Modify: `frontend/src/pages/SalesReportPage.jsx`

- [ ] **Step 1: Write failing chart and composition assertions**

Assert `dashFromIndex={0}`, Indonesian tooltip labels, Rupiah formatting, and the absence of `showVoids` and a `voids` prop on `ReportBreakdownPanels`.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test src/components/reports/ReportComponents.test.js src/pages/SalesReportPage.test.js
```

- [ ] **Step 3: Implement localized tooltip content and dashed comparison**

Render custom tooltip rows labelled `Periode ini` and `Periode sebelumnya`, formatted with `formatPrice`, with an Indonesian date title. Pass `dashFromIndex={0}` to the comparison line.

- [ ] **Step 4: Remove the boolean display mode**

Remove `voids` and `showVoids` from `ReportBreakdownPanels`; keep `VoidReportPanel` explicitly composed in the page and showcase.

- [ ] **Step 5: Verify GREEN and commit**

Run focused tests, stage the four files, and commit:

```bash
git commit -m "fix: align sales report chart semantics"
```

### Task 5: Verify the complete frontend

**Files:**
- No further production changes expected.

- [ ] **Step 1: Run all frontend tests**

Run: `npm run test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: Vite exits 0; existing chart sourcemap, `use client`, and large-chunk warnings may remain.

- [ ] **Step 3: Check Git hygiene**

Run `git diff --check`, `git diff --cached --check`, and `git status --short --branch`. Confirm no fix-owned staged changes remain and unrelated working-tree changes are preserved.
