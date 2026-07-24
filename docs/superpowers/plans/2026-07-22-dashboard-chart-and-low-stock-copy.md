# Dashboard Chart and Low-Stock Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove persistent point markers from the dashboard revenue trend and retain category/unit context as each low-stock row's subtitle.

**Architecture:** Keep the dashboard composition unchanged. Configure the existing shared `Line` instance in `RevenueTrendPanel` to omit markers, retain the existing low-stock identity subtitle, and document the dashboard-specific pattern in the showcase and design rules.

**Tech Stack:** React 19, Tailwind CSS v4, Node built-in test runner, Vite.

---

## File structure

- Modify: `frontend/src/components/dashboard/DashboardCharts.jsx` — revenue line configuration.
- Modify: `frontend/src/components/dashboard/LowStockPanel.jsx` — low-stock identity subtitle.
- Modify: `frontend/src/pages/DashboardPage.test.js` — source-level regression assertions.
- Modify: `frontend/src/components/design/DashboardPatternsShowcase.jsx` — showcase guidance.
- Modify: `frontend/DESIGN.md` — dashboard visual rules.

### Task 1: Lock the dashboard patterns with tests

**Files:**
- Modify: `frontend/src/pages/DashboardPage.test.js`

- [ ] **Step 1: Write the failing test**

```js
const charts = await readFile(new URL("../components/dashboard/DashboardCharts.jsx", import.meta.url), "utf8");
assert.match(charts, /<Line dataKey="revenue"[^>]*showMarkers=\{false\}/);
assert.match(panel, /\{product\.category\} · \{product\.unit\}/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/pages/DashboardPage.test.js`

Expected: the marker assertion fails because the existing line has no explicit `false` value.

- [ ] **Step 3: Commit the failing test**

```bash
git add frontend/src/pages/DashboardPage.test.js
git commit -m "test: cover dashboard chart and stock labels"
```

### Task 2: Apply the marker-free line and stock subtitle

**Files:**
- Modify: `frontend/src/components/dashboard/DashboardCharts.jsx:56`
- Modify: `frontend/src/components/dashboard/LowStockPanel.jsx:28`

- [ ] **Step 1: Disable persistent revenue-line markers**

```jsx
<Line dataKey="revenue" stroke="var(--chart-line-primary)" strokeWidth={2.5} showMarkers={false} />
```

This preserves chart tooltips while removing persistent dots.

- [ ] **Step 2: Keep the per-product subtitle directly below the name**

```jsx
<div className="min-w-0">
  <p className="truncate text-sm font-semibold text-text">{product.name}</p>
  <p className="truncate text-xs text-text-muted">{product.category} · {product.unit}</p>
</div>
```

The adjacent `Sisa {Number(product.stock)}` badge remains the only stock-quantity signal.

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `node --test src/pages/DashboardPage.test.js`

Expected: PASS.

- [ ] **Step 4: Commit implementation**

```bash
git add frontend/src/components/dashboard/DashboardCharts.jsx frontend/src/components/dashboard/LowStockPanel.jsx
git commit -m "fix: simplify dashboard revenue and stock list"
```

### Task 3: Synchronize the design system

**Files:**
- Modify: `frontend/src/components/design/DashboardPatternsShowcase.jsx:34`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Update showcase guidance**

State that the dashboard revenue line is clean and dot-free, hover tooltips keep individual values inspectable, and low-stock rows use `kategori · satuan` beneath the product name.

- [ ] **Step 2: Update design rules**

Replace the dashboard rule that calls for visible markers with a marker-free dashboard revenue trend rule retaining hover/touch tooltip inspection. Add that low-stock rows use category and unit as a muted subtitle beneath the product name while the stock badge remains the quantity signal.

- [ ] **Step 3: Run full frontend tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Build the frontend**

Run: `npm run build`

Expected: Vite build completes successfully.

- [ ] **Step 5: Commit documentation synchronization**

```bash
git add frontend/src/components/design/DashboardPatternsShowcase.jsx frontend/DESIGN.md
git commit -m "docs: align dashboard chart and stock patterns"
```
