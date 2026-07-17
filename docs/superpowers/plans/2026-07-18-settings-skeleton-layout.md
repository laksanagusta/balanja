# Settings Skeleton Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generic Settings loading skeleton mirror the responsive navigation rail and centered content layout used by the production page.

**Architecture:** Recompose only `SettingsPageSkeleton` using the same mobile-first grid geometry as `SettingsPage`, while keeping its content neutral across tabs. Reuse the production skeleton directly in the Design System showcase so documented loading geometry cannot drift.

**Tech Stack:** React 19, Tailwind CSS v4, Node test runner, Vite

---

## File Structure

- Create `frontend/src/components/page-loading.test.js`: source-contract regression test for Settings skeleton geometry.
- Modify `frontend/src/components/page-loading.jsx`: replace the obsolete Settings summary layout with the responsive rail and centered generic panel.
- Modify `frontend/src/components/design/SkeletonShowcase.jsx`: render the production Settings skeleton in the Design System.
- Modify `frontend/src/pages/DesignSystemPage.test.js`: protect production skeleton reuse in the showcase.
- Modify `frontend/DESIGN.md`: document Settings skeleton geometry.

### Task 1: Rebuild the production Settings skeleton

**Files:**
- Create: `frontend/src/components/page-loading.test.js`
- Modify: `frontend/src/components/page-loading.jsx`

- [ ] **Step 1: Write the failing Settings skeleton contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings skeleton mirrors the responsive navigation and centered content layout", async () => {
  const source = await readFile(new URL("./page-loading.jsx", import.meta.url), "utf8");
  const settingsSkeleton = source.slice(source.indexOf("export function SettingsPageSkeleton()"));

  assert.match(settingsSkeleton, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(settingsSkeleton, /max-w-3xl/);
  assert.match(settingsSkeleton, /min-h-11/);
  assert.match(settingsSkeleton, /overflow-x-auto/);
  assert.doesNotMatch(settingsSkeleton, /xl:grid-cols-\[minmax\(0,1fr\)_360px\]/);
  assert.doesNotMatch(settingsSkeleton, /<aside/);
});
```

- [ ] **Step 2: Run the test and verify the obsolete layout fails**

Run: `cd frontend && node --test src/components/page-loading.test.js`

Expected: FAIL because the skeleton has no 14rem navigation rail, centered `max-w-3xl` content, or 44px compact navigation targets.

- [ ] **Step 3: Replace `SettingsPageSkeleton` with the generic responsive shell**

Replace the complete function with:

```jsx
export function SettingsPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface" aria-busy="true">
      <header className="grid gap-3 border-b border-border px-6 py-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <Skeleton className="h-5 w-24 bg-surface-muted/80" />
      </header>

      <main className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6 lg:p-6">
        <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 md:grid md:content-start md:overflow-visible md:pb-0">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className={`min-h-11 flex-none rounded-control bg-surface-muted/80 md:w-full ${index === 0 ? "w-28" : "w-24"}`}
            />
          ))}
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <Panel className="grid gap-4 p-4">
            <div className="border-b border-border pb-3">
              <Skeleton className="h-4 w-24 bg-surface-muted/80" />
              <Skeleton className="mt-2 h-3.5 w-full max-w-80 bg-surface-muted/80" />
            </div>

            <div className="grid gap-3 rounded-card border border-border bg-surface-muted/50 p-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-end">
              <div className="grid gap-2">
                <Skeleton className="h-3.5 w-24 bg-surface" />
                <Skeleton className="h-11 w-full rounded-card bg-surface" />
              </div>
              <Skeleton className="h-11 w-full rounded-control bg-surface" />
            </div>

            <div className="grid gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-border p-3">
                  <div className="grid flex-1 gap-2">
                    <Skeleton className={`h-4 bg-surface-muted/80 ${index === 1 ? "w-2/5" : "w-1/3"}`} />
                    <Skeleton className="h-3 w-20 bg-surface-muted/80" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-control bg-surface-muted/80" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run the skeleton contract test**

Run: `cd frontend && node --test src/components/page-loading.test.js`

Expected: PASS, 1 test.

- [ ] **Step 5: Commit the production skeleton**

```bash
git add frontend/src/components/page-loading.jsx frontend/src/components/page-loading.test.js
git commit -m "fix: align settings skeleton with responsive layout"
```

### Task 2: Sync the skeleton into the Design System

**Files:**
- Modify: `frontend/src/components/design/SkeletonShowcase.jsx`
- Modify: `frontend/src/pages/DesignSystemPage.test.js`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Add a failing Design System contract**

Extend `DesignSystemPage.test.js` with a new test:

```js
test("design system reuses the production Settings skeleton", async () => {
  const showcase = await readFile(
    new URL("../components/design/SkeletonShowcase.jsx", import.meta.url),
    "utf8",
  );
  assert.match(showcase, /SettingsPageSkeleton/);
});
```

- [ ] **Step 2: Run the test and verify the production skeleton is not yet showcased**

Run: `cd frontend && node --test src/pages/DesignSystemPage.test.js`

Expected: FAIL because `SkeletonShowcase` does not import or render `SettingsPageSkeleton`.

- [ ] **Step 3: Render the production skeleton in `SkeletonShowcase`**

Add:

```jsx
import { SettingsPageSkeleton } from "../page-loading.jsx";
```

After the existing `Page skeletons` examples and before `Cart list skeleton`, add:

```jsx
<div className="mt-4 grid gap-3">
  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Settings skeleton</p>
  <div className="h-[30rem] overflow-hidden rounded-card border border-border">
    <SettingsPageSkeleton />
  </div>
</div>
```

- [ ] **Step 4: Document the Settings loading geometry**

Append this sentence to the loading-skeleton paragraph in `frontend/DESIGN.md`:

```md
The Settings initial skeleton uses the same compact horizontal navigation, 14rem desktop rail, and centered 48rem content geometry as the settled page; it never restores the removed store-summary aside.
```

- [ ] **Step 5: Run focused skeleton and Design System tests**

Run: `cd frontend && node --test src/components/page-loading.test.js src/pages/DesignSystemPage.test.js src/pages/SettingsPage.test.js`

Expected: all focused tests PASS.

- [ ] **Step 6: Commit the Design System sync**

```bash
git add frontend/src/components/design/SkeletonShowcase.jsx frontend/src/pages/DesignSystemPage.test.js frontend/DESIGN.md
git commit -m "docs: showcase responsive settings skeleton"
```

### Task 3: Verify the complete change

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run all frontend tests**

Run: `cd frontend && npm test`

Expected: all tests PASS.

- [ ] **Step 2: Build the production frontend**

Run: `cd frontend && npm run build`

Expected: Vite exits successfully. Existing third-party `use client`, chart sourcemap, and chunk-size warnings are acceptable; new errors are not.

- [ ] **Step 3: Inspect responsive geometry**

Inspect the Settings skeleton at 390px and 1710px widths. Confirm the compact navigation stays horizontal, the desktop rail occupies 14rem, the content panel remains centered and no wider than 48rem, and no obsolete summary aside or horizontal overflow appears.

- [ ] **Step 4: Check final repository state**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no unintended files.
