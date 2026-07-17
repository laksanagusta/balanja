# Sales Report and Dashboard Chart Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sales-report hourly and daily trends visually truthful, render the comparison as a stable full dashed line, and localize and bound the dashboard revenue chart without changing its markers.

**Architecture:** Extend the shared time-series chart with an optional display-label key that remains separate from its canonical time key, and add a native full-series dash prop to `Line`. A small shared formatter will localize tooltip titles for report and dashboard consumers. Production panels own their height, tooltip rows, and marker choices.

**Tech Stack:** React 19, JavaScript ES modules, Node test runner, Visx, Tailwind CSS, Vite.

**Execution constraint:** Work directly on the current branch. Do not create a worktree or dispatch subagents. Preserve unrelated dirty working-tree changes and partially stage shared dirty files when necessary.

---

## File map

- `frontend/DESIGN.md`: authoritative chart behavior for report and dashboard.
- `frontend/src/components/design/ReportPatternsShowcase.jsx`: demonstrates both hourly and daily report trends.
- `frontend/src/components/design/ReportPatternsShowcase.test.js`: locks the design-system contract before production changes.
- `frontend/src/components/charts/time-series-labels.js`: resolves explicit display labels with a date-format fallback.
- `frontend/src/components/charts/time-series-labels.test.js`: unit coverage for label resolution.
- `frontend/src/components/charts/time-series-chart-shell.jsx`: publishes resolved display labels to axes and tooltips.
- `frontend/src/components/charts/line-chart.jsx`: forwards `xLabelKey` to the chart shell.
- `frontend/src/components/charts/line.jsx`: applies `strokeDasharray` to static and animated full-series paths.
- `frontend/src/components/charts/line-rendering.test.js`: structural regression coverage for both line render paths.
- `frontend/src/components/charts/trend-tooltip-title.js`: formats localized daily and hourly tooltip titles.
- `frontend/src/components/charts/trend-tooltip-title.test.js`: unit coverage for daily, hourly, and invalid dates.
- `frontend/src/components/reports/SalesTrendPanel.jsx`: consumes hourly labels, full dash styling, localized tooltip copy, and bounded height.
- `frontend/src/components/reports/ReportComponents.test.js`: locks report chart wiring.
- `frontend/src/components/dashboard/DashboardCharts.jsx`: consumes localized labels and tooltip copy while retaining markers.
- `frontend/src/components/dashboard/DashboardCharts.test.js`: locks dashboard chart wiring.

### Task 1: Synchronize the Design System contract

**Files:**
- Modify: `frontend/DESIGN.md`
- Modify: `frontend/src/components/design/ReportPatternsShowcase.jsx`
- Test: `frontend/src/components/design/ReportPatternsShowcase.test.js`

- [ ] **Step 1: Write failing Design System assertions**

Add these assertions to `ReportPatternsShowcase.test.js`:

```js
assert.match(design, /one-day sales-report trends use hourly WIB labels/i);
assert.match(design, /bounded chart height/i);
assert.match(design, /dashboard revenue.*localized.*Rupiah/i);
assert.match(showcase, /2026-07-17T\$\{String\(hour\)\.padStart/);
assert.match(showcase, /Tampilan per jam/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd frontend
node --test src/components/design/ReportPatternsShowcase.test.js
```

Expected: FAIL because the hourly example and the updated visual contract are absent.

- [ ] **Step 3: Update the design contract**

Add this paragraph under `## Sales reports` in `frontend/DESIGN.md`:

```markdown
One-day sales-report trends use hourly WIB labels while longer periods use localized daily labels; canonical timestamps control geometry and presentation labels never control scale. The selected period is solid, the previous equal-length period is fully dashed, and both remain dot-free. Report trends use bounded chart height. Dashboard revenue keeps visible markers for sparse daily observations, but uses localized axis labels, a localized Rupiah tooltip, and bounded chart height.
```

- [ ] **Step 4: Add an hourly showcase next to the daily example**

In `ReportPatternsShowcase.jsx`, create hourly fixtures:

```js
const hourlyCurrent = Array.from({ length: 24 }, (_, hour) => ({
  bucket: `2026-07-17T${String(hour).padStart(2, "0")}:00:00+07:00`,
  label: `${String(hour).padStart(2, "0")}.00`,
  totalReceived: hour === 10 ? 180000 : hour === 15 ? 95000 : 0,
}));
const hourlyPrevious = Array.from({ length: 24 }, (_, hour) => ({
  bucket: `2026-07-16T${String(hour).padStart(2, "0")}:00:00+07:00`,
  label: `${String(hour).padStart(2, "0")}.00`,
  totalReceived: hour === 11 ? 120000 : 0,
}));
```

Render a concise label and the new example before the existing daily chart:

```jsx
<p className="text-xs font-semibold text-text-muted">Tampilan per jam</p>
<SalesTrendPanel current={hourlyCurrent} previous={hourlyPrevious} />
<p className="text-xs font-semibold text-text-muted">Tampilan per hari</p>
<SalesTrendPanel current={current} previous={previous} />
```

- [ ] **Step 5: Run the Design System test and verify GREEN**

Run:

```bash
cd frontend
node --test src/components/design/ReportPatternsShowcase.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit only owned design hunks**

Partially stage `frontend/DESIGN.md` so unrelated user edits remain unstaged, then stage the showcase files and commit:

```bash
git add -p frontend/DESIGN.md
git add frontend/src/components/design/ReportPatternsShowcase.jsx frontend/src/components/design/ReportPatternsShowcase.test.js
git commit -m "docs: define truthful trend chart patterns"
```

### Task 2: Separate time geometry from display labels

**Files:**
- Create: `frontend/src/components/charts/time-series-labels.js`
- Create: `frontend/src/components/charts/time-series-labels.test.js`
- Modify: `frontend/src/components/charts/time-series-chart-shell.jsx`
- Modify: `frontend/src/components/charts/line-chart.jsx`

- [ ] **Step 1: Write the failing label-resolution unit tests**

Create `time-series-labels.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { resolveTimeSeriesLabels } from "./time-series-labels.js";

const data = [
  { date: "2026-07-17T00:00:00+07:00", label: "00.00" },
  { date: "2026-07-17T06:00:00+07:00", label: "06.00" },
];
const xAccessor = (point) => new Date(point.date);

test("uses explicit time-series display labels without changing x values", () => {
  assert.deepEqual(resolveTimeSeriesLabels(data, xAccessor, "label"), ["00.00", "06.00"]);
});

test("falls back to formatted dates when the display label is absent", () => {
  const labels = resolveTimeSeriesLabels([{ date: "2026-07-17T00:00:00+07:00" }], xAccessor);
  assert.equal(labels.length, 1);
  assert.match(labels[0], /Jul/);
});
```

- [ ] **Step 2: Run the unit test and verify RED**

Run:

```bash
cd frontend
node --test src/components/charts/time-series-labels.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `time-series-labels.js`.

- [ ] **Step 3: Implement label resolution**

Create `time-series-labels.js`:

```js
import { shortDateFmt } from "./chart-formatters.js";

export function resolveTimeSeriesLabels(data, xAccessor, xLabelKey) {
  return data.map((point) => {
    const explicit = xLabelKey ? point?.[xLabelKey] : undefined;
    if (explicit !== undefined && explicit !== null && String(explicit).trim()) {
      return String(explicit);
    }
    return shortDateFmt.format(xAccessor(point));
  });
}
```

- [ ] **Step 4: Forward and consume `xLabelKey`**

In `line-chart.jsx`, add `xLabelKey` to both `LineChart` and `ChartInner`, then forward it to `TimeSeriesChartInner`:

```jsx
<TimeSeriesChartInner
  {...existingProps}
  xDataKey={xDataKey}
  xLabelKey={xLabelKey}
>
```

In `time-series-chart-shell.jsx`, accept `xLabelKey`, import `resolveTimeSeriesLabels`, and replace the current `dateLabels` memo with:

```js
const dateLabels = useMemo(
  () => resolveTimeSeriesLabels(visiblePlotData, xAccessor, xLabelKey),
  [visiblePlotData, xAccessor, xLabelKey],
);
```

- [ ] **Step 5: Run focused label and report tests and verify GREEN**

Run:

```bash
cd frontend
node --test src/components/charts/time-series-labels.test.js src/components/reports/ReportComponents.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the shared label API**

```bash
git add frontend/src/components/charts/time-series-labels.js frontend/src/components/charts/time-series-labels.test.js frontend/src/components/charts/time-series-chart-shell.jsx frontend/src/components/charts/line-chart.jsx
git commit -m "feat: support explicit time-series labels"
```

### Task 3: Add a true full-series dashed line

**Files:**
- Create: `frontend/src/components/charts/line-rendering.test.js`
- Modify: `frontend/src/components/charts/line.jsx`

- [ ] **Step 1: Write a failing structural regression test**

Create `line-rendering.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("full-series dash styling reaches static and animated line paths", async () => {
  const source = await readFile(new URL("./line.jsx", import.meta.url), "utf8");
  assert.match(source, /function LineSeriesStroke\(\{[\s\S]*strokeDasharray,/);
  assert.equal((source.match(/strokeDasharray=\{strokeDasharray\}/g) || []).length >= 2, true);
  assert.match(source, /export function Line\([\s\S]*strokeDasharray,/);
});
```

- [ ] **Step 2: Run the line test and verify RED**

Run:

```bash
cd frontend
node --test src/components/charts/line-rendering.test.js
```

Expected: FAIL because `Line` has no full-series `strokeDasharray` prop.

- [ ] **Step 3: Apply dash styling to both render paths**

Add `strokeDasharray` to `LineSeriesStroke`, then pass it to the animated SVG path and static `LinePath`:

```jsx
<path
  d={animatedPathD}
  fill="none"
  ref={pathRef}
  stroke={visibleStroke}
  strokeDasharray={strokeDasharray}
  strokeLinecap="round"
  strokeWidth={strokeWidth}
/>
```

```jsx
<LinePath
  {...existingProps}
  strokeDasharray={strokeDasharray}
/>
```

Add `strokeDasharray` to the public `Line` props and forward it to `LineSeriesStroke`. Do not change `dashFromIndex` or projection-tail behavior.

- [ ] **Step 4: Run the line test and verify GREEN**

Run:

```bash
cd frontend
node --test src/components/charts/line-rendering.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit only the owned `line.jsx` hunk**

Because `line.jsx` already contains unrelated user edits, partially stage only `strokeDasharray` changes:

```bash
git add frontend/src/components/charts/line-rendering.test.js
git add -p frontend/src/components/charts/line.jsx
git commit -m "feat: support full-series dashed lines"
```

### Task 4: Localize trend tooltips and fix panel geometry

**Files:**
- Create: `frontend/src/components/charts/trend-tooltip-title.js`
- Create: `frontend/src/components/charts/trend-tooltip-title.test.js`
- Modify: `frontend/src/components/reports/SalesTrendPanel.jsx`
- Modify: `frontend/src/components/reports/ReportComponents.test.js`
- Modify: `frontend/src/components/dashboard/DashboardCharts.jsx`
- Modify: `frontend/src/components/dashboard/DashboardCharts.test.js`

- [ ] **Step 1: Write failing tooltip-title tests**

Create `trend-tooltip-title.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { localizedTrendTitle } from "./trend-tooltip-title.js";

test("formats hourly report points with WIB date and hour", () => {
  assert.equal(localizedTrendTitle({
    date: "2026-07-17T14:00:00+07:00",
    label: "14.00",
    currentBucket: "2026-07-17T14:00:00+07:00",
  }), "17 Jul · 14.00");
});

test("formats daily points as a localized full date", () => {
  assert.match(localizedTrendTitle({ date: "2026-07-17" }), /Jumat, 17 Jul/);
});

test("falls back to the display label for an invalid date", () => {
  assert.equal(localizedTrendTitle({ date: "invalid", label: "Saat ini" }), "Saat ini");
});
```

Extend `ReportComponents.test.js` with:

```js
assert.match(trend, /xLabelKey="label"/);
assert.match(trend, /strokeDasharray="6 5"/);
assert.doesNotMatch(trend, /dashFromIndex/);
assert.match(trend, /aspectRatio=\{null\}/);
assert.match(trend, /h-\[260px\] md:h-\[320px\]/);
```

Extend `DashboardCharts.test.js` with:

```js
assert.match(dashboard, /xLabelKey="label"/);
assert.match(dashboard, /TooltipContent/);
assert.match(dashboard, /formatPrice/);
assert.match(dashboard, /aspectRatio=\{null\}/);
assert.match(dashboard, /h-\[250px\] md:h-\[280px\]/);
assert.match(dashboard, /showMarkers/);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
cd frontend
node --test src/components/charts/trend-tooltip-title.test.js src/components/reports/ReportComponents.test.js src/components/dashboard/DashboardCharts.test.js
```

Expected: FAIL because the formatter module and new consumer wiring are absent.

- [ ] **Step 3: Implement the shared localized title formatter**

Create `trend-tooltip-title.js`:

```js
const fullDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

export function localizedTrendTitle(point = {}) {
  const date = new Date(point.date);
  if (Number.isNaN(date.getTime())) return String(point.label || "");
  const hourly = String(point.currentBucket || "").includes("T");
  if (hourly && point.label) return `${shortDateFormatter.format(date)} · ${point.label}`;
  return fullDateFormatter.format(date);
}
```

- [ ] **Step 4: Correct `SalesTrendPanel`**

Replace the local date formatter with `localizedTrendTitle`, then wire the chart as follows:

```jsx
<LineChart
  data={data}
  xDataKey="date"
  xLabelKey="label"
  aspectRatio={null}
  className="mt-4 h-[260px] md:h-[320px]"
  margin={{ top: 24, right: 18, bottom: 42, left: 18 }}
>
  <Grid horizontal numTicksRows={4} fadeHorizontal={false} />
  <Line dataKey="current" stroke="var(--chart-line-primary)" strokeWidth={2.5} />
  <Line dataKey="previous" stroke="var(--color-text-muted)" strokeWidth={1.75} strokeDasharray="6 5" />
  <XAxis numTicks={Math.min(data.length, 7)} />
  <ChartTooltip
    showDots={false}
    showDatePill={false}
    content={({ point }) => <ReportTrendTooltip point={point} />}
  />
</LineChart>
```

Use `localizedTrendTitle(point)` as the report tooltip title. Keep both Rupiah rows and keep all dots disabled.

- [ ] **Step 5: Correct `RevenueTrendPanel` without removing markers**

Import `TooltipContent` and `localizedTrendTitle`. Add:

```jsx
function RevenueTrendTooltip({ point }) {
  return (
    <TooltipContent
      title={localizedTrendTitle(point)}
      rows={[{
        label: "Pendapatan",
        value: formatPrice(point.revenue),
        color: "var(--chart-line-primary)",
      }]}
    />
  );
}
```

Wire the dashboard line chart as:

```jsx
<LineChart
  data={data}
  xDataKey="date"
  xLabelKey="label"
  aspectRatio={null}
  className="mt-3 h-[250px] md:h-[280px]"
  margin={{ top: 24, right: 18, bottom: 42, left: 18 }}
>
  <Grid horizontal numTicksRows={4} fadeHorizontal={false} />
  <Line dataKey="revenue" stroke="var(--chart-line-primary)" strokeWidth={2.5} showMarkers />
  <XAxis numTicks={days === 30 ? 6 : 7} />
  <ChartTooltip showDatePill={false} content={({ point }) => <RevenueTrendTooltip point={point} />} />
</LineChart>
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
cd frontend
node --test src/components/charts/trend-tooltip-title.test.js src/components/charts/time-series-labels.test.js src/components/charts/line-rendering.test.js src/components/reports/ReportComponents.test.js src/components/dashboard/DashboardCharts.test.js src/components/design/ReportPatternsShowcase.test.js
```

Expected: all focused tests PASS.

- [ ] **Step 7: Commit the consumer fixes**

```bash
git add frontend/src/components/charts/trend-tooltip-title.js frontend/src/components/charts/trend-tooltip-title.test.js frontend/src/components/reports/SalesTrendPanel.jsx frontend/src/components/reports/ReportComponents.test.js frontend/src/components/dashboard/DashboardCharts.jsx frontend/src/components/dashboard/DashboardCharts.test.js
git commit -m "fix: render truthful report and dashboard trends"
```

### Task 5: Verify the complete frontend and repository hygiene

**Files:**
- No production changes expected.

- [ ] **Step 1: Run the full frontend test suite**

Run:

```bash
cd frontend
npm run test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite exits 0. Existing `use client`, sourcemap, and large-chunk warnings may remain; no new build error is allowed.

- [ ] **Step 3: Audit the final diff and dirty tree**

Run:

```bash
git diff --check
git diff --cached --check
git status --short --branch
git log --oneline -8
```

Expected: no whitespace errors, no staged files left behind, and unrelated pre-existing working-tree changes remain uncommitted.
