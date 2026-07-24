# Cart Row Action Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the labelled remove action at the left of the cart-row footer and the quantity control at its right.

**Architecture:** `CartRow` owns both actions, so the change stays inside its footer markup and flex alignment. No cart state, stock-limit, event handler, or payment behavior changes.

**Tech Stack:** React 19, Tailwind CSS v4, Node built-in test runner, Vite.

---

### Task 1: Cover the ordered cart-row actions

**Files:**
- Modify: `frontend/src/components/pos/pos-components.test.js`

- [ ] **Step 1: Write the failing test**

```js
assert.match(cart, /className="mt-3 flex flex-wrap items-center justify-between gap-2"/);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test src/components/pos/pos-components.test.js`

Expected: FAIL because the existing footer uses no `justify-between` alignment.

### Task 2: Reorder and align CartRow controls

**Files:**
- Modify: `frontend/src/components/pos/CartRow.jsx:48-76`
- Test: `frontend/src/components/pos/pos-components.test.js`

- [ ] **Step 1: Put the remove action first**

Render the `onRemove` button before the `onUpdateQty` control so it occupies the left edge of the footer.

- [ ] **Step 2: Align actions across the lower row**

```jsx
<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
```

Keep the existing `pos-touch-target`, accessible labels, stock-limit disabled state, and press feedback on both controls.

- [ ] **Step 3: Run focused POS tests**

Run: `node --test src/components/pos/pos-components.test.js`

Expected: PASS.

- [ ] **Step 4: Run all frontend tests and production build**

Run: `npm test && npm run build`

Expected: all tests pass and Vite reports a successful build.

- [ ] **Step 5: Commit implementation**

```bash
git add frontend/src/components/pos/CartRow.jsx frontend/src/components/pos/pos-components.test.js
git commit -m "fix: align cart row actions"
```
