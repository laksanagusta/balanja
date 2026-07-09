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
    cart: [
      {
        productId: "prod-rice-5kg",
        name: "Beras Ramos 5kg",
        barcode: "8991001000011",
        price: 72000,
        qty: 2,
      },
    ],
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
