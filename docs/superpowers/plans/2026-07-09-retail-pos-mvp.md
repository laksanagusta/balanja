# Retail POS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved retail UMKM POS MVP with Clerk auth, localStorage data, camera barcode scanning, POS checkout, product CRUD, transaction history, and settings.

**Architecture:** Keep the app frontend-only for this MVP. Move business rules into small pure modules under `src/pos/`, persist state through one store provider, and keep pages thin composition layers. Replace restaurant-specific POS data and copy with retail UMKM flows while preserving the existing Tailwind v4 design system.

**Tech Stack:** React 19, Vite 7, Tailwind v4, Clerk React SDK, `@zxing/browser`, Node built-in test runner for pure domain tests.

---

## File Structure

- Modify `package.json`: add `test` script and dependencies.
- Modify `src/main.jsx`: wrap app with Clerk provider.
- Replace `src/App.jsx`: route to authenticated app pages and preserve `/design-system`.
- Modify `src/shared.jsx`: routes, retail nav groups, IDR formatting helpers.
- Modify `src/data.js`: replace restaurant demo data with retail seed data.
- Modify `DESIGN.md`: update product surface from restaurant POS to retail UMKM POS.
- Create `src/pos/domain.js`: pure pricing, validation, cart, checkout, and seed helpers.
- Create `src/pos/domain.test.js`: Node tests for core POS behavior.
- Create `src/pos/storage.js`: localStorage load/save helpers with safe fallback.
- Create `src/pos/store.jsx`: app state provider and mutation API.
- Create `src/components/AppShell.jsx`: shared authenticated layout and responsive navigation.
- Create `src/components/BarcodeScanner.jsx`: reusable camera scanner with manual fallback.
- Create `src/pages/RetailPosPage.jsx`: checkout screen.
- Create `src/pages/ProductsPage.jsx`: CRUD management screen.
- Create `src/pages/TransactionsPage.jsx`: transaction history screen.
- Create `src/pages/SettingsPage.jsx`: store settings screen.
- Modify `src/components/primitives.jsx`: add missing icons and small primitive affordances only as needed.
- Keep `src/pages/DesignSystemPage.jsx`: design reference remains reachable at `/design-system`.
- Keep `src/pages/LoginPage.jsx`: leave unchanged and no longer route to it from authenticated app flow.

## External Docs Checked

- Clerk React Vite setup from Context7 `/clerk/clerk-docs`: use `VITE_CLERK_PUBLISHABLE_KEY`, wrap root with `ClerkProvider`, and use Clerk signed-in/signed-out components or auth state.
- ZXing browser docs from Context7 `/zxing-js/browser`: use `BrowserMultiFormatReader.decodeFromVideoDevice(undefined, videoElement, callback)` and call `controls.stop()` when a scan succeeds or the modal closes.

---

### Task 1: Install Dependencies and Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install Clerk and ZXing**

Run:

```bash
npm install @clerk/react @zxing/browser
```

Expected: `package.json` includes `@clerk/react` and `@zxing/browser`.

- [ ] **Step 2: Add Node test script**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test \"src/**/*.test.js\""
  }
}
```

Keep existing dependency versions produced by `npm install`.

- [ ] **Step 3: Verify dependency install and empty test command**

Run:

```bash
npm run test
```

Expected: Node test runner exits successfully with no matching test files or with zero tests once the first tests are added.

- [ ] **Step 4: Commit when in a git worktree**

Run:

```bash
git rev-parse --show-toplevel
```

Expected in this workspace today: `fatal: not a git repository`. If implementing inside a Git worktree instead, run:

```bash
git add package.json package-lock.json
git commit -m "chore: add retail pos dependencies"
```

---

### Task 2: Core Retail POS Domain

**Files:**
- Create: `src/pos/domain.js`
- Create: `src/pos/domain.test.js`
- Modify: `src/data.js`
- Modify: `src/shared.jsx`

- [ ] **Step 1: Write failing domain tests**

Create `src/pos/domain.test.js`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
  addProductToCart,
  calculateCartTotals,
  checkoutCart,
  formatIDR,
  validateProduct,
} from "./domain.js";

const products = [
  {
    id: "prod-rice-5kg",
    name: "Beras Ramos 5kg",
    barcode: "8991001000011",
    category: "Sembako",
    price: 72000,
    stock: 3,
    unit: "pack",
    active: true,
  },
  {
    id: "prod-no-stock",
    name: "Stok Kosong",
    barcode: "8991001000028",
    category: "Snack",
    price: 12000,
    stock: 0,
    unit: "pcs",
    active: true,
  },
];

test("formatIDR formats integer Rupiah values", () => {
  assert.equal(formatIDR(72000), "Rp72.000");
});

test("validateProduct blocks duplicate active barcodes", () => {
  const result = validateProduct(
    {
      id: "new-product",
      name: "Beras Baru",
      barcode: "8991001000011",
      category: "Sembako",
      price: 70000,
      stock: 4,
      unit: "pack",
      active: true,
    },
    products,
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.barcode, "Barcode already exists");
});

test("addProductToCart adds by barcode and respects stock", () => {
  const result = addProductToCart([], products, "8991001000011");

  assert.equal(result.ok, true);
  assert.deepEqual(result.cart, [
    {
      productId: "prod-rice-5kg",
      name: "Beras Ramos 5kg",
      barcode: "8991001000011",
      price: 72000,
      qty: 1,
      stockAtAdd: 3,
    },
  ]);
});

test("addProductToCart blocks out of stock products", () => {
  const result = addProductToCart([], products, "8991001000028");

  assert.equal(result.ok, false);
  assert.equal(result.error, "Product is out of stock");
});

test("calculateCartTotals applies tax when enabled", () => {
  const totals = calculateCartTotals(
    [{ productId: "prod-rice-5kg", price: 72000, qty: 2 }],
    { taxEnabled: true, taxRate: 11 },
  );

  assert.deepEqual(totals, {
    subtotal: 144000,
    tax: 15840,
    total: 159840,
  });
});

test("checkoutCart records cash change and decrements stock", () => {
  const result = checkoutCart({
    cart: [{ productId: "prod-rice-5kg", name: "Beras Ramos 5kg", barcode: "8991001000011", price: 72000, qty: 2 }],
    products,
    settings: { taxEnabled: false, taxRate: 0 },
    payment: { method: "cash", cashReceived: 150000 },
    cashierName: "Kasir Demo",
    now: new Date("2026-07-09T10:00:00.000Z"),
    transactionNumber: "TRX-0001",
  });

  assert.equal(result.ok, true);
  assert.equal(result.transaction.total, 144000);
  assert.equal(result.transaction.changeDue, 6000);
  assert.equal(result.products.find((item) => item.id === "prod-rice-5kg").stock, 1);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test
```

Expected: FAIL because `src/pos/domain.js` does not exist.

- [ ] **Step 3: Implement domain module**

Create `src/pos/domain.js`:

```javascript
export const defaultSettings = {
  storeName: "Toko Balanja",
  storeAddress: "Jl. UMKM No. 1",
  taxEnabled: false,
  taxRate: 11,
  qrisLabel: "QRIS Toko Balanja",
};

export const retailCategories = ["Semua", "Sembako", "Minuman", "Snack", "Perawatan", "Rumah Tangga"];

export const seedProducts = [
  { id: "prod-rice-5kg", name: "Beras Ramos 5kg", barcode: "8991001000011", category: "Sembako", price: 72000, stock: 18, unit: "pack", active: true, createdAt: "2026-07-09T00:00:00.000Z", updatedAt: "2026-07-09T00:00:00.000Z" },
  { id: "prod-sugar-1kg", name: "Gula Pasir 1kg", barcode: "8991001000028", category: "Sembako", price: 17500, stock: 24, unit: "pack", active: true, createdAt: "2026-07-09T00:00:00.000Z", updatedAt: "2026-07-09T00:00:00.000Z" },
  { id: "prod-noodle", name: "Mie Instan Goreng", barcode: "8991001000035", category: "Snack", price: 3500, stock: 80, unit: "pcs", active: true, createdAt: "2026-07-09T00:00:00.000Z", updatedAt: "2026-07-09T00:00:00.000Z" },
  { id: "prod-water", name: "Air Mineral 600ml", barcode: "8991001000042", category: "Minuman", price: 4000, stock: 64, unit: "botol", active: true, createdAt: "2026-07-09T00:00:00.000Z", updatedAt: "2026-07-09T00:00:00.000Z" },
  { id: "prod-soap", name: "Sabun Mandi Batang", barcode: "8991001000059", category: "Perawatan", price: 5500, stock: 36, unit: "pcs", active: true, createdAt: "2026-07-09T00:00:00.000Z", updatedAt: "2026-07-09T00:00:00.000Z" },
  { id: "prod-detergent", name: "Deterjen Bubuk 800g", barcode: "8991001000066", category: "Rumah Tangga", price: 18500, stock: 20, unit: "pack", active: true, createdAt: "2026-07-09T00:00:00.000Z", updatedAt: "2026-07-09T00:00:00.000Z" },
];

export function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function normalizeBarcode(value) {
  return String(value || "").trim();
}

export function validateProduct(product, products) {
  const errors = {};
  const barcode = normalizeBarcode(product.barcode);
  const duplicate = products.some((item) => item.active && item.id !== product.id && normalizeBarcode(item.barcode) === barcode);

  if (!String(product.name || "").trim()) errors.name = "Name is required";
  if (!barcode) errors.barcode = "Barcode is required";
  if (duplicate) errors.barcode = "Barcode already exists";
  if (!String(product.category || "").trim()) errors.category = "Category is required";
  if (Number(product.price) < 0 || Number.isNaN(Number(product.price))) errors.price = "Price must be zero or greater";
  if (Number(product.stock) < 0 || Number.isNaN(Number(product.stock))) errors.stock = "Stock must be zero or greater";

  return { ok: Object.keys(errors).length === 0, errors };
}

export function findProductByBarcode(products, barcode) {
  const normalized = normalizeBarcode(barcode);
  return products.find((item) => item.active && normalizeBarcode(item.barcode) === normalized) || null;
}

export function addProductToCart(cart, products, barcodeOrProductId) {
  const product =
    products.find((item) => item.active && item.id === barcodeOrProductId) ||
    findProductByBarcode(products, barcodeOrProductId);

  if (!product) return { ok: false, error: "Product not found", cart };
  if (product.stock <= 0) return { ok: false, error: "Product is out of stock", cart };

  const existing = cart.find((item) => item.productId === product.id);
  const nextQty = existing ? existing.qty + 1 : 1;
  if (nextQty > product.stock) return { ok: false, error: "Cart quantity exceeds stock", cart };

  const nextCart = existing
    ? cart.map((item) => (item.productId === product.id ? { ...item, qty: nextQty } : item))
    : [...cart, { productId: product.id, name: product.name, barcode: product.barcode, price: product.price, qty: 1, stockAtAdd: product.stock }];

  return { ok: true, cart: nextCart };
}

export function calculateCartTotals(cart, settings) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const tax = settings.taxEnabled ? Math.round(subtotal * (Number(settings.taxRate) / 100)) : 0;
  return { subtotal, tax, total: subtotal + tax };
}

export function checkoutCart({ cart, products, settings, payment, cashierName, now = new Date(), transactionNumber }) {
  if (cart.length === 0) return { ok: false, error: "Cart is empty" };

  for (const item of cart) {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product || !product.active) return { ok: false, error: `${item.name} is unavailable` };
    if (item.qty > product.stock) return { ok: false, error: `${item.name} stock is not enough` };
  }

  const totals = calculateCartTotals(cart, settings);
  const method = payment.method;
  const cashReceived = method === "cash" ? Number(payment.cashReceived) : 0;
  if (method === "cash" && cashReceived < totals.total) return { ok: false, error: "Cash received is less than total" };

  const createdAt = now.toISOString();
  const transaction = {
    id: `txn-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    number: transactionNumber,
    createdAt,
    cashierName,
    items: cart.map((item) => ({ ...item })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    paymentMethod: method,
    cashReceived: method === "cash" ? cashReceived : 0,
    changeDue: method === "cash" ? cashReceived - totals.total : 0,
    status: "completed",
  };

  const nextProducts = products.map((product) => {
    const cartItem = cart.find((item) => item.productId === product.id);
    return cartItem ? { ...product, stock: product.stock - cartItem.qty, updatedAt: createdAt } : product;
  });

  return { ok: true, transaction, products: nextProducts };
}

export function createTransactionNumber(count) {
  return `TRX-${String(count + 1).padStart(4, "0")}`;
}
```

- [ ] **Step 4: Update shared helpers and data exports**

Modify `src/shared.jsx` to export retail routes and `formatPrice` as IDR:

```javascript
export const routes = {
  login: "/",
  pos: "/pos",
  products: "/products",
  transactions: "/transactions",
  settings: "/settings",
  designSystem: "/design-system",
};
```

Replace `formatPrice`:

```javascript
export function formatPrice(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);
}
```

Modify `src/data.js` to re-export seed data:

```javascript
export { retailCategories as categories, seedProducts as menuItems, seedProducts, defaultSettings } from "./pos/domain.js";
export const transactionData = [];
export const inventoryData = [];
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test
```

Expected: PASS for all domain tests.

- [ ] **Step 6: Commit when in a git worktree**

If inside a Git worktree:

```bash
git add src/pos/domain.js src/pos/domain.test.js src/data.js src/shared.jsx package.json package-lock.json
git commit -m "feat: add retail pos domain model"
```

---

### Task 3: LocalStorage Store Provider

**Files:**
- Create: `src/pos/storage.js`
- Create: `src/pos/store.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Add storage helper**

Create `src/pos/storage.js`:

```javascript
import { defaultSettings, seedProducts } from "./domain.js";

const STORAGE_KEY = "balanja-retail-pos-v1";

export function createInitialState() {
  return {
    products: seedProducts,
    cart: [],
    transactions: [],
    settings: defaultSettings,
    notice: "",
  };
}

export function loadPersistedState(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    return {
      ...createInitialState(),
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
    };
  } catch {
    return { ...createInitialState(), notice: "Demo data restored because saved data could not be read." };
  }
}

export function savePersistedState(state, storage = window.localStorage) {
  const payload = {
    products: state.products,
    cart: state.cart,
    transactions: state.transactions,
    settings: state.settings,
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resetPersistedState(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
  return createInitialState();
}
```

- [ ] **Step 2: Add store provider**

Create `src/pos/store.jsx`:

```jsx
import React from "react";
import {
  addProductToCart,
  checkoutCart,
  createTransactionNumber,
  validateProduct,
} from "./domain.js";
import { loadPersistedState, resetPersistedState, savePersistedState } from "./storage.js";

const POSStoreContext = React.createContext(null);

export function POSStoreProvider({ children }) {
  const [state, setState] = React.useState(() => loadPersistedState());

  React.useEffect(() => {
    savePersistedState(state);
  }, [state.products, state.cart, state.transactions, state.settings]);

  const setNotice = React.useCallback((notice) => {
    setState((current) => ({ ...current, notice }));
  }, []);

  const clearNotice = React.useCallback(() => {
    setState((current) => ({ ...current, notice: "" }));
  }, []);

  const addToCart = React.useCallback((barcodeOrProductId) => {
    setState((current) => {
      const result = addProductToCart(current.cart, current.products, barcodeOrProductId);
      return result.ok ? { ...current, cart: result.cart, notice: "" } : { ...current, notice: result.error };
    });
  }, []);

  const updateCartQty = React.useCallback((productId, qty) => {
    setState((current) => {
      const product = current.products.find((item) => item.id === productId);
      const nextQty = Math.max(0, Number(qty));
      if (!product) return { ...current, notice: "Product not found" };
      if (nextQty > product.stock) return { ...current, notice: "Cart quantity exceeds stock" };
      return {
        ...current,
        cart: nextQty === 0
          ? current.cart.filter((item) => item.productId !== productId)
          : current.cart.map((item) => (item.productId === productId ? { ...item, qty: nextQty } : item)),
        notice: "",
      };
    });
  }, []);

  const clearCart = React.useCallback(() => {
    setState((current) => ({ ...current, cart: [], notice: "" }));
  }, []);

  const saveProduct = React.useCallback((product) => {
    setState((current) => {
      const now = new Date().toISOString();
      const normalized = {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
        active: product.active !== false,
        updatedAt: now,
        createdAt: product.createdAt || now,
      };
      const validation = validateProduct(normalized, current.products);
      if (!validation.ok) return { ...current, notice: Object.values(validation.errors)[0] };
      const exists = current.products.some((item) => item.id === normalized.id);
      return {
        ...current,
        products: exists
          ? current.products.map((item) => (item.id === normalized.id ? normalized : item))
          : [...current.products, { ...normalized, id: normalized.id || `prod-${Date.now()}` }],
        notice: "",
      };
    });
  }, []);

  const deactivateProduct = React.useCallback((productId) => {
    setState((current) => ({
      ...current,
      products: current.products.map((item) => (item.id === productId ? { ...item, active: false, updatedAt: new Date().toISOString() } : item)),
      cart: current.cart.filter((item) => item.productId !== productId),
      notice: "",
    }));
  }, []);

  const checkout = React.useCallback((payment, cashierName) => {
    let response = null;
    setState((current) => {
      const result = checkoutCart({
        cart: current.cart,
        products: current.products,
        settings: current.settings,
        payment,
        cashierName,
        transactionNumber: createTransactionNumber(current.transactions.length),
      });
      response = result;
      if (!result.ok) return { ...current, notice: result.error };
      return {
        ...current,
        products: result.products,
        transactions: [result.transaction, ...current.transactions],
        cart: [],
        notice: "Transaction completed",
      };
    });
    return response;
  }, []);

  const updateSettings = React.useCallback((settings) => {
    setState((current) => ({ ...current, settings: { ...current.settings, ...settings }, notice: "Settings saved" }));
  }, []);

  const resetDemoData = React.useCallback(() => {
    setState(resetPersistedState());
  }, []);

  const value = {
    ...state,
    activeProducts: state.products.filter((item) => item.active),
    addToCart,
    updateCartQty,
    clearCart,
    saveProduct,
    deactivateProduct,
    checkout,
    updateSettings,
    resetDemoData,
    setNotice,
    clearNotice,
  };

  return <POSStoreContext.Provider value={value}>{children}</POSStoreContext.Provider>;
}

export function usePOSStore() {
  const value = React.useContext(POSStoreContext);
  if (!value) throw new Error("usePOSStore must be used inside POSStoreProvider");
  return value;
}
```

- [ ] **Step 3: Wrap app with store provider**

Modify `src/main.jsx` after Clerk is added in Task 4. The intended final nesting is:

```jsx
<ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
  <POSStoreProvider>
    <App />
  </POSStoreProvider>
</ClerkProvider>
```

- [ ] **Step 4: Run tests and build**

Run:

```bash
npm run test
npm run build
```

Expected: tests pass and Vite build succeeds after imports are connected.

---

### Task 4: Clerk Auth and Routing

**Files:**
- Modify: `src/main.jsx`
- Replace: `src/App.jsx`
- Modify: `src/shared.jsx`

- [ ] **Step 1: Configure Clerk in main**

Replace `src/main.jsx` with:

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App.jsx";
import "./index.css";
import { POSStoreProvider } from "./pos/store.jsx";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkKey) {
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY. Clerk auth will not load until the key is configured.");
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkKey || "missing-key"} afterSignOutUrl="/">
      <POSStoreProvider>
        <App />
      </POSStoreProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 2: Replace App routing**

Replace `src/App.jsx` with:

```jsx
import React from "react";
import { SignedIn, SignedOut, SignIn } from "@clerk/react";
import { routes } from "./shared.jsx";
import AppShell from "./components/AppShell.jsx";
import RetailPosPage from "./pages/RetailPosPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import DesignSystemPage from "./pages/DesignSystemPage.jsx";

function normalizePath(pathname) {
  return Object.values(routes).includes(pathname) ? pathname : routes.pos;
}

function usePathname() {
  const [pathname, setPathname] = React.useState(() => normalizePath(window.location.pathname));

  React.useEffect(() => {
    const handlePopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = React.useCallback((path) => {
    const nextPath = normalizePath(path);
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
    window.scrollTo(0, 0);
  }, []);

  return [pathname, navigate];
}

function AppPage({ pathname, onNavigate }) {
  if (pathname === routes.products) return <ProductsPage />;
  if (pathname === routes.transactions) return <TransactionsPage />;
  if (pathname === routes.settings) return <SettingsPage />;
  if (pathname === routes.designSystem) return <DesignSystemPage onNavigate={onNavigate} />;
  return <RetailPosPage />;
}

export default function App() {
  const [pathname, navigate] = usePathname();

  return (
    <div className="min-h-screen bg-app-bg text-text antialiased">
      <SignedOut>
        <main className="grid min-h-screen place-items-center bg-app-bg px-4">
          <div className="w-full max-w-md rounded-panel border border-border bg-surface p-4 shadow-panel">
            <SignIn routing="hash" afterSignInUrl="/pos" />
          </div>
        </main>
      </SignedOut>
      <SignedIn>
        <AppShell pathname={pathname} onNavigate={navigate}>
          <AppPage pathname={pathname} onNavigate={navigate} />
        </AppShell>
      </SignedIn>
    </div>
  );
}
```

- [ ] **Step 3: Update route constants and nav**

Modify `src/shared.jsx` routes to include all operational pages:

```javascript
export const routes = {
  login: "/",
  pos: "/pos",
  products: "/products",
  transactions: "/transactions",
  settings: "/settings",
  designSystem: "/design-system",
};
```

Modify `navGroups`:

```javascript
export const navGroups = [
  {
    label: "Retail",
    items: [
      ["POS", "receipt", routes.pos],
      ["Products", "box", routes.products],
      ["Transactions", "file", routes.transactions],
      ["Settings", "settings", routes.settings],
    ],
  },
];
```

- [ ] **Step 4: Run domain tests**

Run:

```bash
npm run test
```

Expected: PASS. The production build checkpoint runs in Task 10 after all imported pages and components exist.

---

### Task 5: Authenticated App Shell

**Files:**
- Create: `src/components/AppShell.jsx`
- Modify: `src/components/primitives.jsx`

- [ ] **Step 1: Add required icons**

In `src/components/primitives.jsx`, add icon keys if missing:

```jsx
barcode: (
  <>
    <path d="M4 5v14M8 5v14M12 5v14M17 5v14M20 5v14" />
    <path d="M6 5v14M14 5v14" strokeWidth="1" />
  </>
),
package: (
  <>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </>
),
menu: <path d="M4 7h16M4 12h16M4 17h16" />,
```

- [ ] **Step 2: Create AppShell**

Create `src/components/AppShell.jsx`:

```jsx
import React from "react";
import { UserButton, useUser } from "@clerk/react";
import { Button, Icon } from "./primitives.jsx";
import { navGroups, routes } from "../shared.jsx";
import { usePOSStore } from "../pos/store.jsx";

function navIcon(icon) {
  if (icon === "box") return "package";
  return icon;
}

export default function AppShell({ children, pathname, onNavigate }) {
  const { user } = useUser();
  const { notice, clearNotice } = usePOSStore();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const go = (path) => {
    onNavigate(path);
    setMobileNavOpen(false);
  };

  return (
    <div className="h-svh overflow-hidden bg-app-bg p-2">
      <div className="flex h-full gap-2 overflow-hidden">
        <aside className="hidden h-full w-[236px] shrink-0 flex-col rounded-panel border border-border bg-surface shadow-panel md:flex">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <button type="button" onClick={() => go(routes.pos)} className="text-left text-lg font-bold text-text">
              Balanja
            </button>
          </div>
          <nav className="grid gap-2 p-2">
            {navGroups.flatMap((group) =>
              group.items.map(([label, icon, path]) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => go(path)}
                  className={`flex h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition ${
                    pathname === path ? "bg-accent text-white" : "text-text-muted hover:bg-surface-muted hover:text-text"
                  }`}
                >
                  <Icon name={navIcon(icon)} className="size-5" />
                  {label}
                </button>
              )),
            )}
          </nav>
          <div className="mt-auto border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-control border border-border bg-surface-muted p-2">
              <UserButton afterSignOutUrl="/" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{user?.fullName || "Cashier"}</p>
                <p className="truncate text-xs text-text-muted">{user?.primaryEmailAddress?.emailAddress || "Signed in"}</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
            <button type="button" onClick={() => setMobileNavOpen((open) => !open)} className="grid size-10 place-items-center rounded-control border border-border">
              <Icon name="menu" className="size-5" />
            </button>
            <button type="button" onClick={() => go(routes.pos)} className="text-base font-bold">
              Balanja
            </button>
            <UserButton afterSignOutUrl="/" />
          </header>

          {mobileNavOpen && (
            <div className="grid gap-2 border-b border-border p-2 md:hidden">
              {navGroups.flatMap((group) =>
                group.items.map(([label, icon, path]) => (
                  <Button key={path} variant={pathname === path ? "primary" : "secondary"} className="justify-start" onClick={() => go(path)}>
                    <Icon name={navIcon(icon)} className="size-4" />
                    {label}
                  </Button>
                )),
              )}
            </div>
          )}

          {notice && (
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-warning-soft px-4 py-2 text-sm font-medium text-warning">
              <span>{notice}</span>
              <button type="button" onClick={clearNotice} className="font-semibold">Dismiss</button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run domain tests**

Run:

```bash
npm run test
```

Expected: PASS. The production build checkpoint runs in Task 10 after all imported pages and components exist.

---

### Task 6: Barcode Scanner Component

**Files:**
- Create: `src/components/BarcodeScanner.jsx`

- [ ] **Step 1: Create scanner component**

Create `src/components/BarcodeScanner.jsx`:

```jsx
import React from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Icon, Input } from "./primitives.jsx";

export default function BarcodeScanner({ open, title = "Scan barcode", onDetected, onClose }) {
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);
  const [manualCode, setManualCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [scanning, setScanning] = React.useState(false);

  React.useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 250 });

    async function start() {
      setError("");
      setScanning(true);
      try {
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err, ctrl) => {
          if (result) {
            const text = result.getText();
            ctrl.stop();
            controlsRef.current = null;
            setScanning(false);
            onDetected(text);
          }
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setError("Camera unavailable. Enter barcode manually.");
          setScanning(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setScanning(false);
    };
  }, [open, onDetected]);

  if (!open) return null;

  const submitManual = (event) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (code) onDetected(code);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="grid w-full max-w-lg overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <p className="text-sm text-text-muted">{scanning ? "Point camera at a barcode." : "Camera fallback is ready."}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-control hover:bg-surface-muted">
            <Icon name="x" className="size-5" />
          </button>
        </header>
        <div className="grid gap-4 p-4">
          <div className="aspect-video overflow-hidden rounded-card border border-border bg-surface-muted">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          </div>
          {error && <p className="rounded-control border border-warning/20 bg-warning-soft px-3 py-2 text-sm font-medium text-warning">{error}</p>}
          <form onSubmit={submitManual} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label="Manual barcode"
              placeholder="8991001000011"
              inputProps={{ value: manualCode, onChange: (event) => setManualCode(event.target.value), inputMode: "numeric" }}
            />
            <Button type="submit" variant="primary" className="h-[42px]">
              Use code
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Manual scanner verification**

Run dev server:

```bash
npm run dev
```

Expected: scanner modal opens in POS and Products once those pages connect it. Denying camera shows manual fallback.

---

### Task 7: Retail POS Page

**Files:**
- Create: `src/pages/RetailPosPage.jsx`

- [ ] **Step 1: Create POS page**

Create `src/pages/RetailPosPage.jsx`:

```jsx
import React from "react";
import { useUser } from "@clerk/react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Badge, Button, Icon, Input } from "../components/primitives.jsx";
import { calculateCartTotals, retailCategories } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

export default function RetailPosPage() {
  const { user } = useUser();
  const store = usePOSStore();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("Semua");
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [cashReceived, setCashReceived] = React.useState("");

  const products = store.activeProducts.filter((product) => {
    const matchesCategory = category === "Semua" || product.category === category;
    const text = `${product.name} ${product.barcode}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  });
  const totals = calculateCartTotals(store.cart, store.settings);

  const checkout = () => {
    store.checkout(
      { method: paymentMethod, cashReceived: Number(cashReceived) },
      user?.fullName || user?.primaryEmailAddress?.emailAddress || "Cashier",
    );
    setCashReceived("");
  };

  return (
    <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_400px]">
      <main className="flex min-h-0 flex-col border-border xl:border-r">
        <div className="grid gap-4 border-b border-border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Input
              label="Search product"
              placeholder="Name or barcode"
              className="w-full max-w-xl"
              inputProps={{ value: query, onChange: (event) => setQuery(event.target.value) }}
            />
            <Button variant="primary" onClick={() => setScannerOpen(true)}>
              <Icon name="barcode" className="size-4" />
              Scan
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {retailCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`h-10 shrink-0 rounded-control px-4 text-sm font-semibold ${category === item ? "bg-accent text-white" : "bg-surface-muted text-text-muted"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid flex-1 auto-rows-max gap-2 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => store.addToCart(product.id)}
              disabled={product.stock <= 0}
              className="grid min-h-[132px] gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-low transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-base font-semibold text-text">{product.name}</p>
                  <p className="mt-1 font-mono text-xs text-text-subtle">{product.barcode}</p>
                </div>
                <Badge tone={product.stock <= 5 ? "warning" : "neutral"}>{product.stock} {product.unit}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{product.category}</span>
                <span className="font-mono text-base font-semibold">{formatPrice(product.price)}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      <aside className="flex min-h-0 flex-col overflow-y-auto bg-surface">
        <div className="border-b border-border p-4">
          <h1 className="text-xl font-semibold">Cart</h1>
          <p className="text-sm text-text-muted">{store.cart.length} item types</p>
        </div>
        <div className="grid gap-2 border-b border-border p-4">
          {store.cart.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-text-muted">Cart is empty</p>
          ) : (
            store.cart.map((item) => (
              <div key={item.productId} className="grid gap-2 rounded-card border border-border p-3">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="font-mono text-xs text-text-subtle">{formatPrice(item.price)}</p>
                  </div>
                  <button type="button" onClick={() => store.updateCartQty(item.productId, 0)} className="text-danger">
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <Button variant="secondary" className="size-9 p-0" onClick={() => store.updateCartQty(item.productId, item.qty - 1)}><Icon name="minus" className="size-4" /></Button>
                  <span className="text-center font-mono font-semibold">{item.qty}</span>
                  <Button variant="secondary" className="size-9 p-0" onClick={() => store.updateCartQty(item.productId, item.qty + 1)}><Icon name="plus" className="size-4" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-auto grid gap-3 p-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatPrice(totals.tax)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(totals.total)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={paymentMethod === "cash" ? "primary" : "secondary"} onClick={() => setPaymentMethod("cash")}>Cash</Button>
            <Button variant={paymentMethod === "qris" ? "primary" : "secondary"} onClick={() => setPaymentMethod("qris")}>QRIS</Button>
          </div>
          {paymentMethod === "cash" && (
            <Input
              label="Cash received"
              placeholder="150000"
              inputProps={{ value: cashReceived, onChange: (event) => setCashReceived(event.target.value), inputMode: "numeric" }}
            />
          )}
          {paymentMethod === "cash" && Number(cashReceived) >= totals.total && (
            <p className="rounded-control bg-success-soft px-3 py-2 text-sm font-semibold text-success">Change: {formatPrice(Number(cashReceived) - totals.total)}</p>
          )}
          {paymentMethod === "qris" && <p className="rounded-control bg-surface-muted px-3 py-2 text-sm font-medium text-text-muted">{store.settings.qrisLabel}</p>}
          <Button variant="primary" className="h-12 text-base" onClick={checkout} disabled={store.cart.length === 0}>Complete sale</Button>
          <Button variant="secondary" onClick={store.clearCart}>Clear cart</Button>
        </div>
      </aside>

      <BarcodeScanner
        open={scannerOpen}
        title="Scan product barcode"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          store.addToCart(code);
          setScannerOpen(false);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run build after all imports exist**

Run:

```bash
npm run build
```

Expected after Tasks 8-9: PASS.

---

### Task 8: Products Page

**Files:**
- Create: `src/pages/ProductsPage.jsx`

- [ ] **Step 1: Create product management page**

Create `src/pages/ProductsPage.jsx`:

```jsx
import React from "react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Badge, Button, Icon, Input } from "../components/primitives.jsx";
import { retailCategories } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

function emptyProduct() {
  return { id: "", name: "", barcode: "", category: "Sembako", price: 0, stock: 0, unit: "pcs", active: true };
}

export default function ProductsPage() {
  const store = usePOSStore();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  const products = store.products.filter((product) => `${product.name} ${product.barcode} ${product.category}`.toLowerCase().includes(query.toLowerCase()));

  const openNew = () => setEditing(emptyProduct());
  const save = (event) => {
    event.preventDefault();
    store.saveProduct(editing);
    setEditing(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-end lg:justify-between">
        <Input
          label="Search products"
          placeholder="Name, barcode, category"
          className="w-full max-w-xl"
          inputProps={{ value: query, onChange: (event) => setQuery(event.target.value) }}
        />
        <Button variant="primary" onClick={openNew}><Icon name="plus" className="size-4" />Add product</Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">
              <th className="h-10 px-3">Product</th>
              <th className="h-10 px-3">Barcode</th>
              <th className="h-10 px-3">Category</th>
              <th className="h-10 px-3">Price</th>
              <th className="h-10 px-3">Stock</th>
              <th className="h-10 px-3">Status</th>
              <th className="h-10 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border">
                <td className="px-3 py-3 font-semibold">{product.name}</td>
                <td className="px-3 py-3 font-mono text-xs text-text-muted">{product.barcode}</td>
                <td className="px-3 py-3">{product.category}</td>
                <td className="px-3 py-3 font-mono">{formatPrice(product.price)}</td>
                <td className="px-3 py-3">{product.stock} {product.unit}</td>
                <td className="px-3 py-3"><Badge tone={product.active ? "success" : "danger"}>{product.active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => store.deactivateProduct(product.id)}>Deactivate</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <form onSubmit={save} className="grid w-full max-w-xl gap-4 rounded-panel border border-border bg-surface p-4 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing.id ? "Edit product" : "Add product"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="grid size-10 place-items-center rounded-control hover:bg-surface-muted"><Icon name="x" className="size-5" /></button>
            </div>
            <Input label="Name" placeholder="Beras Ramos 5kg" inputProps={{ value: editing.name, onChange: (event) => setEditing({ ...editing, name: event.target.value }), required: true }} />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Input label="Barcode" placeholder="8991001000011" inputProps={{ value: editing.barcode, onChange: (event) => setEditing({ ...editing, barcode: event.target.value }), required: true }} />
              <Button type="button" variant="secondary" onClick={() => setScannerOpen(true)}><Icon name="barcode" className="size-4" />Scan</Button>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Category
              <select className="h-[42px] rounded-control border border-border bg-surface px-3" value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>
                {retailCategories.filter((item) => item !== "Semua").map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Price" placeholder="72000" inputProps={{ value: editing.price, onChange: (event) => setEditing({ ...editing, price: event.target.value }), inputMode: "numeric", required: true }} />
              <Input label="Stock" placeholder="18" inputProps={{ value: editing.stock, onChange: (event) => setEditing({ ...editing, stock: event.target.value }), inputMode: "numeric", required: true }} />
              <Input label="Unit" placeholder="pcs" inputProps={{ value: editing.unit, onChange: (event) => setEditing({ ...editing, unit: event.target.value }), required: true }} />
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} />
              Active
            </label>
            <Button type="submit" variant="primary">Save product</Button>
          </form>
        </div>
      )}

      <BarcodeScanner
        open={scannerOpen}
        title="Scan product barcode"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setEditing((current) => ({ ...current, barcode: code }));
          setScannerOpen(false);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Manual product verification**

Run:

```bash
npm run dev
```

Expected: create product, edit product, scan/manual barcode, deactivate product, and refresh persistence all work.

---

### Task 9: Transactions and Settings Pages

**Files:**
- Create: `src/pages/TransactionsPage.jsx`
- Create: `src/pages/SettingsPage.jsx`

- [ ] **Step 1: Create Transactions page**

Create `src/pages/TransactionsPage.jsx`:

```jsx
import React from "react";
import { Badge, Button, Icon } from "../components/primitives.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

export default function TransactionsPage() {
  const { transactions } = usePOSStore();
  const [selected, setSelected] = React.useState(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border p-4">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <p className="text-sm text-text-muted">{transactions.length} completed sales</p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">
              <th className="h-10 px-3">Number</th>
              <th className="h-10 px-3">Time</th>
              <th className="h-10 px-3">Items</th>
              <th className="h-10 px-3">Payment</th>
              <th className="h-10 px-3">Total</th>
              <th className="h-10 px-3">Status</th>
              <th className="h-10 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-border">
                <td className="px-3 py-3 font-mono font-semibold">{transaction.number}</td>
                <td className="px-3 py-3">{new Date(transaction.createdAt).toLocaleString("id-ID")}</td>
                <td className="px-3 py-3">{transaction.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                <td className="px-3 py-3 uppercase">{transaction.paymentMethod}</td>
                <td className="px-3 py-3 font-mono">{formatPrice(transaction.total)}</td>
                <td className="px-3 py-3"><Badge tone="success">{transaction.status}</Badge></td>
                <td className="px-3 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setSelected(transaction)}>Details</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="py-12 text-center text-sm font-medium text-text-muted">No transactions yet</p>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <section className="grid w-full max-w-lg gap-4 rounded-panel border border-border bg-surface p-4 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.number}</h2>
              <button type="button" onClick={() => setSelected(null)} className="grid size-10 place-items-center rounded-control hover:bg-surface-muted"><Icon name="x" className="size-5" /></button>
            </div>
            <div className="grid gap-2">
              {selected.items.map((item) => (
                <div key={item.productId} className="flex justify-between gap-3 rounded-control bg-surface-muted px-3 py-2 text-sm">
                  <span>{item.name} x{item.qty}</span>
                  <span className="font-mono">{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(selected.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatPrice(selected.tax)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatPrice(selected.total)}</span></div>
              {selected.paymentMethod === "cash" && <div className="flex justify-between"><span>Change</span><span>{formatPrice(selected.changeDue)}</span></div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create Settings page**

Create `src/pages/SettingsPage.jsx`:

```jsx
import React from "react";
import { Button, Input } from "../components/primitives.jsx";
import { usePOSStore } from "../pos/store.jsx";

export default function SettingsPage() {
  const store = usePOSStore();
  const [settings, setSettings] = React.useState(store.settings);

  const save = (event) => {
    event.preventDefault();
    store.updateSettings({ ...settings, taxRate: Number(settings.taxRate) });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <form onSubmit={save} className="grid max-w-2xl gap-5">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-text-muted">Store, tax, and manual QRIS details.</p>
        </div>
        <Input label="Store name" placeholder="Toko Balanja" inputProps={{ value: settings.storeName, onChange: (event) => setSettings({ ...settings, storeName: event.target.value }) }} />
        <Input label="Store address" placeholder="Jl. UMKM No. 1" inputProps={{ value: settings.storeAddress, onChange: (event) => setSettings({ ...settings, storeAddress: event.target.value }) }} />
        <label className="flex items-center gap-3 rounded-card border border-border bg-surface-muted p-4 text-sm font-semibold">
          <input type="checkbox" checked={settings.taxEnabled} onChange={(event) => setSettings({ ...settings, taxEnabled: event.target.checked })} />
          Enable tax
        </label>
        <Input label="Tax rate" placeholder="11" inputProps={{ value: settings.taxRate, onChange: (event) => setSettings({ ...settings, taxRate: event.target.value }), inputMode: "decimal" }} />
        <Input label="QRIS label" placeholder="QRIS Toko Balanja" inputProps={{ value: settings.qrisLabel, onChange: (event) => setSettings({ ...settings, qrisLabel: event.target.value }) }} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary">Save settings</Button>
          <Button type="button" variant="danger" onClick={() => window.confirm("Reset demo data?") && store.resetDemoData()}>Reset demo data</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify history and settings**

Run:

```bash
npm run dev
```

Expected: complete a sale, see it in Transactions, update Settings, refresh, and see settings persist.

---

### Task 10: Retail Design System Alignment and Final Verification

**Files:**
- Modify: `DESIGN.md`
- Modify: `src/pages/DesignSystemPage.jsx` only if it contains restaurant-only language that confuses the new MVP.
- Modify: `src/index.css` only for small responsive fixes found during verification.

- [ ] **Step 1: Update DESIGN.md product surface**

Replace the opening Product Surface paragraph in `DESIGN.md` with:

```markdown
Balanja is a retail point-of-sale surface for UMKM cashiers selling everyday goods quickly. The interface should stay dense, quiet, and scannable: white surfaces, soft borders, compact controls, clear product names, visible barcode/SKU details, Rupiah totals, and near-black primary checkout actions.
```

Update the layout section to say the production POS surface is retail checkout with a product list/grid and cart/payment summary.

- [ ] **Step 2: Run automated checks**

Run:

```bash
npm run test
npm run build
```

Expected:

- `npm run test`: all domain tests pass.
- `npm run build`: Vite production build succeeds.

- [ ] **Step 3: Manual desktop checks**

Run:

```bash
npm run dev
```

Open local dev server and verify:

- Signed-out users see Clerk sign-in.
- Signed-in users land on `/pos`.
- POS can search products.
- POS manual barcode fallback adds an item.
- Cash checkout with enough cash completes and records change.
- QRIS checkout completes without cash input.
- Stock decrements after checkout.
- Product create/edit/deactivate changes POS.
- Transactions detail panel opens.
- Settings persist after refresh.

- [ ] **Step 4: Manual responsive checks**

Inspect widths:

- 390px mobile.
- 768px tablet.
- 1440px desktop.

Expected:

- No overlapping nav, table, cart, modal, or button text.
- Product cards remain tappable.
- Cart is reachable on mobile.
- Product table scrolls horizontally instead of breaking layout.
- Scanner modal fits viewport.

- [ ] **Step 5: Commit when in a git worktree**

If inside a Git worktree:

```bash
git add DESIGN.md src package.json package-lock.json docs/superpowers/specs/2026-07-09-retail-pos-mvp-design.md docs/superpowers/plans/2026-07-09-retail-pos-mvp.md
git commit -m "feat: implement retail pos mvp"
```

---

## Plan Self-Review

Spec coverage:

- Clerk auth: Task 1 and Task 4.
- localStorage persistence: Task 3.
- POS checkout: Task 2 and Task 7.
- Products CRUD and barcode form scan: Task 6 and Task 8.
- Transactions history: Task 9.
- Settings: Task 9.
- Camera scanner and manual fallback: Task 6.
- Cash and manual QRIS: Task 2 and Task 7.
- Retail UMKM design alignment: Task 2, Task 7, Task 8, Task 10.
- Responsive verification: Task 10.

Known implementation constraint:

- This folder is not currently a Git repository, so commit steps only apply if the plan is executed in a Git worktree.
