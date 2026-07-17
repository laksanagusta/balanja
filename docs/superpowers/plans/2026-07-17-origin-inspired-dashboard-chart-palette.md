# Origin-Inspired Dashboard Chart Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's near-monochrome chart colors with the approved Balanced Vivid violet, green, mint, and amber palette while preserving white panels, existing chart behavior, and accessible non-color labels.

**Architecture:** Keep `DashboardCharts.jsx` consuming semantic CSS variables and change the palette at the design-token layer. Add source-contract tests for exact token values and role mappings, synchronize the token inventory and dashboard showcase copy, then verify the unchanged BKLIT chart components render the new palette through their existing variables.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4 theme variables, BKLIT chart components, Node.js test runner.

---

## File Map

- Create `frontend/src/components/dashboard/DashboardChartPalette.test.js`: exact palette and semantic-role regression contract.
- Create `frontend/src/components/design/DashboardPatternsShowcase.test.js`: design-system mapping contract.
- Modify `frontend/src/index.css`: approved chart color tokens and chart-role aliases.
- Modify `frontend/src/data.js`: visible design-system color-token inventory.
- Modify `frontend/src/components/design/DashboardPatternsShowcase.jsx`: document the mapping next to the live chart examples.
- Modify `frontend/DESIGN.md`: authoritative dashboard palette and accessibility rules.
- Verify `frontend/src/components/dashboard/DashboardCharts.jsx`: retain semantic variables and existing geometry; no production JSX change is expected.

### Task 1: Add and Implement the Semantic Chart Palette

**Files:**
- Create: `frontend/src/components/dashboard/DashboardChartPalette.test.js`
- Modify: `frontend/src/index.css:19-29,466-478`
- Modify: `frontend/src/data.js:204-213`
- Verify: `frontend/src/components/dashboard/DashboardCharts.jsx`

- [ ] **Step 1: Write the failing palette contract**

Create `frontend/src/components/dashboard/DashboardChartPalette.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard charts use the approved balanced vivid semantic palette", async () => {
  const styles = await readFile(new URL("../../index.css", import.meta.url), "utf8");
  const charts = await readFile(new URL("./DashboardCharts.jsx", import.meta.url), "utf8");

  assert.match(styles, /--color-chart-violet: #7867e6;/i);
  assert.match(styles, /--color-chart-green: #36a875;/i);
  assert.match(styles, /--color-chart-mint: #5bbf9a;/i);
  assert.match(styles, /--color-chart-amber: #e7a83e;/i);

  assert.match(styles, /--color-chart-cash: var\(--color-chart-violet\);/);
  assert.match(styles, /--color-chart-qris: var\(--color-chart-mint\);/);
  assert.match(styles, /--color-chart-other: var\(--color-chart-amber\);/);
  assert.match(styles, /--chart-line-primary: var\(--color-chart-violet\);/);
  assert.match(styles, /--chart-bar-primary: var\(--color-chart-green\);/);

  assert.match(charts, /stroke="var\(--chart-line-primary\)"/);
  assert.match(charts, /fill="var\(--chart-bar-primary\)"/);
  assert.doesNotMatch(charts, /#[0-9a-f]{6}/i);
});

test("design-system inventory exposes every dashboard chart color", async () => {
  const tokens = await readFile(new URL("../../data.js", import.meta.url), "utf8");

  assert.match(tokens, /\["Chart Violet", "--color-chart-violet", "#7867E6"\]/);
  assert.match(tokens, /\["Chart Green", "--color-chart-green", "#36A875"\]/);
  assert.match(tokens, /\["Chart Mint", "--color-chart-mint", "#5BBF9A"\]/);
  assert.match(tokens, /\["Chart Amber", "--color-chart-amber", "#E7A83E"\]/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd frontend
node --test src/components/dashboard/DashboardChartPalette.test.js
```

Expected: FAIL because `--color-chart-violet` and the other approved tokens do not exist yet.

- [ ] **Step 3: Add the approved semantic tokens and mappings**

In the `@theme` color section of `frontend/src/index.css`, replace the three existing payment chart tokens with:

```css
  --color-chart-violet: #7867e6;
  --color-chart-green: #36a875;
  --color-chart-mint: #5bbf9a;
  --color-chart-amber: #e7a83e;
  --color-chart-cash: var(--color-chart-violet);
  --color-chart-qris: var(--color-chart-mint);
  --color-chart-other: var(--color-chart-amber);
```

In the `:root` chart-token section of the same file, use:

```css
:root {
  --chart-1: var(--color-chart-violet);
  --chart-2: var(--color-chart-mint);
  --chart-3: var(--color-chart-amber);
  --chart-4: var(--color-chart-green);
  --chart-5: #d9d9d9;
  --chart-background: var(--color-surface);
  --chart-foreground: var(--color-text);
  --chart-foreground-muted: var(--color-text-muted);
  --chart-line-primary: var(--color-chart-violet);
  --chart-line-secondary: var(--color-chart-mint);
  --chart-bar-primary: var(--color-chart-green);
  --chart-crosshair: var(--color-text-muted);
  --chart-grid: var(--color-border);
  --chart-brush-border: var(--chart-grid);
  --chart-tooltip-background: rgb(29 29 31 / 0.94);
  --chart-tooltip-foreground: #ffffff;
  --chart-tooltip-muted: #d9d9d9;
  --chart-marker-background: var(--color-surface-muted);
  --chart-marker-border: var(--color-border-strong);
  --chart-marker-foreground: var(--color-text);
  --chart-label: var(--color-text-muted);
  --chart-scale-01: oklch(0.98 0.003 106);
  --chart-scale-02: oklch(0.92 0.008 106);
  --chart-scale-03: oklch(0.82 0.015 106);
  --chart-scale-04: oklch(0.68 0.02 106);
  --chart-scale-05: oklch(0.55 0.025 106);
  --chart-scale-pattern-color: oklch(0.96 0.005 106);
}
```

In `frontend/src/data.js`, replace the current three chart entries with:

```js
      ["Chart Violet", "--color-chart-violet", "#7867E6"],
      ["Chart Green", "--color-chart-green", "#36A875"],
      ["Chart Mint", "--color-chart-mint", "#5BBF9A"],
      ["Chart Amber", "--color-chart-amber", "#E7A83E"],
      ["Chart Cash", "--color-chart-cash", "#7867E6"],
      ["Chart QRIS", "--color-chart-qris", "#5BBF9A"],
      ["Chart Other", "--color-chart-other", "#E7A83E"],
```

Do not add literal hex colors to `DashboardCharts.jsx`; its existing `--chart-line-primary` and `--chart-bar-primary` references are the required interface.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
cd frontend
node --test src/components/dashboard/DashboardChartPalette.test.js
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the palette contract and implementation**

```bash
git add frontend/src/components/dashboard/DashboardChartPalette.test.js frontend/src/index.css frontend/src/data.js
git commit -m "feat: refresh dashboard chart palette"
```

### Task 2: Synchronize the Dashboard Design-System Contract

**Files:**
- Create: `frontend/src/components/design/DashboardPatternsShowcase.test.js`
- Modify: `frontend/src/components/design/DashboardPatternsShowcase.jsx:27-35`
- Modify: `frontend/DESIGN.md:81-84`

- [ ] **Step 1: Write the failing showcase contract**

Create `frontend/src/components/design/DashboardPatternsShowcase.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard showcase documents the production chart-role mapping", async () => {
  const source = await readFile(new URL("./DashboardPatternsShowcase.jsx", import.meta.url), "utf8");

  assert.match(source, /Revenue uses violet/);
  assert.match(source, /top products use green/);
  assert.match(source, /payment methods use violet, mint, and amber/);
  assert.match(source, /labels and values keep every chart readable without color/);
});
```

- [ ] **Step 2: Run the showcase test and verify RED**

Run:

```bash
cd frontend
node --test src/components/design/DashboardPatternsShowcase.test.js
```

Expected: FAIL because the existing showcase paragraph only describes semantic tokens and monotone geometry.

- [ ] **Step 3: Update the live showcase explanation**

In `frontend/src/components/design/DashboardPatternsShowcase.jsx`, replace the explanatory paragraph with:

```jsx
        <p className="text-sm leading-6 text-text-muted">
          Production BKLIT charts use Balanja semantic tokens on calm white panels. Revenue uses violet, top products use green,
          and payment methods use violet, mint, and amber. Legends, markers, labels and values keep every chart readable without color.
        </p>
```

Keep the existing `RevenueTrendPanel`, `PaymentMixPanel`, and `TopProductsPanel` examples unchanged so they render the production variables directly.

- [ ] **Step 4: Update the authoritative dashboard design rule**

In `frontend/DESIGN.md`, replace the current dashboard chart-color paragraph with:

```markdown
Dashboard charts must use the installed BKLIT registry components (`@bklit/line-chart`, `@bklit/pie-chart`, and `@bklit/bar-chart`) rather than hand-written SVG charts. Use the Balanced Vivid chart palette only on data marks: violet (`--color-chart-violet`) for the revenue line and Cash, green (`--color-chart-green`) for top-product bars, mint (`--color-chart-mint`) for QRIS, and amber (`--color-chart-amber`) for Other. Keep panels white, grids neutral, and tooltips dark; do not add colored panel tints, gradients, glow, or decorative area fills. Labels, legends, markers, and supporting values must keep the data understandable without relying on color alone.
```

- [ ] **Step 5: Run design-system tests and verify GREEN**

Run:

```bash
cd frontend
node --test src/components/design/DashboardPatternsShowcase.test.js src/components/dashboard/DashboardChartPalette.test.js
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit the design-system synchronization**

```bash
git add frontend/src/components/design/DashboardPatternsShowcase.test.js frontend/src/components/design/DashboardPatternsShowcase.jsx frontend/DESIGN.md
git commit -m "docs: sync dashboard chart color system"
```

### Task 3: Verify Behavior, Build, and Visual Balance

**Files:**
- Verify: `frontend/src/pages/DashboardPage.jsx`
- Verify: `frontend/src/components/dashboard/DashboardCharts.jsx`
- Verify: `frontend/src/components/design/DashboardPatternsShowcase.jsx`
- Verify: `frontend/src/index.css`

- [ ] **Step 1: Run the complete frontend test suite**

Run:

```bash
cd frontend
npm run test
```

Expected: all tests PASS, including the palette and showcase contracts.

- [ ] **Step 2: Build the production frontend**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite exits with code 0. Existing third-party `"use client"`, chart sourcemap, and large-chunk warnings may remain; no new error is acceptable.

- [ ] **Step 3: Check patch hygiene**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 4: Review the live dashboard and showcase**

Run:

```bash
cd frontend
npm run dev
```

At `/dashboard` and the Dashboard Patterns section of the design-system page, verify:

- Revenue line is violet `#7867E6` with visible markers on white.
- Top-products bars are green `#36A875`.
- Cash, QRIS, and Other slices are violet, mint, and amber respectively.
- Chart panels remain white; grids, axes, and dark tooltips are unchanged.
- Legends, labels, values, and hover tooltips identify data without depending on color.
- At desktop and compact widths, no legend truncation or chart overflow appears.

Stop the development server after review.

- [ ] **Step 5: Record final repository state**

Run:

```bash
git status --short --branch
```

Expected: only pre-existing unrelated user changes remain; the palette work is committed in the two task commits above.
