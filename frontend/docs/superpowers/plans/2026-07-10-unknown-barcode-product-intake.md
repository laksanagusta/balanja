# Unknown Barcode Product Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a cashier turn an unknown scanned barcode into a new master product and place it directly into the active cart.

**Architecture:** `AppShell` owns the scanner and the two POS-context dialogs: a lightweight decision dialog for an unknown barcode and an add-product form dialog. The POS store returns the persisted product, including its generated ID, so the caller can add it to the cart without scanning again. The existing product-management form remains unchanged; the POS dialog is deliberately scoped to quick intake.

**Tech Stack:** React, existing POS context store, existing design-system `Dialog`, `Button`, and `Input` primitives, Sonner, Node test runner.

---

### Task 1: Return the saved product identity from the store

**Files:**
- Modify: `src/pos/store.jsx:73-105`
- Test: `src/pos/store.test.js`

- [ ] **Step 1: Write the failing test**

```js
test("saveProduct returns a generated id for a new product", () => {
  const product = saveNewProduct({ barcode: "8991001000999" });

  assert.equal(product.ok, true);
  assert.match(product.product.id, /^prod-/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/pos/store.test.js`

Expected: FAIL because `saveProduct` returns a product with an empty `id`.

- [ ] **Step 3: Write minimal implementation**

```js
const savedProduct = {
  ...normalized,
  id: normalized.id || `prod-${Date.now()}`,
};
response = { ok: true, product: savedProduct };
```

Use `savedProduct` for both the insert and update branches.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/pos/store.test.js`

Expected: PASS.

### Task 2: Add the unknown-barcode decision dialog

**Files:**
- Modify: `src/components/AppShell.jsx:1-177`

- [ ] **Step 1: Capture an unknown scan without producing an error toast**

```js
if (!result?.ok && result?.error === "Product not found") {
  clearNotice();
  setMissingBarcode(code);
  setScannerOpen(false);
  return;
}
```

- [ ] **Step 2: Render the decision dialog with the scanned barcode**

```jsx
<Dialog title="Barcode not found" open={Boolean(missingBarcode)} ...>
  <p>Barcode <span className="font-mono">{missingBarcode}</span> is not in the product catalog.</p>
</Dialog>
```

- [ ] **Step 3: Provide explicit actions**

The footer contains `Cancel`, `Scan again`, and the primary `Add product` action. `Scan again` closes the dialog before reopening the scanner; `Add product` opens the form using the scanned barcode.

### Task 3: Add a POS-context product form and cart handoff

**Files:**
- Modify: `src/components/AppShell.jsx:1-177`

- [ ] **Step 1: Add the add-product draft state and form**

```js
const emptyProductDraft = (barcode) => ({
  id: "", name: "", barcode, category: "Sembako", price: 0, stock: 0, unit: "pcs", active: true,
});
```

Use the existing dialog, input, button, icon, and retail category patterns. The form submits through the dialog footer using a form ID.

- [ ] **Step 2: Save and add to cart**

```js
const result = saveProduct(productDraft);
if (!result?.ok) return;
const cartResult = addToCart(result.product.id);
if (cartResult?.ok) toast.success("Product added to cart", { description: result.product.name });
setProductDraft(null);
```

- [ ] **Step 3: Keep failures actionable**

Leave validation failures to the store notice and Sonner error path; keep the form open so the cashier can correct it. Do not use an error toast for unknown barcode because the decision dialog is the action surface.

### Task 4: Document the workflow in the design system

**Files:**
- Modify: `DESIGN.md`
- Modify: `src/components/design/ModalFormShowcase.jsx`

- [ ] **Step 1: Add a design-system form example**

Add an `Unknown barcode` dialog example that shows the three-action decision pattern, using design-system primitives.

- [ ] **Step 2: Update the workflow guidance**

State that an unknown barcode scan opens a decision dialog, then pre-fills the product form; a saved product returns to the active cart automatically.

### Task 5: Verify the workflow

**Files:**
- Test: `src/pos/domain.test.js`
- Test: `src/pos/store.test.js`

- [ ] **Step 1: Run the automated tests**

Run: `npm run test`

Expected: all Node tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite build exits with code 0.
