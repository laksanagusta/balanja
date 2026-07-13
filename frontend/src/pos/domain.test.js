import test from "node:test";
import assert from "node:assert/strict";
import {
  addSavedProductToCart,
  addProductToCart,
  calculateCartTotals,
  formatIDR,
  parseNumberInput,
  validateScannedProduct,
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

test("validateProduct blocks a zero price", () => {
  const result = validateProduct(
    {
      id: "new-product",
      name: "Beras Baru",
      barcode: "8991001000999",
      category: "Sembako",
      price: 0,
      stock: 4,
      unit: "",
      active: true,
    },
    products,
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.price, "Price must be at least 1");
  assert.equal(result.errors.unit, "Unit is required");
});

test("validateProduct accepts thousand-separated numeric fields", () => {
  const result = validateProduct(
    {
      id: "new-product",
      name: "Beras Baru",
      barcode: "8991001000999",
      category: "Sembako",
      price: "72.000",
      stock: "1.250",
      unit: "pack",
      active: true,
    },
    products,
  );

  assert.equal(result.ok, true);
  assert.equal(parseNumberInput("72.000"), 72000);
  assert.equal(parseNumberInput("1.250"), 1250);
});

test("validateScannedProduct requires a sellable stock quantity and unit", () => {
  const result = validateScannedProduct(
    {
      id: "",
      name: "Produk Baru",
      barcode: "8991001000999",
      category: "Sembako",
      price: 0,
      stock: 0,
      unit: "",
      active: true,
    },
    products,
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.price, "Price must be at least 1");
  assert.equal(result.errors.stock, "Stock must be at least 1 to add this product to cart");
  assert.equal(result.errors.unit, "Unit is required");
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

test("addSavedProductToCart adds a newly saved product without a second lookup", () => {
  const product = {
    id: "prod-new-tea",
    name: "Teh Botol",
    barcode: "8991001000999",
    category: "Minuman",
    price: 4500,
    stock: 4,
    unit: "botol",
    active: true,
  };

  const result = addSavedProductToCart([], products, product);

  assert.equal(result.ok, true);
  assert.equal(result.cart[0].productId, "prod-new-tea");
});

test("addProductToCart blocks out of stock products", () => {
  const result = addProductToCart([], products, "8991001000028");

  assert.equal(result.ok, false);
  assert.equal(result.error, "Product is out of stock");
});

test("addProductToCart blocks quantities above available stock", () => {
  const result = addProductToCart(
    [{ productId: "prod-rice-5kg", name: "Beras Ramos 5kg", barcode: "8991001000011", price: 72000, qty: 3 }],
    products,
    "prod-rice-5kg",
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "Cart quantity exceeds stock");
  assert.deepEqual(result.cart, [
    { productId: "prod-rice-5kg", name: "Beras Ramos 5kg", barcode: "8991001000011", price: 72000, qty: 3 },
  ]);
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
