import test from "node:test";
import assert from "node:assert/strict";
import { applyCheckoutResult, loadPOSData, toProductPayload } from "./store-data.js";

test("loads independent POS resources in parallel", async () => {
  const calls = [];
  const api = {
    listProducts: async () => { calls.push("products"); return [{ id: "p1" }]; },
    listTransactions: async () => { calls.push("transactions"); return { items: [{ id: "t1" }] }; },
    getSettings: async () => { calls.push("settings"); return { storeName: "Store" }; },
  };
  const result = await loadPOSData(api);
  assert.deepEqual(calls.sort(), ["products", "settings", "transactions"]);
  assert.deepEqual(result, { products: [{ id: "p1" }], transactions: [{ id: "t1" }], settings: { storeName: "Store" } });
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
});
