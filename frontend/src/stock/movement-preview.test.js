import test from "node:test";
import assert from "node:assert/strict";
import { calculateStockPreview, parseQuantityInput } from "./movement-preview.js";

test("parseQuantityInput strips thousand separators", () => {
  assert.equal(parseQuantityInput("1,250"), 1250);
  assert.equal(parseQuantityInput("1.250"), 1250);
  assert.equal(parseQuantityInput("12 500"), 12500);
});

test("calculateStockPreview handles restock reduce and set exact", () => {
  assert.deepEqual(calculateStockPreview({ type: "restock", currentStock: 10, quantity: 4 }), { delta: 4, stockAfter: 14, isValid: true });
  assert.deepEqual(calculateStockPreview({ type: "reduce", currentStock: 10, quantity: 4 }), { delta: -4, stockAfter: 6, isValid: true });
  assert.deepEqual(calculateStockPreview({ type: "set_exact", currentStock: 10, quantity: 4 }), { delta: -6, stockAfter: 4, isValid: true });
});

test("calculateStockPreview rejects negative final stock and no-op set exact", () => {
  assert.equal(calculateStockPreview({ type: "reduce", currentStock: 3, quantity: 4 }).isValid, false);
  assert.equal(calculateStockPreview({ type: "set_exact", currentStock: 3, quantity: 3 }).isValid, false);
});
