# Retail POS Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every validated correctness, accessibility, performance, and composition issue in the retail POS review while preserving the approved UI.

**Architecture:** Extract runtime POS components from showcase modules into focused production modules, then make showcases consume those modules. Move catalog rendering behind a memoized component using deferred filtering and off-screen containment, while keeping cash validation in a pure utility that is tested independently.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, Node test runner, Sonner, Clerk.

---

## File Structure

- Create `frontend/src/pages/retail-pos-utils.js`: pure cash parsing and payment-state helpers.
- Create `frontend/src/pages/retail-pos-utils.test.js`: behavior tests for malformed, empty, insufficient, and valid cash.
- Create `frontend/src/components/feedback/EmptyState.jsx`: production empty-state component.
- Create `frontend/src/components/pos/ProductCard.jsx`: shared product-card frame plus explicit `ProductCard` and `PosProductCard` variants.
- Create `frontend/src/components/pos/CartRow.jsx`: production cart-row component with accessible quantity controls.
- Create `frontend/src/components/pos/PaymentSummary.jsx`: production payment summary with selected-state semantics.
- Create `frontend/src/components/pos/ProductCatalog.jsx`: memoized/deferred POS catalog.
- Create `frontend/src/components/pos/pos-components.test.js`: source-contract tests for extraction, variants, semantics, and performance structure.
- Create `frontend/src/pages/RetailPosPage.test.js`: source-contract tests for page accessibility and composition.
- Modify `frontend/src/pages/RetailPosPage.jsx`: consume production components and pure helpers.
- Modify design showcase files: import production components instead of defining runtime components.
- Modify `frontend/src/index.css`: add catalog containment and reduced-motion status handling.
- Modify `frontend/DESIGN.md`: document dependency direction and POS accessibility/performance rules.

### Task 1: Cash Validation and Change State

**Files:**
- Create: `frontend/src/pages/retail-pos-utils.js`
- Create: `frontend/src/pages/retail-pos-utils.test.js`

- [ ] **Step 1: Write failing cash-state tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { cashPaymentState } from "./retail-pos-utils.js";

test("cash payment rejects empty and malformed amounts", () => {
  assert.equal(cashPaymentState("", 5000, 1).valid, false);
  assert.equal(cashPaymentState("abc", 5000, 1).valid, false);
  assert.equal(cashPaymentState("Infinity", 5000, 1).valid, false);
});

test("cash payment rejects insufficient cash", () => {
  const state = cashPaymentState("4000", 5000, 1);
  assert.equal(state.valid, false);
  assert.equal(state.error, "Cash received must cover the grand total.");
});

test("change is visible only for a non-empty cart with sufficient cash", () => {
  assert.equal(cashPaymentState("", 0, 0).showChange, false);
  assert.equal(cashPaymentState("5000", 0, 0).showChange, false);
  assert.deepEqual(cashPaymentState("7000", 5000, 1), {
    amount: 7000,
    valid: true,
    error: "",
    showChange: true,
    change: 2000,
  });
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `cd frontend && node --test src/pages/retail-pos-utils.test.js`

Expected: FAIL because `retail-pos-utils.js` does not exist.

- [ ] **Step 3: Implement the pure helper**

```js
export function cashPaymentState(rawValue, total, cartItemCount) {
  const trimmed = String(rawValue ?? "").trim();
  const amount = trimmed === "" ? Number.NaN : Number(trimmed);
  const finite = Number.isFinite(amount) && amount >= 0;
  const hasCart = cartItemCount > 0;
  const sufficient = finite && amount >= total;

  return {
    amount,
    valid: hasCart && sufficient,
    error: hasCart && !sufficient ? "Cash received must cover the grand total." : "",
    showChange: hasCart && sufficient,
    change: hasCart && sufficient ? amount - total : 0,
  };
}
```

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `cd frontend && node --test src/pages/retail-pos-utils.test.js`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the cash helper**

```bash
git add frontend/src/pages/retail-pos-utils.js frontend/src/pages/retail-pos-utils.test.js
git commit -m "fix: validate POS cash payments"
```

### Task 2: Extract Production Components and Add Explicit Card Variant

**Files:**
- Create: `frontend/src/components/feedback/EmptyState.jsx`
- Create: `frontend/src/components/pos/ProductCard.jsx`
- Create: `frontend/src/components/pos/CartRow.jsx`
- Create: `frontend/src/components/pos/PaymentSummary.jsx`
- Create: `frontend/src/components/pos/pos-components.test.js`
- Modify: `frontend/src/components/design/EmptyStateShowcase.jsx`
- Modify: `frontend/src/components/design/MenuCardShowcase.jsx`
- Modify: `frontend/src/components/design/CartItemShowcase.jsx`
- Modify: `frontend/src/components/design/PaymentShowcase.jsx`

- [ ] **Step 1: Write failing extraction and variant tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("runtime POS components live outside showcase modules", async () => {
  const product = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const payment = await readFile(new URL("./PaymentSummary.jsx", import.meta.url), "utf8");
  assert.match(product, /export function PosProductCard/);
  assert.match(cart, /export function CartRow/);
  assert.match(payment, /export function PaymentSummary/);
});

test("POS product card is an explicit variant", async () => {
  const source = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");
  assert.match(source, /export function PosProductCard/);
  assert.doesNotMatch(source, /showStepper|allowRepeatAdd/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `cd frontend && node --test src/components/pos/pos-components.test.js`

Expected: FAIL because the production modules do not exist.

- [ ] **Step 3: Extract components with stable production APIs**

Move these declarations verbatim before changing behavior:

- `EmptyStateShowcase.jsx:4-25` → `components/feedback/EmptyState.jsx`, adjusting `Icon` to import from `../primitives.jsx`.
- `MenuCardShowcase.jsx:5-140` → `components/pos/ProductCard.jsx`, adjusting primitive imports to `../primitives.jsx`.
- `CartItemShowcase.jsx:4-158` → `components/pos/CartRow.jsx`, adjusting primitive imports to `../primitives.jsx`.
- `PaymentShowcase.jsx:4-75` → `components/pos/PaymentSummary.jsx`, adjusting primitive imports to `../primitives.jsx`.

In `ProductCard.jsx`, replace the configurable footer with two explicit exports sharing private `ProductImage`, `ProductBody`, and `useAddFeedback` helpers:

```jsx
export function ProductCard({ product, onAdd, onDecrease }) {
  return (
    <ProductCardFrame product={product}>
      <ProductStepper product={product} onAdd={onAdd} onDecrease={onDecrease} />
    </ProductCardFrame>
  );
}

export function PosProductCard({ product, onAdd, disabled = false, actionLabel = "Add to cart" }) {
  const outOfStock = disabled || Number(product.stock) <= 0;
  const { addFeedback, handleAdd } = useAddFeedback({ onAdd, disabled: outOfStock });
  return (
    <ProductCardFrame product={product} outOfStock={outOfStock} addFeedback={addFeedback} className="pos-product-card">
      <Button className="product-add-button" disabled={outOfStock} onClick={handleAdd}>
        <span key={actionLabel} className="button-label-pop">{outOfStock ? "Out of stock" : actionLabel}</span>
      </Button>
    </ProductCardFrame>
  );
}
```

Update each showcase to import the production export and retain only its sample data and showcase composition.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `cd frontend && node --test src/components/pos/pos-components.test.js`

Expected: 2 tests pass.

- [ ] **Step 5: Commit component extraction**

```bash
git add frontend/src/components/feedback frontend/src/components/pos frontend/src/components/design
git commit -m "refactor: extract production POS components"
```

### Task 3: Component Accessibility Semantics

**Files:**
- Modify: `frontend/src/components/pos/CartRow.jsx`
- Modify: `frontend/src/components/pos/PaymentSummary.jsx`
- Modify: `frontend/src/components/pos/pos-components.test.js`

- [ ] **Step 1: Add failing semantics assertions**

```js
test("cart controls and payment choices expose accessible state", async () => {
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const payment = await readFile(new URL("./PaymentSummary.jsx", import.meta.url), "utf8");
  assert.match(cart, /aria-label="Decrease quantity"/);
  assert.match(cart, /aria-label="Increase quantity"/);
  assert.match(payment, /aria-pressed=\{paymentMethod === method\.id\}/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `cd frontend && node --test src/components/pos/pos-components.test.js`

Expected: FAIL on missing ARIA attributes.

- [ ] **Step 3: Implement semantics**

Add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` to the cart icon buttons. Use a module-level payment-method array and pass `aria-pressed={paymentMethod === method.id}` to each payment button.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `cd frontend && node --test src/components/pos/pos-components.test.js`

Expected: all component tests pass.

- [ ] **Step 5: Commit accessibility semantics**

```bash
git add frontend/src/components/pos
git commit -m "fix: expose POS control semantics"
```

### Task 4: Memoized Product Catalog

**Files:**
- Create: `frontend/src/components/pos/ProductCatalog.jsx`
- Modify: `frontend/src/components/pos/pos-components.test.js`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Write failing performance-structure test**

```js
test("product catalog defers filtering and contains off-screen cards", async () => {
  const catalog = await readFile(new URL("./ProductCatalog.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");
  assert.match(catalog, /React\.memo/);
  assert.match(catalog, /React\.useDeferredValue/);
  assert.match(catalog, /React\.useMemo/);
  assert.match(catalog, /<PosProductCard/);
  assert.match(css, /\.pos-product-card[\s\S]*content-visibility:\s*auto/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `cd frontend && node --test src/components/pos/pos-components.test.js`

Expected: FAIL because `ProductCatalog.jsx` and containment CSS are absent.

- [ ] **Step 3: Implement the catalog boundary**

```jsx
export const ProductCatalog = React.memo(function ProductCatalog({ activeProducts, cart, query, category, checkoutPending, onAdd, onClearFilters }) {
  const deferredQuery = React.useDeferredValue(query);
  const qtyByProduct = React.useMemo(() => new Map(cart.map((item) => [item.productId, item.qty])), [cart]);
  const products = React.useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const categoryMatch = category === "Semua" || product.category === category;
      return categoryMatch && `${product.name} ${product.barcode}`.toLowerCase().includes(normalized);
    });
  }, [activeProducts, category, deferredQuery]);
  return (
    <div className="menu-grid-transition grid flex-1 auto-rows-max gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {products.length === 0 ? (
        <div className="sm:col-span-2 lg:col-span-3 2xl:col-span-4">
          <EmptyState
            icon={null}
            title="No products found"
            description="Clear the search or switch category to keep selling."
            className="min-h-[260px] p-7"
            borderClassName="border"
            titleClassName="text-sm"
            descriptionClassName="text-sm"
          />
          <div className="mt-3 flex justify-center">
            <Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>
          </div>
        </div>
      ) : products.map((product) => (
        <PosProductCard
          key={product.id}
          product={{ ...product, price: formatPrice(product.price), qty: qtyByProduct.get(product.id) || 0 }}
          actionLabel={qtyByProduct.has(product.id) ? "Add one more" : "Add to cart"}
          disabled={product.stock <= 0 || checkoutPending}
          onAdd={() => onAdd(product.id)}
        />
      ))}
    </div>
  );
});
```

```css
.pos-product-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 340px;
}
```

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `cd frontend && node --test src/components/pos/pos-components.test.js`

Expected: all component tests pass.

- [ ] **Step 5: Commit catalog optimization**

```bash
git add frontend/src/components/pos/ProductCatalog.jsx frontend/src/components/pos/pos-components.test.js frontend/src/index.css
git commit -m "perf: isolate POS product catalog renders"
```

### Task 5: Refactor Retail POS Page and Fix Page Accessibility

**Files:**
- Create: `frontend/src/pages/RetailPosPage.test.js`
- Modify: `frontend/src/pages/RetailPosPage.jsx`

- [ ] **Step 1: Write failing page-contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Retail POS consumes production components", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /components\/design\/.*Showcase/);
  assert.match(source, /<ProductCatalog/);
  assert.doesNotMatch(source, /allowRepeatAdd|showStepper/);
  assert.doesNotMatch(source, /useUser/);
});

test("search and cash controls expose accessible form state", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Search products or barcode"/);
  assert.match(source, /aria-keyshortcuts="Meta\+K Control\+K"/);
  assert.match(source, /focus-within:outline-2/);
  assert.match(source, /error=\{visibleCashError\}/);
  assert.match(source, /name:\s*"cashReceived"/);
  assert.match(source, /aria-pressed=\{category === item\}/);
});

test("status copy and motion follow the interface contract", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  assert.match(source, /Completing…/);
  assert.match(source, /role="status"/);
  assert.match(source, /motion-reduce:animate-none/);
  assert.doesNotMatch(source, /\.\.\./);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js`

Expected: FAIL on showcase imports, missing form semantics, and old copy.

- [ ] **Step 3: Refactor page imports and state**

Import `EmptyState`, `CartRow`, `PaymentSummary`, `ProductCatalog`, and `cashPaymentState` from production modules. Remove `useUser`, `useDebouncedValue`, page-level product filtering, product maps, and the discarded checkout argument.

Derive `cashState = cashPaymentState(cashReceived, totals.total, store.cart.length)`. For cash checkout, reject `!cashState.valid`, pass `cashState.amount`, and show change only when `cashState.showChange` is true.

- [ ] **Step 4: Implement page semantics and copy**

Add an accessible search name, label, autocomplete policy, keyboard-shortcut metadata, compound focus treatment, `aria-pressed` category state, `error={visibleCashError}` on the cash `Input`, `role="status"` for updating/change messages, `motion-reduce:animate-none`, `Search products or barcode…`, `⌘ K / Ctrl K`, and `Completing…`.

- [ ] **Step 5: Run tests and confirm GREEN**

Run: `cd frontend && node --test src/pages/retail-pos-utils.test.js src/pages/RetailPosPage.test.js src/components/pos/pos-components.test.js`

Expected: all targeted tests pass.

- [ ] **Step 6: Commit page integration**

```bash
git add frontend/src/pages/RetailPosPage.jsx frontend/src/pages/RetailPosPage.test.js
git commit -m "fix: harden retail POS interactions"
```

### Task 6: Synchronize Design System Documentation

**Files:**
- Modify: `frontend/src/components/design/POSPatterns.jsx`
- Modify: `frontend/DESIGN.md`
- Modify: `frontend/src/pages/RetailPosPage.test.js`

- [ ] **Step 1: Add failing documentation assertions**

```js
test("design system documents production POS composition", async () => {
  const design = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");
  assert.match(design, /showcase modules consume production components/i);
  assert.match(design, /content-visibility/);
  assert.match(design, /aria-pressed/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js`

Expected: FAIL because the contract is not documented.

- [ ] **Step 3: Update showcase and DESIGN.md**

Make `POSPatterns.jsx` demonstrate `PosProductCard` from the production module. Add concise DESIGN rules covering production-to-showcase dependency direction, explicit POS variants, finite cash validation, associated field errors, pressed-state semantics, reduced motion, and `content-visibility` for long operational catalogs.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `cd frontend && node --test src/pages/RetailPosPage.test.js`

Expected: all page tests pass.

- [ ] **Step 5: Commit design-system synchronization**

```bash
git add frontend/src/components/design/POSPatterns.jsx frontend/DESIGN.md frontend/src/pages/RetailPosPage.test.js
git commit -m "docs: align POS design-system contract"
```

### Task 7: Full Verification

**Files:**
- Verify all modified frontend files.

- [ ] **Step 1: Run the complete frontend test suite**

Run: `cd frontend && npm run test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `cd frontend && npm run build`

Expected: Vite exits 0. Existing module-directive and large-chunk warnings may remain; no new build errors are allowed.

- [ ] **Step 3: Check patch hygiene**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Inspect the final scoped diff**

Run: `git diff -- frontend/src/pages/RetailPosPage.jsx frontend/src/pages/retail-pos-utils.js frontend/src/components/pos frontend/src/components/feedback frontend/src/components/design frontend/src/index.css frontend/DESIGN.md`

Expected: only the approved review fixes and design-system synchronization are present; unrelated user changes remain untouched.
