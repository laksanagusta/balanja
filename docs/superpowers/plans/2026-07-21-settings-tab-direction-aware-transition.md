# Settings Active-Pill Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incorrect Settings content slide with a measured active-pill transition matching the category tabs on the Kasir page.

**Architecture:** `SettingsNavigation` owns one decorative indicator and measures the active button through the refs it already maintains. Settings-specific CSS custom properties position and size that indicator in both the compact horizontal tabs and desktop vertical rail; Settings content returns to immediate rendering.

**Tech Stack:** React 19, browser layout metrics, `ResizeObserver`, CSS custom properties and transitions, Node test runner, Vite.

---

### Task 1: Remove the Incorrect Content Transition

**Files:**
- Modify: `frontend/src/pages/SettingsPage.test.js`
- Modify: `frontend/src/pages/SettingsPage.jsx`
- Delete: `frontend/src/pages/settings-motion.js`
- Delete: `frontend/src/pages/settings-motion.test.js`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Replace the content-motion source contract with a failing removal contract**

Add these assertions to `SettingsPage.test.js` after the responsive workspace assertions, replacing the assertions for Motion imports, refs, directional offsets, and spring settings:

```js
assert.doesNotMatch(source, /motion\/react/);
assert.doesNotMatch(source, /getSettingsTabDirection/);
assert.doesNotMatch(source, /<motion\.div/);
assert.doesNotMatch(css, /\.settings-content\s*\{[\s\S]*overflow-x:\s*clip/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd frontend && node --test src/pages/SettingsPage.test.js`

Expected: FAIL because `SettingsPage.jsx` still imports Motion and renders `motion.div`.

- [ ] **Step 3: Restore immediate Settings content rendering**

In `SettingsPage.jsx`, remove the Motion and `settings-motion.js` imports, the direction/reduced-motion refs and calculations, and the effect that updates those refs. Replace the keyed `<motion.div>` wrapper with a plain fragment:

```jsx
<>
  {tab === "profile" ? <Panel>{/* existing profile form unchanged */}</Panel> : null}
  {tab === "categories" ? <MasterDataManager {...existingCategoryProps} /> : null}
  {tab === "units" ? <MasterDataManager {...existingUnitProps} /> : null}
</>
```

Delete `settings-motion.js` and `settings-motion.test.js`. Remove `overflow-x: clip` from `.settings-content` because content no longer translates beyond its bounds.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `cd frontend && node --test src/pages/SettingsPage.test.js`

Expected: PASS.

- [ ] **Step 5: Preserve overlapping worktree changes**

Run: `git diff -- frontend/src/pages/SettingsPage.jsx frontend/src/pages/SettingsPage.test.js frontend/src/index.css`

Expected: the diff includes pre-existing responsive Settings work as well as this correction. Do not stage or commit these overlapping files independently.

### Task 2: Add the Measured Settings Active Pill

**Files:**
- Modify: `frontend/src/components/settings/SettingsNavigation.test.js`
- Modify: `frontend/src/components/settings/SettingsNavigation.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Write the failing indicator contract**

Add these assertions to `SettingsNavigation.test.js`:

```js
assert.match(source, /React\.useLayoutEffect/);
assert.match(source, /ResizeObserver/);
assert.match(source, /activeItem\.offsetLeft/);
assert.match(source, /activeItem\.offsetTop/);
assert.match(source, /activeItem\.offsetWidth/);
assert.match(source, /activeItem\.offsetHeight/);
assert.match(source, /aria-hidden="true"/);
assert.match(source, /settings-navigation-indicator/);
assert.match(source, /--settings-indicator-x/);
assert.match(source, /--settings-indicator-y/);
assert.match(css, /\.settings-navigation-indicator\s*\{[\s\S]*transition-property:\s*transform, width, height, opacity/);
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.settings-navigation-indicator[\s\S]*transition:\s*none/);
```

- [ ] **Step 2: Run the navigation test and verify RED**

Run: `cd frontend && node --test src/components/settings/SettingsNavigation.test.js`

Expected: FAIL because the indicator and measurement lifecycle do not exist.

- [ ] **Step 3: Implement active-item measurement**

In `SettingsNavigation.jsx`, add indicator state and a stable update callback:

```jsx
const [indicator, setIndicator] = React.useState({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  ready: false,
});

const updateIndicator = React.useCallback(() => {
  const activeItem = itemRefs.current.get(activeId);
  if (!activeItem) return;
  const next = {
    left: activeItem.offsetLeft,
    top: activeItem.offsetTop,
    width: activeItem.offsetWidth,
    height: activeItem.offsetHeight,
    ready: true,
  };
  setIndicator((current) => (
    current.left === next.left
      && current.top === next.top
      && current.width === next.width
      && current.height === next.height
      && current.ready
      ? current
      : next
  ));
}, [activeId]);
```

Replace the current scroll effect with a layout effect that scrolls the active item, measures it, observes both the navigation and active item, and listens for window resize:

```jsx
React.useLayoutEffect(() => {
  const navigation = navigationRef.current;
  const activeItem = itemRefs.current.get(activeId);
  if (!navigation || !activeItem) return undefined;

  if (navigation.scrollWidth > navigation.clientWidth) {
    activeItem.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  updateIndicator();

  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateIndicator);
  observer?.observe(navigation);
  observer?.observe(activeItem);
  window.addEventListener("resize", updateIndicator);
  return () => {
    observer?.disconnect();
    window.removeEventListener("resize", updateIndicator);
  };
}, [activeId, items.length, updateIndicator]);
```

- [ ] **Step 4: Render the decorative pill beneath stationary labels**

Insert this as the first child of the navigation:

```jsx
<span
  aria-hidden="true"
  className="settings-navigation-indicator"
  style={{
    "--settings-indicator-x": `${indicator.left}px`,
    "--settings-indicator-y": `${indicator.top}px`,
    "--settings-indicator-width": `${indicator.width}px`,
    "--settings-indicator-height": `${indicator.height}px`,
    opacity: indicator.ready ? 1 : 0,
  }}
/>
```

Keep each button `position: relative` with `z-index: 1`. Remove the active button's own background and border surface, leaving its active text color and semantic state so the shared pill is the only selected surface.

- [ ] **Step 5: Add responsive indicator styling**

Extend the Settings CSS with:

```css
.settings-navigation {
  position: relative;
}

.settings-navigation-indicator {
  position: absolute;
  z-index: 0;
  left: 0;
  top: 0;
  width: var(--settings-indicator-width, 0px);
  height: var(--settings-indicator-height, 0px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  pointer-events: none;
  transform: translate3d(
    var(--settings-indicator-x, 0px),
    var(--settings-indicator-y, 0px),
    0
  );
  transition-property: transform, width, height, opacity;
  transition-duration: var(--duration-base);
  transition-timing-function: var(--ease-standard);
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .settings-navigation-indicator {
    transition: none;
  }
}
```

- [ ] **Step 6: Run focused Settings tests and verify GREEN**

Run: `cd frontend && node --test src/components/settings/SettingsNavigation.test.js src/pages/SettingsPage.test.js`

Expected: PASS.

- [ ] **Step 7: Preserve overlapping worktree changes**

Run: `git diff -- frontend/src/components/settings/SettingsNavigation.jsx frontend/src/components/settings/SettingsNavigation.test.js frontend/src/index.css`

Expected: the diff contains existing responsive work. Do not stage or commit these overlapping files independently.

### Task 3: Correct the Design-System Contract

**Files:**
- Modify: `frontend/src/pages/DesignSystemPage.test.js`
- Modify: `frontend/src/components/design/MasterDataPatternsShowcase.jsx`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Write the failing design-system wording contract**

Replace the content-transition assertions in `DesignSystemPage.test.js` with:

```js
assert.match(showcase, /sliding active pill/i);
assert.match(showcase, /reduced motion/i);
assert.doesNotMatch(showcase, /content.*transition/i);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd frontend && node --test src/pages/DesignSystemPage.test.js`

Expected: FAIL because the showcase still documents a direction-aware content transition.

- [ ] **Step 3: Update showcase and design documentation**

Change the Settings showcase copy to state that navigation uses a measured sliding active pill matching the Kasir category tabs, with an immediate position update under reduced motion. In `frontend/DESIGN.md`, replace the content-slide sentence with this contract:

```md
Settings navigation uses one measured sliding active pill behind stationary labels, matching the Kasir category tabs. The indicator adapts to both horizontal tabs and the vertical rail, while reduced motion disables its transition. Settings content itself changes immediately without motion.
```

- [ ] **Step 4: Run focused design-system tests and verify GREEN**

Run: `cd frontend && node --test src/pages/DesignSystemPage.test.js src/components/settings/SettingsNavigation.test.js src/pages/SettingsPage.test.js`

Expected: PASS.

- [ ] **Step 5: Preserve overlapping worktree changes**

Run: `git diff -- frontend/src/pages/DesignSystemPage.test.js frontend/src/components/design/MasterDataPatternsShowcase.jsx frontend/DESIGN.md`

Expected: these files contain other user changes. Do not stage or commit them independently.

### Task 4: Final Verification

**Files:**
- Verify only; no source changes expected.

- [ ] **Step 1: Check target diffs for whitespace errors**

Run:

```bash
git diff --check -- \
  frontend/src/pages/SettingsPage.jsx \
  frontend/src/pages/SettingsPage.test.js \
  frontend/src/components/settings/SettingsNavigation.jsx \
  frontend/src/components/settings/SettingsNavigation.test.js \
  frontend/src/components/design/MasterDataPatternsShowcase.jsx \
  frontend/src/pages/DesignSystemPage.test.js \
  frontend/src/index.css \
  frontend/DESIGN.md
```

Expected: exit 0 with no output.

- [ ] **Step 2: Run the complete frontend suite**

Run: `cd frontend && npm test -- --test-reporter=dot`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && npm run build`

Expected: exit 0. Existing chart sourcemap, module-level `"use client"`, and bundle-size warnings may remain.

- [ ] **Step 4: Inspect final repository state**

Run: `git status --short --branch`

Expected: the Settings implementation remains uncommitted alongside the user's pre-existing dirty worktree changes; only the approved spec correction is committed.
