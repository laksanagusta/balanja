import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyCheckoutResult, loadProducts, loadSettings, loadStockMovementPage, loadStockMovements, loadTransactionPage, loadTransactions, searchProducts, toProductFormData, toProductPayload } from "./store-data.js";

test("catalog page loading does not replace the shared POS products", async () => {
  const source = await readFile(new URL("../pages/ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /useCursorTable/);
  assert.match(source, /store\.api\.listProducts/);
  assert.doesNotMatch(source, /store\.loadProducts\(\{ force: true/);
});

test("transactions use a page-local cursor query", async () => {
  const source = await readFile(new URL("../pages/TransactionsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /useCursorTable/);
  assert.match(source, /TableFilterPopover/);
  assert.doesNotMatch(source, /store\.transactions\.filter/);
  assert.doesNotMatch(source, /sortRows/);
});

test("stock history uses server cursor sorting", async () => {
  const source = await readFile(new URL("../pages/StockPage.jsx", import.meta.url), "utf8");
  assert.match(source, /useCursorTable/);
  assert.doesNotMatch(source, /sortRows/);
  assert.doesNotMatch(source, /loadStockMovements/);
});

test("loads products without fetching unrelated POS resources", async () => {
  const calls = [];
  const api = {
    listProducts: async (options) => {
      calls.push(options);
      if (!options.cursor) return { items: [{ id: "p1" }], nextCursor: "products-next", hasNextPage: true };
      return { items: [{ id: "p2" }], nextCursor: "", hasNextPage: false };
    },
  };
  const result = await loadProducts(api);
  assert.deepEqual(calls, [
    { limit: 100, cursor: "" },
    { limit: 100, cursor: "products-next" },
  ]);
  assert.deepEqual(result, [{ id: "p1" }, { id: "p2" }]);
});

test("product picker search unwraps only its requested page", async () => {
  const calls = [];
  const api = {
    listProducts: async (options) => {
      calls.push(options);
      return { items: [{ id: "p1" }], nextCursor: "products-next", hasNextPage: true };
    },
  };

  const result = await searchProducts(api, { q: "tea", limit: 6 });

  assert.deepEqual(calls, [{ q: "tea", limit: 6 }]);
  assert.deepEqual(result, [{ id: "p1" }]);
});

test("loads transactions without fetching products or settings", async () => {
  const calls = [];
  const api = {
    listTransactions: async () => {
      calls.push("transactions");
      return { items: [{ id: "t1", items: [{ productId: "p1", quantity: 2 }] }, { id: "t2", items: null }] };
    },
  };
  const result = await loadTransactions(api);
  assert.deepEqual(calls, ["transactions"]);
  assert.deepEqual(result, [
    { id: "t1", items: [{ productId: "p1", quantity: 2, qty: 2 }] },
    { id: "t2", items: [] },
  ]);
});

test("normalizes transaction page items without losing pagination metadata", async () => {
  const api = {
    listTransactions: async () => ({
      items: [{ id: "t1", items: [{ productId: "p1", quantity: 2 }] }],
      nextCursor: "transactions-next",
      hasNextPage: true,
    }),
  };

  const page = await loadTransactionPage(api, { limit: 20 });

  assert.deepEqual(page, {
    items: [{ id: "t1", items: [{ productId: "p1", quantity: 2, qty: 2 }] }],
    nextCursor: "transactions-next",
    hasNextPage: true,
  });
});

test("loads settings without fetching products or transactions", async () => {
  const calls = [];
  const api = {
    getSettings: async () => { calls.push("settings"); return { storeName: "Store" }; },
  };
  const result = await loadSettings(api);
  assert.deepEqual(calls, ["settings"]);
  assert.deepEqual(result, { storeName: "Store" });
});

test("loads stock movements without fetching unrelated resources", async () => {
  const calls = [];
  const signal = AbortSignal.timeout(1000);
  const api = {
    listStockMovements: async (filters, options) => {
      calls.push(["stock", filters, options]);
			return { items: [{ id: "m1", quantityDelta: "5", stockBefore: "10", stockAfter: "15" }], nextCursor: "next", hasNextPage: true };
    },
  };
  const result = await loadStockMovements(api, { q: "tea", signal });
  assert.deepEqual(calls, [["stock", { q: "tea" }, { signal }]]);
  assert.deepEqual(result, {
    items: [{
      id: "m1",
      productId: undefined,
      productName: "Unknown product",
      productBarcode: "",
      productCategory: "",
      productUnit: "pcs",
      type: undefined,
      quantityDelta: 5,
      stockBefore: 10,
      stockAfter: 15,
      reason: "",
      referenceType: "",
      referenceId: "",
      createdByUserId: "",
      createdAt: undefined,
    }],
		nextCursor: "next",
		hasNextPage: true,
	});
});

test("normalizes stock movement page items without losing pagination metadata", async () => {
  const api = {
    listStockMovements: async () => ({
      items: [{ id: "m1", quantityDelta: "5", stockAfter: "15" }],
      nextCursor: "stock-next",
      hasNextPage: true,
    }),
  };

  const page = await loadStockMovementPage(api, { limit: 20 });

  assert.equal(page.items[0].quantityDelta, 5);
  assert.equal(page.items[0].stockAfter, 15);
  assert.equal(page.nextCursor, "stock-next");
  assert.equal(page.hasNextPage, true);
});

test("applies authoritative checkout stock returned by server", () => {
  const result = applyCheckoutResult([{ id: "p1", stock: 9 }, { id: "p2", stock: 4 }], {
    products: [{ id: "p1", stock: 7, updatedAt: "now" }],
  });
  assert.deepEqual(result, [{ id: "p1", stock: 7, updatedAt: "now" }, { id: "p2", stock: 4 }]);
});

test("product update payload never contains stock", () => {
  const payload = toProductPayload({ name: "Tea", barcode: "1", category: "Drink", price: 10, stock: 99, unit: "pcs", image: "", active: true }, false);
  assert.equal("stock" in payload, false);
  assert.equal(payload.active, true);
});

test("product create payload never contains active", () => {
  const payload = toProductPayload({ name: "Tea", barcode: "1", category: "Drink", price: 10, stock: 99, unit: "pcs", image: "", active: false }, true);
  assert.equal(payload.stock, 99);
  assert.equal("active" in payload, false);
});

test("product payload converts thousand-separated inputs to numbers", () => {
  const payload = toProductPayload({ name: "Tea", barcode: "1", category: "Drink", price: "72.000", stock: "1.250", unit: "pcs", image: "" }, true);
  assert.equal(payload.price, 72000);
  assert.equal(payload.stock, 1250);
});

test("product form data carries one photo and create-only stock", () => {
  const file = new File(["png"], "rice.png", { type: "image/png" });
  const form = toProductFormData({ name: "Rice", barcode: "1", category: "Sembako", price: 10, stock: 2, unit: "pcs", imageFile: file }, true);
  assert.equal(form.get("name"), "Rice");
  assert.equal(form.get("stock"), "2");
  assert.equal(form.get("image_file").name, "rice.png");
  assert.equal(form.get("image_file").type, "image/png");
  assert.equal(form.has("image"), false);
});

test("product form data sends removal intent without a file", () => {
  const form = toProductFormData({ name: "Rice", barcode: "1", category: "Sembako", price: 10, unit: "pcs", active: true, removeImage: true }, false);
  assert.equal(form.get("remove_image"), "true");
  assert.equal(form.has("image_file"), false);
  assert.equal(form.has("stock"), false);
});

test("product saves can rethrow API errors for field-level feedback", async () => {
  const source = await readFile(new URL("./store.jsx", import.meta.url), "utf8");
  assert.match(source, /throwOnError/);
  assert.match(source, /if \(throwOnError\) throw error/);
});
