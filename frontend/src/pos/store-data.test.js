import test from "node:test";
import assert from "node:assert/strict";
import { applyCheckoutResult, loadProducts, loadSettings, loadStockMovements, loadTransactions, toProductPayload } from "./store-data.js";

test("loads products without fetching unrelated POS resources", async () => {
  const calls = [];
  const api = {
    listProducts: async () => { calls.push("products"); return [{ id: "p1" }]; },
  };
  const result = await loadProducts(api);
  assert.deepEqual(calls, ["products"]);
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
      return { items: [{ id: "m1", quantityDelta: "5", stockBefore: "10", stockAfter: "15" }], nextCursor: "next" };
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
  });
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
