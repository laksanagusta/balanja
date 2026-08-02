import test from "node:test";
import assert from "node:assert/strict";
import { clearCartStorage, loadCart, saveCart } from "./cart-storage.js";

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

test("saveCart persists variantId and variantAttributes per line", () => {
  const storage = memoryStorage();
  const cart = [
    {
      productId: "p1",
      variantId: "v1",
      variantAttributes: { Ukuran: "M" },
      name: "Minuman",
      price: 8000,
      qty: 2,
    },
    {
      productId: "p2",
      variantId: "",
      variantAttributes: null,
      name: "Beras",
      price: 72000,
      qty: 1,
    },
  ];

  saveCart(cart, storage);
  const loaded = loadCart(storage);

  assert.deepEqual(loaded, cart);
});

test("clearCartStorage removes the persisted cart", () => {
  const storage = memoryStorage();
  saveCart([{ productId: "p1", qty: 1 }], storage);
  clearCartStorage(storage);
  assert.deepEqual(loadCart(storage), []);
});

test("loadCart returns empty array on corrupt data", () => {
  const storage = memoryStorage();
  storage.setItem("balanja-retail-cart-v1", "{not-json");
  assert.deepEqual(loadCart(storage), []);
});
