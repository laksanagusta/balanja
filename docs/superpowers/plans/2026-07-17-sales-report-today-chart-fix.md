# Sales Report Today Chart Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the sales report stable for the `Hari ini` preset and remove persistent dots from its trend chart while preserving hover inspection.

**Architecture:** Keep display labels separate from chart-scale values. `alignTrend` will expose a canonical ISO `date` derived from backend buckets, and `SalesTrendPanel` will use that property as its time axis. The existing shared line hover and tooltip behavior remains unchanged.

**Tech Stack:** React 19, JavaScript ES modules, Node test runner, Visx-based shared chart components, Vite.

---

## File map

- `frontend/DESIGN.md`: authoritative visual contract for sales-report trend markers.
- `frontend/src/reports/report-utils.js`: aligns current and comparison series and exposes a canonical chart date.
- `frontend/src/reports/report-utils.test.js`: regression coverage for a one-day canonical date and relative comparison alignment.
- `frontend/src/components/reports/SalesTrendPanel.jsx`: consumes the canonical date and disables persistent markers.
- `frontend/src/components/reports/ReportComponents.test.js`: structural regression coverage for chart wiring and marker behavior.

### Task 1: Synchronize the visual contract

**Files:**
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Update the Design System contract before production UI**

Replace the time-series marker sentence with:

```markdown
Time-series line charts should use a monotone X curve. Dashboard charts may use visible point markers where compact or sparse data needs them; sales-report trends use clean lines without persistent point markers and retain hover highlights plus tooltips for inspection.
```

- [ ] **Step 2: Check the documentation diff**

Run: `git diff --check -- frontend/DESIGN.md`

Expected: exit code 0 with no output.

- [ ] **Step 3: Commit only the report design-contract hunk**

Stage only the changed marker sentence so unrelated existing edits in `frontend/DESIGN.md` remain untouched, then commit:

```bash
git commit -m "docs: refine sales report chart markers"
```

Expected: one documentation hunk committed.

### Task 2: Reproduce and fix the one-day chart failure

**Files:**
- Modify: `frontend/src/reports/report-utils.test.js`
- Modify: `frontend/src/components/reports/ReportComponents.test.js`
- Modify: `frontend/src/reports/report-utils.js`
- Modify: `frontend/src/components/reports/SalesTrendPanel.jsx`

- [ ] **Step 1: Write failing regression assertions**

Use ISO buckets in the `alignTrend` fixture and expect the canonical date:

```js
const aligned = alignTrend(
  [{ bucket: "2026-07-17", label: "17 Jul", totalReceived: 10 }],
  [{ bucket: "2026-07-16", label: "16 Jul", totalReceived: 5 }],
);

assert.deepEqual(aligned, [{
  date: "2026-07-17",
  label: "17 Jul",
  current: 10,
  previous: 5,
  currentBucket: "2026-07-17",
  previousBucket: "2026-07-16",
}]);
assert.equal(Number.isFinite(new Date(aligned[0].date).getTime()), true);
```

Add component-source assertions:

```js
assert.match(trend, /xDataKey="date"/);
assert.doesNotMatch(trend, /showMarkers/);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test src/reports/report-utils.test.js src/components/reports/ReportComponents.test.js
```

Expected: FAIL because `alignTrend` does not expose `date`, the chart still uses `label`, and `showMarkers` is still present.

- [ ] **Step 3: Add the canonical date at the alignment boundary**

In `alignTrend`, add:

```js
date: current[index]?.bucket || previous[index]?.bucket || "",
```

Keep the existing display label and bucket metadata.

- [ ] **Step 4: Wire the report chart to canonical dates and remove persistent dots**

Change the chart to:

```jsx
<LineChart data={data} xDataKey="date" ...>
```

Change the current-period line to:

```jsx
<Line dataKey="current" stroke="var(--chart-line-primary)" strokeWidth={2.5} />
```

Do not change `showHighlight`, `ChartTooltip`, or the comparison line.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test src/reports/report-utils.test.js src/components/reports/ReportComponents.test.js
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit the isolated bugfix**

```bash
git add frontend/src/reports/report-utils.js frontend/src/reports/report-utils.test.js frontend/src/components/reports/SalesTrendPanel.jsx frontend/src/components/reports/ReportComponents.test.js
git commit -m "fix: stabilize single-day sales trend"
```

### Task 3: Verify the complete frontend

**Files:**
- No production-file changes expected.

- [ ] **Step 1: Run the full frontend suite**

Run: `npm run test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite exits 0. Existing third-party `use client` and large-chunk warnings may remain; no new build errors are allowed.

- [ ] **Step 3: Inspect repository hygiene**

Run:

```bash
git diff --check
git diff --cached --check
git status --short --branch
```

Expected: no staged changes from this fix and no whitespace errors. Pre-existing unrelated working-tree changes remain unmodified.
