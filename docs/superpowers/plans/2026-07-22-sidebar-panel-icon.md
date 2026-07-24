# Sidebar Panel Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sidebar-collapse control use the supplied panel-left icon and document that shared navigation convention.

**Architecture:** The existing `Icon` adapter remains the sole icon-rendering boundary. Its `sidebar` entry changes from the generic Heroicon mapping to the supplied inline SVG geometry, while `AppShell` retains state, labels, and rotation unchanged. The design-system showcase and guide describe the same convention.

**Tech Stack:** React, existing JSX icon adapter, Node built-in test runner, Vite build.

---

### Task 1: Add a regression test for the supplied panel-left geometry

**Files:**
- Modify: `frontend/src/components/AppShell.test.js`
- Test: `frontend/src/components/AppShell.test.js`

- [ ] **Step 1: Write the failing test**

Add this test after the icon-rail test:

```js
test("sidebar collapse uses the supplied panel-left icon", async () => {
  const icons = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");

  assert.match(icons, /sidebar:\s*\(\s*<>\s*<rect x="3" y="3" width="18" height="18" rx="2"\s*\/?>\s*<path d="M9 3v18"\s*\/?>/s);
  assert.doesNotMatch(icons, /sidebar:\s*RectangleStackIcon/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `./node_modules/.bin/tsx --test src/components/AppShell.test.js`

Expected: FAIL because `sidebar` currently resolves to `RectangleStackIcon` rather than the panel-left SVG paths.

- [ ] **Step 3: Implement the minimal shared icon change**

In `frontend/src/components/primitives.jsx`, remove `RectangleStackIcon` from the Heroicons import and change the `sidebar` entry from the Heroicons mapping to this existing-adapter SVG fragment:

```jsx
sidebar: (
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18" />
  </>
),
```

Keep `AppShell.jsx` unchanged so its existing rotation and accessible state continue to govern the icon.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `./node_modules/.bin/tsx --test src/components/AppShell.test.js`

Expected: PASS with no failing subtests.

### Task 2: Synchronize the design-system documentation

**Files:**
- Modify: `frontend/src/components/design/NavigationPatternsShowcase.jsx`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Update the showcase copy**

Extend the `Desktop rail stays available` description to state that the control uses a panel-left icon and rotates to represent the current rail state.

- [ ] **Step 2: Update the design guide**

In `### Navigation and entry points`, add that the labeled desktop sidebar control uses the panel-left icon and rotates between its collapsed and expanded states; preserve the requirement for accessible naming and tooltip support.

- [ ] **Step 3: Extend the focused source test**

Add these assertions to `sidebar collapse uses the supplied panel-left icon`:

```js
const showcase = await readFile(new URL("./design/NavigationPatternsShowcase.jsx", import.meta.url), "utf8");
const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

assert.match(showcase, /panel-left icon/i);
assert.match(designGuide, /panel-left icon/i);
```

- [ ] **Step 4: Run the focused test suite**

Run: `./node_modules/.bin/tsx --test src/components/AppShell.test.js`

Expected: PASS with no failing subtests.

### Task 3: Verify the frontend build

**Files:**
- Verify: `frontend/src/components/primitives.jsx`
- Verify: `frontend/src/components/AppShell.jsx`
- Verify: `frontend/src/components/design/NavigationPatternsShowcase.jsx`
- Verify: `frontend/DESIGN.md`

- [ ] **Step 1: Run the production build**

Run: `npm run build`

Working directory: `frontend/`

Expected: Vite completes successfully with exit code `0`.

- [ ] **Step 2: Review the scoped diff**

Run: `git diff -- frontend/src/components/primitives.jsx frontend/src/components/AppShell.test.js frontend/src/components/design/NavigationPatternsShowcase.jsx frontend/DESIGN.md`

Expected: the only new scoped behavior is the panel-left sidebar icon; existing unrelated worktree changes remain intact.
