# Data Table Scroll Edge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every shared operational data table horizontally scrollable while conditionally showing light, translucent, lightly blurred inline-edge cues for hidden columns.

**Architecture:** A pure `getScrollEdgeState` helper converts scroll metrics into inline-start/inline-end visibility and receives direct unit coverage. A focused `ScrollEdge` component owns measurement, resize observation, accessibility, and decorative layers; `DataTable` composes it by default without adding boolean display props or changing existing page call sites.

**Tech Stack:** React 19, JavaScript modules, Tailwind CSS v4 plus shared CSS components, Node test runner, Vite.

---

## File Map

- Create `frontend/src/components/scroll-edge.js`: pure scroll-metric calculation with a fractional-pixel tolerance.
- Create `frontend/src/components/scroll-edge.test.js`: direct state tests for no overflow, start, middle, and end.
- Create `frontend/src/components/ScrollEdge.jsx`: reusable composed scroll viewport with internal observer state and decorative edge layers.
- Modify `frontend/src/components/primitives.jsx:434-511`: compose every `DataTable` inside `ScrollEdge` and remove its local overflow wrapper.
- Modify `frontend/src/components/OperationalTables.test.js`: enforce the shared composition, accessibility contract, observer fallback, absence of a boolean display prop, and CSS accessibility fallbacks.
- Modify `frontend/src/index.css`: define the 28px light-translucent, 6px-blurred edge material and preference fallbacks.
- Modify `frontend/src/components/design/DataTableShowcase.jsx:145-160`: add a deliberately constrained wide-table example and inspection guidance.
- Modify `frontend/src/components/design/DataTableShowcase.test.js`: verify the showcase exposes the shared overflow pattern.
- Modify `frontend/DESIGN.md:33-35`: define the default compact-table overflow and scroll-edge contract.

### Task 1: Pure Scroll-Edge State

**Files:**
- Create: `frontend/src/components/scroll-edge.js`
- Create: `frontend/src/components/scroll-edge.test.js`

- [ ] **Step 1: Write the failing state tests**

Create `frontend/src/components/scroll-edge.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { getScrollEdgeState } from "./scroll-edge.js";

test("scroll edge state hides both edges without overflow", () => {
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 0, clientWidth: 480, scrollWidth: 480 }),
    { inlineStart: false, inlineEnd: false },
  );
});

test("scroll edge state reveals only hidden directions", () => {
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 0, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: false, inlineEnd: true },
  );
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 180, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: true, inlineEnd: true },
  );
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 400, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: true, inlineEnd: false },
  );
});

test("scroll edge state tolerates fractional endpoint metrics", () => {
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 399.5, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: true, inlineEnd: false },
  );
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
cd frontend
node --test src/components/scroll-edge.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scroll-edge.js`.

- [ ] **Step 3: Implement the minimal pure calculation**

Create `frontend/src/components/scroll-edge.js`:

```js
const EDGE_TOLERANCE = 1;

export function getScrollEdgeState(
  { scrollLeft = 0, clientWidth = 0, scrollWidth = 0 },
  tolerance = EDGE_TOLERANCE,
) {
  const hasOverflow = scrollWidth - clientWidth > tolerance;
  if (!hasOverflow) {
    return { inlineStart: false, inlineEnd: false };
  }

  return {
    inlineStart: scrollLeft > tolerance,
    inlineEnd: scrollLeft + clientWidth < scrollWidth - tolerance,
  };
}
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```bash
cd frontend
node --test src/components/scroll-edge.test.js
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the pure state unit**

```bash
git add frontend/src/components/scroll-edge.js frontend/src/components/scroll-edge.test.js
git commit -m "test: define data table scroll edge state"
```

### Task 2: Shared ScrollEdge Composition

**Files:**
- Create: `frontend/src/components/ScrollEdge.jsx`
- Modify: `frontend/src/components/primitives.jsx:434-511`
- Modify: `frontend/src/components/OperationalTables.test.js`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Write the failing shared-component contract test**

Append this test to `frontend/src/components/OperationalTables.test.js`:

```js
test("shared tables compose accessible translucent scroll edges", async () => {
  const primitives = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  const scrollEdge = await readFile(new URL("./ScrollEdge.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(primitives, /<ScrollEdge>[\s\S]*<table/);
  assert.doesNotMatch(primitives, /showEdgeBlur|edgeBlurEnabled/);
  assert.match(scrollEdge, /getScrollEdgeState/);
  assert.match(scrollEdge, /ResizeObserver/);
  assert.match(scrollEdge, /window\.addEventListener\("resize"/);
  assert.match(scrollEdge, /aria-hidden="true"/);
  assert.match(scrollEdge, /data-scroll-edge="inline-start"/);
  assert.match(scrollEdge, /data-scroll-edge="inline-end"/);
  assert.match(css, /\.scroll-edge-overlay/);
  assert.match(css, /inline-size:\s*28px/);
  assert.match(css, /backdrop-filter:\s*blur\(6px\)/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*\.scroll-edge-overlay/);
  assert.match(css, /@media \(prefers-contrast: more\)[\s\S]*\.scroll-edge-overlay/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.scroll-edge-overlay/);
});
```

- [ ] **Step 2: Run the focused contract test and confirm it fails**

Run:

```bash
cd frontend
node --test src/components/OperationalTables.test.js
```

Expected: the existing tests PASS and the new test FAILS because `ScrollEdge.jsx` does not exist.

- [ ] **Step 3: Create the self-contained ScrollEdge component**

Create `frontend/src/components/ScrollEdge.jsx`:

```jsx
import React from "react";
import { getScrollEdgeState } from "./scroll-edge.js";

const INITIAL_EDGES = { inlineStart: false, inlineEnd: false };

export function ScrollEdge({ children, className = "" }) {
  const viewportRef = React.useRef(null);
  const [edges, setEdges] = React.useState(INITIAL_EDGES);

  const measure = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const next = getScrollEdgeState(viewport);
    setEdges((current) => (
      current.inlineStart === next.inlineStart && current.inlineEnd === next.inlineEnd
        ? current
        : next
    ));
  }, []);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    measure();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measure);
    observer?.observe(viewport);
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div className={`scroll-edge relative min-w-0 ${className}`}>
      <div
        ref={viewportRef}
        className="scroll-edge-viewport w-full overflow-x-auto"
        onScroll={measure}
      >
        {children}
      </div>
      <span
        aria-hidden="true"
        data-scroll-edge="inline-start"
        data-visible={edges.inlineStart ? "true" : "false"}
        className="scroll-edge-overlay scroll-edge-overlay-start"
      />
      <span
        aria-hidden="true"
        data-scroll-edge="inline-end"
        data-visible={edges.inlineEnd ? "true" : "false"}
        className="scroll-edge-overlay scroll-edge-overlay-end"
      />
    </div>
  );
}
```

- [ ] **Step 4: Compose ScrollEdge inside DataTable**

In `frontend/src/components/primitives.jsx`, add the import near the other component imports:

```jsx
import { ScrollEdge } from "./ScrollEdge.jsx";
```

Replace the complete `DataTable` function with:

```jsx
export function DataTable({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  className = "",
}) {
  return (
    <div className={`w-full ${className}`}>
      <ScrollEdge>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={col.sortable && sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  className={`h-11 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(col.key)}
                      className={`inline-flex h-8 w-full items-center gap-1.5 rounded-control font-semibold uppercase tracking-[0.08em] transition-[background-color,color,transform] duration-fast ease-standard hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] ${
                        sortKey === col.key ? "text-text" : "text-text-subtle"
                      } ${col.align === "right" ? "justify-end" : "justify-start"}`}
                    >
                      <span>{col.label}</span>
                      <Icon
                        name="chevron"
                        className={`size-3.5 shrink-0 transition-transform duration-base ease-standard motion-reduce:transition-none ${
                          sortKey === col.key
                            ? sortDir === "asc"
                              ? "rotate-180 text-accent"
                              : "rotate-0 text-accent"
                            : "rotate-0 text-text-subtle opacity-45"
                        }`}
                      />
                    </button>
                  ) : (
                    <span
                      className={`inline-flex h-8 w-full items-center ${
                        col.align === "right" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {col.label}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={`border-b border-border transition last:border-b-0 hover:bg-surface-muted/60 ${
                  i % 2 === 1 ? "bg-surface-muted/30" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`h-11 px-3 text-text ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollEdge>
    </div>
  );
}
```

- [ ] **Step 5: Add the light translucent material and preference fallbacks**

Inside `@layer components` in `frontend/src/index.css`, add:

```css
.scroll-edge-viewport {
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}

.scroll-edge-overlay {
  position: absolute;
  z-index: 1;
  inset-block: 0;
  inline-size: 28px;
  pointer-events: none;
  opacity: 0;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.scroll-edge-overlay[data-visible="true"] {
  opacity: 1;
}

.scroll-edge-overlay-start {
  inset-inline-start: 0;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--color-surface) 82%, transparent),
    color-mix(in srgb, var(--color-surface) 8%, transparent)
  );
}

.scroll-edge-overlay-end {
  inset-inline-end: 0;
  background: linear-gradient(
    to left,
    color-mix(in srgb, var(--color-surface) 82%, transparent),
    color-mix(in srgb, var(--color-surface) 8%, transparent)
  );
}
```

Extend the existing preference queries with:

```css
@media (prefers-reduced-motion: reduce) {
  .scroll-edge-overlay {
    transition: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .scroll-edge-overlay {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .scroll-edge-overlay-start {
    background: linear-gradient(to right, var(--color-surface), transparent);
  }

  .scroll-edge-overlay-end {
    background: linear-gradient(to left, var(--color-surface), transparent);
  }
}

@media (prefers-contrast: more) {
  .scroll-edge-overlay {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .scroll-edge-overlay-start {
    background: linear-gradient(to right, var(--color-surface) 55%, transparent);
  }

  .scroll-edge-overlay-end {
    background: linear-gradient(to left, var(--color-surface) 55%, transparent);
  }
}
```

- [ ] **Step 6: Run focused behavior and contract tests**

Run:

```bash
cd frontend
node --test src/components/scroll-edge.test.js src/components/OperationalTables.test.js
```

Expected: all focused tests PASS.

- [ ] **Step 7: Commit the shared component**

```bash
git add frontend/src/components/scroll-edge.js frontend/src/components/scroll-edge.test.js frontend/src/components/ScrollEdge.jsx frontend/src/components/primitives.jsx frontend/src/components/OperationalTables.test.js frontend/src/index.css
git commit -m "feat: add shared data table scroll edges"
```

### Task 3: Design-System Showcase and Contract

**Files:**
- Modify: `frontend/src/components/design/DataTableShowcase.test.js`
- Modify: `frontend/src/components/design/DataTableShowcase.jsx:145-160`
- Modify: `frontend/DESIGN.md:33-35`

- [ ] **Step 1: Write the failing showcase and documentation test**

Append this test to `frontend/src/components/design/DataTableShowcase.test.js`:

```js
test("design system documents conditional translucent table scroll edges", async () => {
  const source = await readFile(new URL("./DataTableShowcase.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");

  assert.match(source, /max-w-xl/);
  assert.match(source, /Geser horizontal/);
  assert.match(source, /blur ringan/);
  assert.match(design, /light-translucent scroll edges/i);
  assert.match(design, /inline-start/);
  assert.match(design, /inline-end/);
});
```

- [ ] **Step 2: Run the showcase test and confirm it fails**

Run:

```bash
cd frontend
node --test src/components/design/DataTableShowcase.test.js
```

Expected: the existing pagination test PASSES and the new scroll-edge test FAILS.

- [ ] **Step 3: Add a constrained shared-table example**

In `frontend/src/components/design/DataTableShowcase.jsx`, replace only the wrapper around the inventory `DataTable` with:

```jsx
<div className="mt-4 max-w-xl">
  <p className="mb-2 text-xs leading-5 text-text-muted">
    Geser horizontal untuk melihat kolom tersembunyi. Blur ringan hanya muncul pada sisi yang masih memiliki konten.
  </p>
  <div className="grid rounded-panel border border-border bg-surface p-0">
    <DataTable
      columns={inventoryCols}
      data={sortedInventory}
      sortKey={inventorySortKey}
      sortDir={inventorySortDir}
      onSort={handleInventorySort}
      className="pb-2"
    />
  </div>
</div>
```

Do not change the production page call sites; they inherit the shared behavior automatically.

- [ ] **Step 4: Synchronize the behavior into DESIGN.md**

Add this paragraph immediately after the operational-table layout rule in `frontend/DESIGN.md`:

```markdown
Operational tables remain tables on compact screens and use native horizontal scrolling when their columns exceed the available inline size. The shared table viewport communicates hidden columns with conditional 28px light-translucent scroll edges and a restrained 6px blur: inline-end appears while content remains ahead, inline-start appears after scrolling away from the origin, and each edge disappears when its boundary is reached. Edge materials never intercept input or hide the native scrollbar; reduced-transparency and increased-contrast contexts replace blur with a stronger surface fade, while reduced-motion contexts remove the opacity transition.
```

- [ ] **Step 5: Run the showcase and operational contract tests**

Run:

```bash
cd frontend
node --test src/components/design/DataTableShowcase.test.js src/components/OperationalTables.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the design-system synchronization**

```bash
git add frontend/src/components/design/DataTableShowcase.jsx frontend/src/components/design/DataTableShowcase.test.js frontend/DESIGN.md
git commit -m "docs: showcase data table scroll edges"
```

### Task 4: Full Verification and Visual Inspection

**Files:**
- Verify only; fix only files already listed above if a check exposes a defect.

- [ ] **Step 1: Run the complete frontend test suite**

Run:

```bash
cd frontend
npm test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite exits successfully and emits the production bundle without compilation errors.

- [ ] **Step 3: Inspect the constrained design-system example**

Run the approved frontend development server command, open `/design-system`, and inspect the constrained inventory table at compact and desktop widths. Confirm:

- At the initial position, only the light inline-end overlay appears.
- Mid-scroll, both overlays appear.
- At the endpoint, only inline-start remains.
- With no overflow, neither overlay appears.
- The 28px fade is light and transparent, the 6px blur is restrained, and text remains legible.
- The native horizontal scrollbar, sorting buttons, text selection, and row content remain usable.

- [ ] **Step 4: Inspect production consumers**

Visit Produk, Stok, Transaksi, and a sales-report breakdown table at compact and desktop widths. Confirm every shared table inherits the effect without page-specific props, horizontal page overflow, clipped row actions, or changes to pagination and sorting.

- [ ] **Step 5: Inspect accessibility preferences**

Emulate reduced motion, reduced transparency, and increased contrast. Confirm opacity no longer transitions under reduced motion; blur is removed under reduced transparency and increased contrast; a visible surface fade still indicates hidden columns.

- [ ] **Step 6: Review the final diff and commit any verification fix**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. If verification required a correction, stage only the scroll-edge files changed by that correction and commit:

```bash
git commit -m "fix: refine data table scroll edge behavior"
```

If no correction was needed, do not create an empty commit.
