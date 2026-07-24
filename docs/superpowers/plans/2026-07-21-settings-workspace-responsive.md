# Responsive Settings Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the complete Settings workspace respond to its actual content width, with overflow-safe navigation, profile controls, master-data rows, and loading states from 320px through desktop widths.

**Architecture:** Add a named `settings-workspace` inline-size container and keep responsive geometry in focused component classes inside `frontend/src/index.css`, matching the repository's existing POS container-query pattern. Production components and the design-system showcase share those classes so the live page, skeleton, and documentation cannot drift. Data loading, mutations, routes, and tab semantics remain unchanged.

**Tech Stack:** React 19, Tailwind CSS 4.1, CSS named container queries, Vite 7, Node's built-in test runner.

---

## File Map

- Modify `frontend/src/index.css`: own the named Settings and master-data containment contexts, compact defaults, content breakpoints, wrap protection, and compact touch-target rules.
- Modify `frontend/src/pages/SettingsPage.jsx`: separate the scroll/container shell from the responsive grid, add stable responsive hooks, and make profile controls compact-safe.
- Modify `frontend/src/pages/SettingsPage.test.js`: assert page-shell containment and removal of viewport-controlled workspace geometry.
- Modify `frontend/src/components/settings/SettingsNavigation.jsx`: use shared navigation classes and keep the selected compact tab visible.
- Modify `frontend/src/components/settings/SettingsNavigation.test.js`: assert shared class usage, active-tab scrolling, semantics, and absence of viewport variants.
- Modify `frontend/src/components/settings/MasterDataManager.jsx`: add the component containment boundary and responsive row/action hooks without changing mutations.
- Modify `frontend/src/components/settings/MasterDataManager.test.js`: assert wrap-safe identities, stacked action hooks, and compact touch targets.
- Modify `frontend/src/components/page-loading.jsx`: mirror settled Settings geometry and master-data stacking in the skeleton.
- Modify `frontend/src/components/page-loading.test.js`: assert skeleton parity with the production container contract.
- Modify `frontend/src/components/design/MasterDataPatternsShowcase.jsx`: render the production components inside the same named container and describe the responsive contract.
- Modify `frontend/src/pages/DesignSystemPage.test.js`: protect production-backed showcase parity.
- Modify `frontend/DESIGN.md`: make container-aware Settings behavior part of the design-system source of truth.

The listed source files already contain unrelated local changes. During execution, inspect each diff before and after editing, preserve all existing hunks, and do not stage or commit overlapping implementation files unless their ownership is unambiguous.

### Task 1: Establish the content-aware Settings shell

**Files:**
- Modify: `frontend/src/pages/SettingsPage.test.js`
- Modify: `frontend/src/pages/SettingsPage.jsx:76-186`
- Modify: `frontend/src/index.css` inside `@layer components`

- [ ] **Step 1: Write the failing page-shell test**

Extend the existing test in `frontend/src/pages/SettingsPage.test.js` with the CSS read and these assertions:

```js
const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

assert.match(source, /className="settings-workspace min-h-0 flex-1 overflow-auto"/);
assert.match(source, /className="settings-workspace-layout"/);
assert.doesNotMatch(source, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
assert.match(css, /\.settings-workspace\s*\{[\s\S]*container-name:\s*settings-workspace;[\s\S]*container-type:\s*inline-size;/);
assert.match(css, /@container settings-workspace \(min-width:\s*760px\)/);
assert.match(css, /grid-template-columns:\s*14rem minmax\(0,\s*1fr\)/);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
cd frontend
node --test src/pages/SettingsPage.test.js
```

Expected: FAIL because `settings-workspace`, `settings-workspace-layout`, and the named container CSS do not exist yet.

- [ ] **Step 3: Add the Settings containment and layout CSS**

Inside `@layer components` in `frontend/src/index.css`, immediately before the existing `.retail-pos-query` rules, add:

```css
  .settings-workspace {
    container-name: settings-workspace;
    container-type: inline-size;
  }

  .settings-workspace-layout {
    display: grid;
    min-inline-size: 0;
    align-content: start;
    gap: 1rem;
    padding: 1rem;
  }

  .settings-content {
    min-inline-size: 0;
  }

  .settings-form-actions {
    display: grid;
  }

  .settings-form-actions > * {
    inline-size: 100%;
    min-block-size: 2.75rem;
  }

  @container settings-workspace (min-width: 480px) {
    .settings-form-actions {
      justify-items: end;
    }

    .settings-form-actions > * {
      inline-size: auto;
      min-block-size: 2.25rem;
    }
  }

  @container settings-workspace (min-width: 760px) {
    .settings-workspace-layout {
      grid-template-columns: 14rem minmax(0, 1fr);
      gap: 1.5rem;
      padding: 1.5rem;
    }
  }
```

- [ ] **Step 4: Restructure the page shell and compact profile actions**

Make four mechanical JSX edits; do not change any profile or master-data props, handlers, branches, or ordering:

1. Replace `<main className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6 lg:p-6">` with `<main className="settings-workspace min-h-0 flex-1 overflow-auto">`.
2. Insert `<div className="settings-workspace-layout">` immediately after that opening `<main>`.
3. Replace `<div className="mx-auto grid w-full max-w-3xl gap-4">` with `<div className="settings-content mx-auto grid w-full max-w-3xl gap-4">`.
4. Insert one `</div>` after the active-content wrapper's closing tag and before `</main>` so it closes `settings-workspace-layout`.

Change the tax label and save wrapper to:

```jsx
<label className="flex min-h-11 min-w-0 items-center justify-between gap-4 text-sm font-semibold text-text">
```

```jsx
<div className="settings-form-actions">
  <Button type="submit" variant="primary" disabled={isSaving}>
    <Icon name="check" className="size-4" />
    {isSaving ? "Saving..." : "Save settings"}
  </Button>
</div>
```

- [ ] **Step 5: Run the page-shell test and verify success**

Run:

```bash
cd frontend
node --test src/pages/SettingsPage.test.js
```

Expected: PASS.

### Task 2: Make Settings navigation container-responsive and keep the active tab visible

**Files:**
- Modify: `frontend/src/components/settings/SettingsNavigation.test.js`
- Modify: `frontend/src/components/settings/SettingsNavigation.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Write the failing navigation contract test**

Replace viewport-specific assertions in `SettingsNavigation.test.js` with:

```js
assert.match(source, /className="settings-navigation"/);
assert.match(source, /settings-navigation-item/);
assert.match(source, /scrollWidth > navigation\.clientWidth/);
assert.match(source, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
assert.doesNotMatch(source, /md:grid|md:w-full/);

const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");
assert.match(css, /\.settings-navigation\s*\{[\s\S]*overflow-x:\s*auto/);
assert.match(css, /@container settings-workspace \(min-width:\s*760px\)[\s\S]*\.settings-navigation\s*\{[\s\S]*display:\s*grid/);
assert.match(css, /\.settings-navigation-item\s*\{[\s\S]*min-block-size:\s*2\.75rem/);
```

Leave the file's semantic assertions for `aria-label` and `aria-current` in place before the new assertions.

- [ ] **Step 2: Run the navigation test and verify failure**

Run:

```bash
cd frontend
node --test src/components/settings/SettingsNavigation.test.js
```

Expected: FAIL because the component still uses viewport variants and has no active-tab visibility effect.

- [ ] **Step 3: Add shared navigation CSS**

Add beside the Settings workspace rules in `frontend/src/index.css`:

```css
  .settings-navigation {
    display: flex;
    min-inline-size: 0;
    align-content: start;
    gap: 0.25rem;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    padding-block-end: 0.25rem;
    scrollbar-width: thin;
  }

  .settings-navigation-item {
    min-block-size: 2.75rem;
    flex: none;
    white-space: nowrap;
  }
```

Extend the existing `@container settings-workspace (min-width: 760px)` rule with:

```css
    .settings-navigation {
      display: grid;
      overflow: visible;
      padding-block-end: 0;
    }

    .settings-navigation-item {
      inline-size: 100%;
    }
```

- [ ] **Step 4: Implement active-tab visibility without changing selection behavior**

Update `SettingsNavigation.jsx` to:

```jsx
import React from "react";

export default function SettingsNavigation({ items, activeId, onChange }) {
  const navigationRef = React.useRef(null);
  const itemRefs = React.useRef(new Map());

  React.useEffect(() => {
    const navigation = navigationRef.current;
    const activeItem = itemRefs.current.get(activeId);
    if (navigation && activeItem && navigation.scrollWidth > navigation.clientWidth) {
      activeItem.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activeId]);

  return (
    <nav ref={navigationRef} aria-label="Navigasi pengaturan" className="settings-navigation">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            ref={(node) => {
              if (node) itemRefs.current.set(item.id, node);
              else itemRefs.current.delete(item.id);
            }}
            type="button"
            onClick={() => onChange(item.id)}
            data-href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`settings-navigation-item rounded-control border px-3 text-left text-sm font-semibold transition-[background-color,border-color,color] duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
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

- [ ] **Step 5: Run the navigation and page tests**

Run:

```bash
cd frontend
node --test src/components/settings/SettingsNavigation.test.js src/pages/SettingsPage.test.js
```

Expected: both tests PASS.

### Task 3: Make the master-data manager wrap-safe and touch-safe

**Files:**
- Modify: `frontend/src/components/settings/MasterDataManager.test.js`
- Modify: `frontend/src/components/settings/MasterDataManager.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Write the failing master-data responsive test**

Append to `MasterDataManager.test.js`:

```js
test("master data manager stacks compact actions and protects long item names", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  for (const className of [
    "master-data-manager",
    "master-data-create",
    "master-data-item-row",
    "master-data-identity",
    "master-data-item-name",
    "master-data-actions",
    "settings-touch-target",
  ]) assert.match(source, new RegExp(className));

  assert.match(css, /\.master-data-manager\s*\{[\s\S]*container-name:\s*master-data/);
  assert.match(css, /\.master-data-item-name\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.settings-touch-target\s*\{[\s\S]*min-block-size:\s*2\.75rem/);
  assert.match(css, /@container master-data \(min-width:\s*560px\)/);
});
```

- [ ] **Step 2: Run the master-data test and verify failure**

Run:

```bash
cd frontend
node --test src/components/settings/MasterDataManager.test.js
```

Expected: FAIL because the responsive hooks and component container do not exist.

- [ ] **Step 3: Add master-data component CSS**

Add beside the Settings rules in `frontend/src/index.css`:

```css
  .master-data-manager {
    container-name: master-data;
    container-type: inline-size;
  }

  .master-data-create,
  .master-data-item-row,
  .master-data-archived-row {
    display: grid;
    min-inline-size: 0;
    gap: 0.75rem;
  }

  .master-data-identity {
    display: flex;
    min-inline-size: 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .master-data-item-name {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .master-data-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .master-data-actions-single {
    display: grid;
  }

  .settings-touch-target {
    min-block-size: 2.75rem;
  }

  @container master-data (min-width: 560px) {
    .master-data-create {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
    }

    .master-data-item-row,
    .master-data-archived-row {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }

    .master-data-actions {
      display: flex;
    }

    .master-data-actions-single {
      justify-items: end;
    }

    .settings-touch-target {
      min-block-size: 2rem;
    }
  }
```

- [ ] **Step 4: Apply the responsive hooks to production rows and actions**

In `MasterDataManager.jsx`, make these exact replacements without changing any handler expression:

```jsx
<Panel className="master-data-manager grid gap-4 p-4">
```

- `className="grid gap-3 rounded-card border border-border bg-surface-muted/50 p-3"` on the create surface becomes `className="master-data-create rounded-card border border-border bg-surface-muted/50 p-3"`.
- The create action wrapper becomes `className="master-data-actions-single"`; the `Tambah` button gains `className="settings-touch-target w-full"`.
- Each active row becomes `className="master-data-item-row rounded-card border border-border bg-surface p-3"`.
- Each active identity wrapper becomes `className="master-data-identity"`; its name becomes `className="master-data-item-name text-sm font-semibold text-text"`.
- The active row action wrapper becomes `className="master-data-actions"`; both `Ubah nama` and `Arsipkan` buttons gain `className="settings-touch-target"`.
- Both rename and archive confirmation action wrappers become `className="master-data-actions"`; every `Batal`, `Simpan`, and confirmation `Arsipkan` button gains `className="settings-touch-target"`.
- Each archived row becomes `className="master-data-archived-row rounded-card border border-border bg-surface-muted/50 p-3"`.
- Each archived identity wrapper becomes `className="master-data-identity"`; its name becomes `className="master-data-item-name text-sm font-semibold text-text"`.
- Insert `<div className="master-data-actions-single">` immediately before the Restore `Button`, insert its closing `</div>` immediately after that button, and give the button `className="settings-touch-target w-full"`.

- [ ] **Step 5: Run the master-data tests**

Run:

```bash
cd frontend
node --test src/components/settings/MasterDataManager.test.js
```

Expected: both tests PASS.

### Task 4: Keep the loading skeleton geometrically faithful

**Files:**
- Modify: `frontend/src/components/page-loading.test.js`
- Modify: `frontend/src/components/page-loading.jsx:402-447`

- [ ] **Step 1: Write the failing skeleton parity test**

Replace the old viewport-specific expectations in `page-loading.test.js` with:

```js
assert.match(settingsSkeleton, /settings-workspace/);
assert.match(settingsSkeleton, /settings-workspace-layout/);
assert.match(settingsSkeleton, /settings-navigation/);
assert.match(settingsSkeleton, /settings-navigation-item/);
assert.match(settingsSkeleton, /settings-content/);
assert.match(settingsSkeleton, /master-data-manager/);
assert.match(settingsSkeleton, /master-data-create/);
assert.match(settingsSkeleton, /master-data-item-row/);
assert.doesNotMatch(settingsSkeleton, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
assert.doesNotMatch(settingsSkeleton, /<aside/);
```

- [ ] **Step 2: Run the skeleton test and verify failure**

Run:

```bash
cd frontend
node --test src/components/page-loading.test.js
```

Expected: FAIL because the skeleton still uses viewport variants and does not share production responsive hooks.

- [ ] **Step 3: Reuse production geometry in `SettingsPageSkeleton`**

Replace `SettingsPageSkeleton` with:

```jsx
export function SettingsPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface" aria-busy="true">
      <header className="grid gap-3 border-b border-border px-6 py-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <Skeleton className="h-5 w-24 bg-surface-muted/80" />
      </header>

      <main className="settings-workspace min-h-0 flex-1 overflow-auto">
        <div className="settings-workspace-layout">
          <div className="settings-navigation">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton
                key={index}
                className={`settings-navigation-item rounded-control bg-surface-muted/80 ${index === 0 ? "w-28" : "w-24"}`}
              />
            ))}
          </div>

          <div className="settings-content mx-auto w-full max-w-3xl">
            <Panel className="master-data-manager grid gap-4 p-4">
              <div className="border-b border-border pb-3">
                <Skeleton className="h-4 w-24 bg-surface-muted/80" />
                <Skeleton className="mt-2 h-3.5 w-full max-w-80 bg-surface-muted/80" />
              </div>

              <div className="master-data-create rounded-card border border-border bg-surface-muted/50 p-3">
                <div className="grid gap-2">
                  <Skeleton className="h-3.5 w-24 bg-surface" />
                  <Skeleton className="h-11 w-full rounded-card bg-surface" />
                </div>
                <div className="master-data-actions-single">
                  <Skeleton className="settings-touch-target h-11 w-full min-w-24 rounded-control bg-surface" />
                </div>
              </div>

              <div className="grid gap-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="master-data-item-row rounded-card border border-border p-3">
                    <div className="grid min-w-0 gap-2">
                      <Skeleton className={`h-4 bg-surface-muted/80 ${index === 1 ? "w-2/5" : "w-1/3"}`} />
                      <Skeleton className="h-3 w-20 bg-surface-muted/80" />
                    </div>
                    <div className="master-data-actions-single">
                      <Skeleton className="settings-touch-target h-8 w-full min-w-20 rounded-control bg-surface-muted/80" />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
```

Do not introduce new animation; retain the existing `Skeleton` primitive and its reduced-motion behavior.

- [ ] **Step 4: Run loading and Settings tests**

Run:

```bash
cd frontend
node --test src/components/page-loading.test.js src/pages/SettingsPage.test.js
```

Expected: both tests PASS.

### Task 5: Synchronize the design-system showcase and written contract

**Files:**
- Modify: `frontend/src/pages/DesignSystemPage.test.js`
- Modify: `frontend/src/components/design/MasterDataPatternsShowcase.jsx`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Write the failing design-system parity test**

Replace the old `md:grid-cols` assertion in the first `DesignSystemPage.test.js` test with:

```js
assert.match(showcase, /settings-workspace/);
assert.match(showcase, /settings-workspace-layout/);
assert.match(showcase, /container query/i);
assert.match(showcase, /44px/);
assert.doesNotMatch(showcase, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
assert.match(showcase, /max-w-3xl/);
```

- [ ] **Step 2: Run the showcase test and verify failure**

Run:

```bash
cd frontend
node --test src/pages/DesignSystemPage.test.js
```

Expected: FAIL because the showcase still uses the viewport grid and does not explain the container/touch contract.

- [ ] **Step 3: Make the showcase use production-responsive geometry**

Change the explanatory copy in `MasterDataPatternsShowcase.jsx` to:

```jsx
<p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
  Settings memakai container query agar rail 14rem hanya muncul saat workspace benar-benar cukup lebar. Pada ruang ringkas,
  tab tetap horizontal, nama panjang membungkus aman, dan action mempertahankan target sentuh minimum 44px.
</p>
```

Replace the showcase workspace wrapper with:

```jsx
<div className="settings-workspace overflow-hidden rounded-card border border-border bg-app-bg">
  <div className="settings-workspace-layout">
    <SettingsNavigation
      items={sampleSettingsTabs}
      activeId="categories"
      onChange={() => {}}
    />
    <div className="settings-content mx-auto w-full max-w-3xl">
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
</div>
```

- [ ] **Step 4: Update `frontend/DESIGN.md` first-section Settings contract**

Replace the current first paragraph under `### Master data` with:

```markdown
Settings uses query-backed navigation for `profile`, `categories`, and `units`. Its workspace is a named inline-size container: compact widths use horizontal overflow-safe tabs, while a 14rem vertical rail appears only once the Settings content area reaches 760px. The active surface stays centered in the remaining area with a 48rem maximum width. Tabs and compact actions keep targets at least 44px tall; long master-data names wrap inside `min-width: 0` identity groups, and item, confirmation, restore, create, and save actions stack before returning to intrinsic desktop rows. Selection uses a neutral muted surface and `aria-current="page"`, never the primary action treatment. Do not add a redundant store-summary aside beside the editable profile form.
```

- [ ] **Step 5: Run the design-system and focused responsive tests**

Run:

```bash
cd frontend
node --test src/pages/DesignSystemPage.test.js src/pages/SettingsPage.test.js src/components/settings/SettingsNavigation.test.js src/components/settings/MasterDataManager.test.js src/components/page-loading.test.js
```

Expected: all focused tests PASS.

### Task 6: Verify the complete frontend and responsive behavior

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Review only the intended diffs**

Run:

```bash
git diff --check -- frontend/src/index.css frontend/src/pages/SettingsPage.jsx frontend/src/pages/SettingsPage.test.js frontend/src/components/settings/SettingsNavigation.jsx frontend/src/components/settings/SettingsNavigation.test.js frontend/src/components/settings/MasterDataManager.jsx frontend/src/components/settings/MasterDataManager.test.js frontend/src/components/page-loading.jsx frontend/src/components/page-loading.test.js frontend/src/components/design/MasterDataPatternsShowcase.jsx frontend/src/pages/DesignSystemPage.test.js frontend/DESIGN.md
git diff -- frontend/src/index.css frontend/src/pages/SettingsPage.jsx frontend/src/components/settings/SettingsNavigation.jsx frontend/src/components/settings/MasterDataManager.jsx frontend/src/components/page-loading.jsx frontend/src/components/design/MasterDataPatternsShowcase.jsx frontend/DESIGN.md
```

Expected: no whitespace errors; diff contains the responsive work plus preserved pre-existing local hunks, with no unrelated removal.

- [ ] **Step 2: Run the full frontend test suite**

Run:

```bash
cd frontend
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite exits successfully and emits the production bundle.

- [ ] **Step 4: Perform responsive inspection**

Start the existing dev server and inspect Settings at these available workspace widths:

- 320px: one column, horizontal tabs, full-width primary/actions, wrapping names, no page-level horizontal overflow.
- 430px: the same compact information order with comfortable 44px targets.
- 759px: horizontal tabs remain because the container has not reached the rail threshold.
- 760px: 14rem rail plus shrink-safe content column appears.
- 1024px and wider: centered 48rem content surface and compact intrinsic action widths.

Inspect Profile, Categories, and Units; include a long item name and open rename, archive confirmation, and archived sections. Confirm keyboard focus order follows DOM order, the selected tab stays visible, and browser text zoom does not clip names or actions.

- [ ] **Step 5: Report design-system synchronization**

Tell the user explicitly that the production Settings changes were synchronized into both `MasterDataPatternsShowcase`/`DesignSystemPage` and `frontend/DESIGN.md`, as required by the repository instructions.
