# Sales Report Apple Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five approved Sales Report review findings without changing report data semantics.

**Architecture:** Keep the shared chart visual renderer, but make its interaction compatible with vertical page scrolling and expose report trend data through a screen-reader-only table owned by `SalesTrendPanel`. Keep desktop filters expanded while compact layouts use an accessible disclosure whose state does not destroy draft filters. Resolve reduced motion inside the shared chart so every consumer inherits it, and make KPI typography adapt without truncation.

**Tech Stack:** React, Motion, Tailwind CSS, Node test runner, Vite.

---

### Task 1: Add failing accessibility and responsive contracts

**Files:**
- Modify: `frontend/src/components/reports/ReportComponents.test.js`
- Modify: `frontend/src/pages/SalesReportPage.test.js`

- [ ] Add source-contract assertions for `pan-y`, an accessible trend table, reduced-motion chart behavior, a compact filter disclosure, and non-truncated KPI values.
- [ ] Run `npm test` from `frontend` and verify the new assertions fail for the missing behavior.

### Task 2: Restore touch scrolling and reduced-motion behavior

**Files:**
- Modify: `frontend/src/components/charts/line-chart.jsx`
- Modify: `frontend/src/components/charts/time-series-chart-shell.jsx`
- Modify: `frontend/src/components/charts/chart-reveal-clip.jsx`
- Modify: `frontend/src/components/charts/use-chart-phase-orchestrator.js`

- [ ] Change chart containers to `touch-action: pan-y` so vertical gestures remain native.
- [ ] Use `useReducedMotion` to disable clip reveal and its phase timer, rendering the final chart state immediately.
- [ ] Run the report component tests and verify the touch/reduced-motion assertions pass.

### Task 3: Add an accessible trend equivalent

**Files:**
- Modify: `frontend/src/components/reports/SalesTrendPanel.jsx`

- [ ] Give the visual chart an accessible description and render a visually hidden table containing every label, current value, and previous value.
- [ ] Run the report component tests and verify the chart-data accessibility assertion passes.

### Task 4: Make compact filters collapsible and KPI values flexible

**Files:**
- Modify: `frontend/src/components/reports/SalesReportToolbar.jsx`
- Modify: `frontend/src/components/reports/ReportMetricCard.jsx`
- Modify: `frontend/src/pages/SalesReportPage.jsx`

- [ ] Add a compact-only disclosure button with `aria-expanded` and `aria-controls`; keep desktop controls always visible and preserve all filter state while collapsed.
- [ ] Keep filter status and update announcements visible outside the collapsible body.
- [ ] Remove KPI truncation and use wrapping plus responsive type sizing.
- [ ] Run the report page and component tests and verify all new contracts pass.

### Task 5: Synchronize design documentation and verify

**Files:**
- Modify: `frontend/DESIGN.md`
- Modify: `frontend/src/components/design/ReportPatternsShowcase.jsx`

- [ ] Document chart touch scrolling, accessible trend equivalents, reduced-motion behavior, compact filter disclosure, and complete KPI values.
- [ ] Run the complete frontend test suite.
- [ ] Run `npm run build` from `frontend`.
- [ ] Run `git diff --check` from the repository root.
