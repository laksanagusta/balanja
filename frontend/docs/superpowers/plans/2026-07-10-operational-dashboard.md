# Balanja Operational Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive operational POS dashboard using live Balanja store data and BKLIT UI line, pie, and bar chart registry components.

**Architecture:** Keep analytics in a pure `dashboard/analytics.js` module, presentation primitives in `components/dashboard`, and page composition in `pages/DashboardPage.jsx`. The existing POS store remains the source of truth; the design-system page renders the same dashboard components with static fixtures.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, BKLIT UI registry charts, Visx, Node test runner

---

## File Map

- Create `components.json`: configure the BKLIT/shadcn registry for JavaScript JSX output.
- Modify `vite.config.js`: add the `@` alias expected by registry components.
- Create `src/components/ui/line-chart.jsx`, `src/components/ui/pie-chart.jsx`, `src/components/ui/bar-chart.jsx`: generated BKLIT chart primitives.
- Create `src/dashboard/analytics.js`: pure date-window and aggregation functions.
- Create `src/dashboard/analytics.test.js`: analytics behavior and edge-case tests.
- Create `src/components/dashboard/DashboardKpiCard.jsx`: shared metric card.
- Create `src/components/dashboard/DashboardCharts.jsx`: revenue, payment, and product chart panels.
- Create `src/components/dashboard/LowStockPanel.jsx`: actionable inventory warning list.
- Create `src/pages/DashboardPage.jsx`: responsive dashboard composition and period state.
- Create `src/components/design/DashboardPatternsShowcase.jsx`: design-system examples using the production dashboard components.
- Modify `src/shared.jsx`: register `/dashboard` and sidebar navigation.
- Modify `src/App.jsx`: render the new dashboard route.
- Modify `src/pages/DesignSystemPage.jsx`: include dashboard patterns.
- Modify `src/index.css`: add semantic chart tokens and registry-compatible chart styles.
- Modify `src/data.js`: expose chart tokens in the token showcase.
- Modify `DESIGN.md`: document dashboard and chart rules.

### Task 1: Install BKLIT UI Chart Primitives

**Files:**
- Create: `components.json`
- Modify: `vite.config.js`
- Create via registry: `src/components/ui/line-chart.jsx`
- Create via registry: `src/components/ui/pie-chart.jsx`
- Create via registry: `src/components/ui/bar-chart.jsx`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add JavaScript registry configuration**

Create `components.json` with JSX output, Tailwind CSS input, and the BKLIT registry:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": false,
  "tailwind": { "config": "", "css": "src/index.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {
    "@bklit": "https://bklit-ui.com/r/{name}.json"
  }
}
```

- [ ] **Step 2: Configure the Vite alias**

Update `vite.config.js` to import `fileURLToPath`/`URL` from `node:url` and add:

```js
resolve: {
  alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
},
```

- [ ] **Step 3: Install the exact requested charts**

Run:

```bash
npx shadcn@latest add @bklit/line-chart @bklit/pie-chart @bklit/bar-chart --yes
```

Expected: registry files appear under `src/components/ui/`; required Visx/motion dependencies are added. If the registry emits `.tsx`, set `tsx: false` again and rerun after removing only the just-generated chart files.

- [ ] **Step 4: Verify registry output compiles before product integration**

Run `npm run build`.
Expected: Vite exits 0. Fix only generated import-path or JSX compatibility errors before continuing.

- [ ] **Step 5: Commit the chart foundation**

```bash
git add components.json vite.config.js package.json package-lock.json src/components/ui
git commit -m "chore: add bklit chart primitives"
```

### Task 2: Build Tested Dashboard Analytics

**Files:**
- Create: `src/dashboard/analytics.test.js`
- Create: `src/dashboard/analytics.js`

- [ ] **Step 1: Write failing aggregation tests**

Create fixtures anchored at `2026-07-10T12:00:00+07:00` and assert:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardAnalytics } from "./analytics.js";

test("aggregates only completed transactions in the rolling window", () => {
  const transactions = [
    { id: "a", createdAt: "2026-07-10T02:00:00.000Z", status: "completed", total: 100000, paymentMethod: "cash", items: [{ productId: "rice", name: "Rice", qty: 2, price: 50000 }] },
    { id: "b", createdAt: "2026-07-09T02:00:00.000Z", status: "completed", total: 50000, paymentMethod: "qris", items: [{ productId: "soap", name: "Soap", qty: 5, price: 10000 }] },
    { id: "c", createdAt: "2026-07-08T02:00:00.000Z", status: "voided", total: 999999, paymentMethod: "cash", items: [] }
  ];
  const result = buildDashboardAnalytics({ transactions, products: [], days: 7, now: new Date("2026-07-10T12:00:00+07:00") });
  assert.equal(result.revenue, 150000);
  assert.equal(result.transactionCount, 2);
  assert.equal(result.averageTransactionValue, 75000);
  assert.deepEqual(result.paymentMix.map(({ label, value }) => [label, value]), [["Cash", 100000], ["QRIS", 50000]]);
  assert.deepEqual(result.topProducts.map(({ productId, quantity }) => [productId, quantity]), [["soap", 5], ["rice", 2]]);
});

test("fills missing trend dates and sorts active low stock", () => {
  const products = [
    { id: "a", name: "A", active: true, stock: 10, category: "Sembako", unit: "pcs" },
    { id: "b", name: "B", active: true, stock: 2, category: "Minuman", unit: "botol" },
    { id: "c", name: "C", active: false, stock: 0, category: "Snack", unit: "pcs" }
  ];
  const result = buildDashboardAnalytics({ transactions: [], products, days: 7, now: new Date("2026-07-10T12:00:00+07:00") });
  assert.equal(result.revenueTrend.length, 7);
  assert.ok(result.revenueTrend.every((day) => day.revenue === 0));
  assert.deepEqual(result.lowStock.map((product) => product.id), ["b", "a"]);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run `node --test src/dashboard/analytics.test.js`.
Expected: FAIL because `analytics.js` does not exist.

- [ ] **Step 3: Implement the pure analytics API**

Create `buildDashboardAnalytics({ transactions = [], products = [], days = 7, now = new Date() })`. Normalize dates to local day starts, build current and previous half-open windows, exclude invalid/non-completed transactions, fill each current date with `{ date, label, revenue }`, group payment values, aggregate product quantity/revenue, compute low stock at `stock <= 10`, and return:

```js
{
  revenue,
  transactionCount,
  averageTransactionValue,
  lowStockCount,
  comparisons: {
    revenue: comparison(revenue, previousRevenue),
    transactions: comparison(transactionCount, previousCount),
    average: comparison(averageTransactionValue, previousAverage)
  },
  revenueTrend,
  paymentMix,
  topProducts,
  lowStock
}
```

`comparison(current, previous)` returns `{ direction: "up"|"down"|"neutral", percent: number|null }`; use `null` when `previous === 0`.

- [ ] **Step 4: Run the focused and full test suites**

Run `node --test src/dashboard/analytics.test.js`, then `npm test`.
Expected: all tests pass.

- [ ] **Step 5: Commit analytics**

```bash
git add src/dashboard/analytics.js src/dashboard/analytics.test.js
git commit -m "feat: add dashboard analytics"
```

### Task 3: Create Reusable Dashboard Components

**Files:**
- Create: `src/components/dashboard/DashboardKpiCard.jsx`
- Create: `src/components/dashboard/DashboardCharts.jsx`
- Create: `src/components/dashboard/LowStockPanel.jsx`

- [ ] **Step 1: Implement `DashboardKpiCard`**

Export a component accepting `label`, `value`, `icon`, `comparison`, and `tone`. Reuse `Panel` and `Icon`, format comparison as `↑ 12.4% vs previous period`, and render `No previous-period data` when `comparison.percent === null`. Use `font-mono tabular-nums` for values and semantic success/danger/warning colors.

- [ ] **Step 2: Implement the three chart panels**

Export `RevenueTrendPanel`, `PaymentMixPanel`, and `TopProductsPanel`. Import from the generated BKLIT modules under `@/components/ui`. Use these exact compositions:

```jsx
<LineChart data={data} xDataKey="date">
  <Grid horizontal />
  <XAxis dataKey="date" />
  <Line dataKey="revenue" stroke="var(--chart-line-primary)" />
  <ChartTooltip />
</LineChart>
```

```jsx
<PieChart data={data} size={240} innerRadius={68}>
  {data.map((item, index) => <PieSlice key={item.label} index={index} showGlow={false} hoverEffect="grow" />)}
  <PieCenter defaultLabel="Revenue" />
</PieChart>
```

```jsx
<BarChart data={data} xDataKey="label">
  <Grid horizontal />
  <Bar dataKey="quantity" fill="var(--chart-bar-primary)" lineCap="round" />
  <BarXAxis />
  <ChartTooltip />
</BarChart>
```

Adapt import names only when the generated BKLIT registry API differs; retain BKLIT components rather than replacing them with hand-written SVG. Each panel accepts `empty` and renders the existing `EmptyState` instead of a zero-dimension chart.

- [ ] **Step 3: Implement `LowStockPanel`**

Accept `products` and `onViewProducts`. Render at most five sorted rows using `Panel`, `Badge tone="warning"`, and a secondary `Button`. Use the production `EmptyState` when no product is low stock.

- [ ] **Step 4: Compile the component layer**

Run `npm run build`.
Expected: exit 0 with no unresolved BKLIT imports.

- [ ] **Step 5: Commit components**

```bash
git add src/components/dashboard
git commit -m "feat: add dashboard components"
```

### Task 4: Compose and Route the Dashboard

**Files:**
- Create: `src/pages/DashboardPage.jsx`
- Modify: `src/shared.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add dashboard routing**

Add `dashboard: "/dashboard"` to `routes`; prepend `["Dashboard", "grid", routes.dashboard]` to the Retail navigation group. Import `DashboardPage` in `App.jsx` and return it when `pathname === routes.dashboard`.

- [ ] **Step 2: Compose `DashboardPage`**

Read `transactions`, `products`, and `settings` from `usePOSStore()`. Hold `days` as `7` or `30`, compute analytics with `React.useMemo`, and render:

```jsx
<div className="min-h-full overflow-auto bg-app-bg">
  <header>{/* title, store name, accessible period buttons */}</header>
  <main className="grid gap-4 p-4">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{/* KPI cards */}</section>
    <section className="grid gap-4 xl:grid-cols-12">{/* revenue span 8, payment span 4 */}</section>
    <section className="grid gap-4 xl:grid-cols-12">{/* products span 7, stock span 5 */}</section>
  </main>
</div>
```

Use `formatPrice` for currency and navigate to `routes.products` through the supplied `onNavigate` prop.

- [ ] **Step 3: Verify route behavior**

Run `npm run build` and start `npm run dev` if not already running. Open `/dashboard`, use browser back/forward, switch periods, and use the low-stock action. Expected: route state, selected nav state, and navigation all work.

- [ ] **Step 4: Commit the product surface**

```bash
git add src/App.jsx src/shared.jsx src/pages/DashboardPage.jsx
git commit -m "feat: add operational dashboard"
```

### Task 5: Synchronize the Design System

**Files:**
- Create: `src/components/design/DashboardPatternsShowcase.jsx`
- Modify: `src/pages/DesignSystemPage.jsx`
- Modify: `src/index.css`
- Modify: `src/data.js`
- Modify: `DESIGN.md`

- [ ] **Step 1: Add semantic chart tokens**

Add Tailwind theme colors/CSS variables for `chart-line-primary`, `chart-line-fill`, `chart-bar-primary`, `chart-grid`, `chart-tooltip`, `chart-cash`, `chart-qris`, and `chart-other`. Use restrained neutral/green/warning values consistent with existing semantic tokens.

- [ ] **Step 2: Expose tokens in the showcase data**

Append the chart variables to the Color token group in `src/data.js`, preserving the exact values from `src/index.css`.

- [ ] **Step 3: Add dashboard pattern examples**

Create `DashboardPatternsShowcase` using the production KPI/chart components and static 7-day fixtures. Import and render it after `KpiCardShowcase` on `DesignSystemPage`.

- [ ] **Step 4: Update `DESIGN.md`**

Document `/dashboard`, the four KPI/primary-secondary grid, rolling periods, live-data and empty-state requirements, low-stock threshold, BKLIT registry requirement, and rule that chart colors come only from semantic chart tokens.

- [ ] **Step 5: Verify synchronization**

Run `rg -n "dashboard|BKLIT|chart" DESIGN.md src/pages/DesignSystemPage.jsx src/index.css src/data.js`.
Expected: all four design-system surfaces contain the new contract.

- [ ] **Step 6: Commit the synchronized system**

```bash
git add DESIGN.md src/index.css src/data.js src/pages/DesignSystemPage.jsx src/components/design/DashboardPatternsShowcase.jsx
git commit -m "docs: add dashboard design patterns"
```

### Task 6: Final Verification and Polish

**Files:**
- Modify only files already in this plan when verification exposes a dashboard defect.

- [ ] **Step 1: Run automated verification**

Run `npm test` and `npm run build`.
Expected: all Node tests pass and Vite exits 0.

- [ ] **Step 2: Inspect desktop**

At approximately 1440×900, verify the four KPI cards remain one row, primary chart is wider than the donut, labels do not clip, tooltips render within panels, and no nested page scrollbar appears.

- [ ] **Step 3: Inspect mobile**

At approximately 390×844, verify KPI cards become one/two columns, all panels stack, chart labels remain readable, the period control is operable, and there is no horizontal overflow.

- [ ] **Step 4: Verify empty and long-content states**

Use reset demo data for the no-transaction state and temporarily inspect a long product name through the existing product UI. Expected: chart panels use empty states, zeros remain truthful, low stock remains independent, and text truncates without hiding stock values.

- [ ] **Step 5: Run diff hygiene checks**

Run `git diff --check` and `git status --short`.
Expected: no whitespace errors; only planned dashboard files plus the user's pre-existing changes are present.

- [ ] **Step 6: Commit any verification fixes**

```bash
git add src/pages/DashboardPage.jsx src/components/dashboard src/components/design/DashboardPatternsShowcase.jsx src/dashboard/analytics.js src/dashboard/analytics.test.js src/index.css DESIGN.md
git commit -m "fix: polish dashboard responsiveness"
```

Skip this commit when no fixes were required.
