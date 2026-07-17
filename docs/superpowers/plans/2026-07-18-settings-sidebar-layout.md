# Settings Sidebar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Settings segmented tabs and summary aside with a responsive settings sidebar and a centered 48rem content surface.

**Architecture:** Add one focused `SettingsNavigation` production component that renders the query-backed destinations once and changes only through responsive layout classes. `SettingsPage` composes that navigation beside its existing profile or master-data content; the design-system showcase reuses the same production component so its documented pattern cannot drift.

**Tech Stack:** React 19, Tailwind CSS v4, Node test runner, Vite

---

## File Structure

- Create `frontend/src/components/settings/SettingsNavigation.jsx`: reusable, accessible settings navigation with mobile-horizontal and desktop-vertical layout.
- Create `frontend/src/components/settings/SettingsNavigation.test.js`: source-contract tests for selection semantics, responsive structure, and absence of boolean presentation props.
- Modify `frontend/src/pages/SettingsPage.jsx`: compose the navigation with a centered active content column and remove the summary aside.
- Modify `frontend/src/pages/SettingsPage.test.js`: protect the approved layout and removed summary content.
- Modify `frontend/src/components/design/MasterDataPatternsShowcase.jsx`: demonstrate the production settings navigation and centered master-data surface.
- Modify `frontend/src/pages/DesignSystemPage.test.js`: protect the settings layout showcase contract.
- Modify `frontend/DESIGN.md`: document the settings workspace layout and responsive rules.

### Task 1: Add the responsive Settings navigation

**Files:**
- Create: `frontend/src/components/settings/SettingsNavigation.jsx`
- Create: `frontend/src/components/settings/SettingsNavigation.test.js`

- [ ] **Step 1: Write the failing navigation contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings navigation adapts from horizontal tabs to a vertical rail", async () => {
  const source = await readFile(new URL("./SettingsNavigation.jsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Navigasi pengaturan"/);
  assert.match(source, /aria-current=\{activeId === item\.id \? "page" : undefined\}/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /md:grid/);
  assert.match(source, /min-h-11/);
  assert.doesNotMatch(source, /isMobile|isDesktop|vertical=/);
});
```

- [ ] **Step 2: Run the test and verify it fails because the component does not exist**

Run: `cd frontend && node --test src/components/settings/SettingsNavigation.test.js`

Expected: FAIL with `ENOENT` for `SettingsNavigation.jsx`.

- [ ] **Step 3: Implement the navigation as one composable structure**

```jsx
import React from "react";

export default function SettingsNavigation({ items, activeId, onChange }) {
  return (
    <nav
      aria-label="Navigasi pengaturan"
      className="flex min-w-0 gap-1 overflow-x-auto pb-1 md:grid md:content-start md:overflow-visible md:pb-0"
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            data-href={item.href}
            aria-current={activeId === item.id ? "page" : undefined}
            className={`min-h-11 flex-none rounded-control border px-3 text-left text-sm font-semibold transition-[background-color,border-color,color] duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:w-full ${
              isActive
                ? "border-border bg-surface-muted text-text"
                : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run the navigation test and verify it passes**

Run: `cd frontend && node --test src/components/settings/SettingsNavigation.test.js`

Expected: PASS, 1 test.

- [ ] **Step 5: Commit the navigation component**

```bash
git add frontend/src/components/settings/SettingsNavigation.jsx frontend/src/components/settings/SettingsNavigation.test.js
git commit -m "feat: add responsive settings navigation"
```

### Task 2: Recompose Settings around the sidebar

**Files:**
- Modify: `frontend/src/pages/SettingsPage.jsx`
- Modify: `frontend/src/pages/SettingsPage.test.js`

- [ ] **Step 1: Extend the Settings page contract test**

Add these assertions to the existing test:

```js
assert.match(source, /SettingsNavigation/);
assert.match(source, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
assert.match(source, /max-w-3xl/);
assert.doesNotMatch(source, /Current store/);
assert.doesNotMatch(source, /Local MVP/);
```

- [ ] **Step 2: Run the Settings test and verify the old layout fails the new contract**

Run: `cd frontend && node --test src/pages/SettingsPage.test.js`

Expected: FAIL because `SettingsNavigation` and the 14rem grid are absent, while `Current store` and `Local MVP` are still present.

- [ ] **Step 3: Replace segmented tabs and the summary aside with the centered workspace**

In `SettingsPage.jsx`, remove `Badge` from the primitive imports and add:

```jsx
import SettingsNavigation from "../components/settings/SettingsNavigation.jsx";
```

Replace the current `<main>` wrapper, inline tab container, inner content wrapper, and entire summary `<aside>` with this structure while keeping the existing conditional profile form and `MasterDataManager` props unchanged inside the content wrapper:

```jsx
<main className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6 lg:p-6">
  <SettingsNavigation items={settingsTabs} activeId={tab} onChange={onTabChange} />

  <div className="mx-auto grid w-full max-w-3xl gap-4">
    {tab === "profile" ? (
      <Panel className="p-4">
        {/* Keep the existing profile form exactly here. */}
      </Panel>
    ) : null}
    {tab === "categories" ? (
      <MasterDataManager
        singularLabel="Kategori"
        pluralLabel="Kategori"
        items={store.categories}
        loading={store.loading.categories}
        onCreate={store.createCategory}
        onRename={store.renameCategory}
        onArchive={store.archiveCategory}
        onRestore={store.restoreCategory}
      />
    ) : null}
    {tab === "units" ? (
      <MasterDataManager
        singularLabel="Satuan"
        pluralLabel="Satuan"
        items={store.units}
        loading={store.loading.units}
        onCreate={store.createUnit}
        onRename={store.renameUnit}
        onArchive={store.archiveUnit}
        onRestore={store.restoreUnit}
      />
    ) : null}
  </div>
</main>
```

Delete the previous `inline-flex` tab markup and delete the `Current store / Local MVP` aside completely.

- [ ] **Step 4: Run focused Settings tests**

Run: `cd frontend && node --test src/components/settings/SettingsNavigation.test.js src/pages/SettingsPage.test.js src/components/settings/MasterDataManager.test.js`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the Settings layout**

```bash
git add frontend/src/pages/SettingsPage.jsx frontend/src/pages/SettingsPage.test.js
git commit -m "fix: center settings in responsive sidebar layout"
```

### Task 3: Sync the production pattern into the design system

**Files:**
- Modify: `frontend/src/components/design/MasterDataPatternsShowcase.jsx`
- Modify: `frontend/src/pages/DesignSystemPage.test.js`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Add a failing design-system contract test**

Extend the existing `DesignSystemPage.test.js` test with:

```js
const showcase = await readFile(
  new URL("../components/design/MasterDataPatternsShowcase.jsx", import.meta.url),
  "utf8",
);
assert.match(showcase, /SettingsNavigation/);
assert.match(showcase, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
assert.match(showcase, /max-w-3xl/);
```

- [ ] **Step 2: Run the test and verify the showcase contract fails**

Run: `cd frontend && node --test src/pages/DesignSystemPage.test.js`

Expected: FAIL because the showcase does not yet import or render `SettingsNavigation`.

- [ ] **Step 3: Update the showcase to consume the production navigation**

Add the production import and sample settings tabs:

```jsx
import SettingsNavigation from "../settings/SettingsNavigation.jsx";

const sampleSettingsTabs = [
  { id: "profile", label: "Profil toko", href: "?tab=profile" },
  { id: "categories", label: "Kategori", href: "?tab=categories" },
  { id: "units", label: "Satuan", href: "?tab=units" },
];
```

Replace the showcase's current two-column manager/select layout with an explicit settings workspace followed by the finite-selector example:

```jsx
<div className="grid min-w-0 gap-4 rounded-card border border-border bg-app-bg p-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
  <SettingsNavigation
    items={sampleSettingsTabs}
    activeId="categories"
    onChange={() => {}}
  />
  <div className="mx-auto w-full max-w-3xl">
    <MasterDataManager
      singularLabel="Kategori"
      pluralLabel="Kategori"
      items={sampleItems}
      onCreate={async (input) => ({ id: "cat-new", name: input.name.trim(), active: true })}
      onRename={async (id, input) => ({ id, name: input.name.trim(), active: true })}
      onArchive={async (id) => ({ id, name: "Minuman", active: false })}
      onRestore={async (id) => ({ id, name: "Lama", active: true })}
    />
  </div>
</div>
<div className="max-w-3xl rounded-card border border-border bg-surface-muted/40 p-3">
  <MasterDataSelectField
    entityLabel="Kategori"
    value="cat-3"
    items={sampleItems}
    onChange={() => {}}
    onCreate={async (input) => ({ id: "cat-new", name: input.name.trim(), active: true })}
    onRestore={async (id) => ({ id, name: "Lama", active: true })}
  />
</div>
```

- [ ] **Step 4: Document the approved Settings pattern**

Replace the opening Master data paragraph in `frontend/DESIGN.md` with:

```md
Settings uses query-backed navigation for `profile`, `categories`, and `units`. At the medium content breakpoint and above, navigation is a quiet 14rem vertical rail and the active surface is centered in the remaining area with a 48rem maximum width. Compact widths use the same navigation items in a horizontal overflow-safe row with targets at least 44px tall. Selection uses a neutral muted surface and `aria-current="page"`, never the primary action treatment. Do not add a redundant store-summary aside beside the editable profile form.

Master-data lists keep active rows visible during mutations, archive is reversible, and no master-data flow hard-deletes records. Finite product selectors offer inline create, current archived values remain visible but cannot be newly assigned, and category/unit lists stay alphabetical. The master-data manager is the primary bordered surface and must not be wrapped in another decorative panel.
```

- [ ] **Step 5: Run design-system and Settings tests**

Run: `cd frontend && node --test src/pages/DesignSystemPage.test.js src/pages/SettingsPage.test.js src/components/settings/SettingsNavigation.test.js src/components/settings/MasterDataManager.test.js`

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit the design-system sync**

```bash
git add frontend/src/components/design/MasterDataPatternsShowcase.jsx frontend/src/pages/DesignSystemPage.test.js frontend/DESIGN.md
git commit -m "docs: add responsive settings workspace pattern"
```

### Task 4: Verify the complete change

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run all frontend tests**

Run: `cd frontend && npm test`

Expected: all tests PASS.

- [ ] **Step 2: Build the frontend production bundle**

Run: `cd frontend && npm run build`

Expected: Vite exits successfully. Existing third-party `use client` and chunk-size warnings are acceptable; new compile errors are not.

- [ ] **Step 3: Inspect compact and desktop widths**

Run: `cd frontend && npm run dev -- --host 127.0.0.1`

Inspect `/settings?tab=categories` at 390px and 1710px viewport widths. Confirm:

- compact navigation is horizontal, reachable, and has no page-level horizontal overflow;
- desktop navigation is a 14rem vertical rail;
- the category manager is centered and does not exceed 48rem;
- every compact navigation target is at least 44px tall;
- `Current store / Local MVP` is absent;
- rename, archive, restore, and add controls remain usable without clipped text.

- [ ] **Step 4: Check the final diff and working tree**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no unintended files.
