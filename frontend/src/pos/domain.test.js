import test from "node:test";
import assert from "node:assert/strict";
import {
  addSavedProductToCart,
  addProductToCart,
  calculateCartTotals,
  formatIDR,
  formatVariantAttributes,
  parseNumberInput,
  validateScannedProduct,
  validateProduct,
  variantKey,
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
      categoryId: "cat-1",
      price: 70000,
      stock: 4,
      unitId: "unit-1",
      active: true,
    },
    products,
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.barcode, "Barcode sudah digunakan.");
});

test("validateProduct blocks a zero price", () => {
  const result = validateProduct(
    {
      id: "new-product",
      name: "Beras Baru",
      barcode: "8991001000999",
      categoryId: "cat-1",
      price: 0,
      stock: 4,
      unitId: "",
      active: true,
    },
    products,
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.price, "Harga minimal Rp1.");
  assert.equal(result.errors.unitId, "Satuan wajib dipilih.");
});

test("validateProduct accepts thousand-separated numeric fields", () => {
  const result = validateProduct(
    {
      id: "new-product",
      name: "Beras Baru",
      barcode: "8991001000999",
      categoryId: "cat-1",
      price: "72.000",
      stock: "1.250",
      unitId: "unit-1",
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
      categoryId: "cat-1",
      price: 0,
      stock: 0,
      unitId: "",
      active: true,
    },
    products,
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.price, "Harga minimal Rp1.");
  assert.equal(result.errors.stock, "Stok minimal 1 untuk menambahkan produk ke kasir.");
  assert.equal(result.errors.unitId, "Satuan wajib dipilih.");
});

test("addProductToCart adds by barcode and respects stock", () => {
  const result = addProductToCart([], products, "8991001000011");

  assert.equal(result.ok, true);
  assert.equal(result.product.name, "Beras Ramos 5kg");
  assert.equal(result.quantity, 1);
  assert.deepEqual(result.cart, [
    {
      productId: "prod-rice-5kg",
      variantId: "",
      variantAttributes: null,
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

function variantProduct() {
  return {
    id: "p1",
    name: "Minuman",
    price: 8000,
    stock: 0,
    active: true,
    attributesConfig: [{ name: "Ukuran", options: ["M", "L"] }],
    variants: [
      { id: "v1", attributes: { Ukuran: "M" }, price: 8000, stock: 5, active: true },
      { id: "v2", attributes: { Ukuran: "L" }, price: 10000, stock: 0, active: true },
    ],
  };
}

test("addProductToCart requires variant when more than one variant exists", () => {
  const result = addProductToCart([], [variantProduct()], "p1");

  assert.equal(result.ok, false);
  assert.equal(result.error, "Select a variant");
});

test("addProductToCart adds chosen variant as separate line", () => {
  const product = variantProduct();
  const result = addProductToCart([], [product], "p1", product.variants[0]);

  assert.equal(result.ok, true);
  assert.equal(result.cart[0].productId, "p1");
  assert.equal(result.cart[0].variantId, "v1");
  assert.equal(result.cart[0].price, 8000);
  assert.deepEqual(result.cart[0].variantAttributes, { Ukuran: "M" });
});

test("addProductToCart resolves a variant barcode directly", () => {
  const product = variantProduct();
  product.variants[0].barcode = "VARIANT-M";

  const result = addProductToCart([], [product], "VARIANT-M");

  assert.equal(result.ok, true);
  assert.equal(result.cart[0].productId, "p1");
  assert.equal(result.cart[0].variantId, "v1");
});

test("addProductToCart treats different variants as separate cart lines", () => {
  const product = variantProduct();
  const stocked = { ...product.variants[1], stock: 7 };
  const first = addProductToCart([], [product], "p1", product.variants[0]);
  const second = addProductToCart(first.cart, [product], "p1", stocked);

  assert.equal(second.ok, true);
  assert.equal(second.cart.length, 2);
});

test("addProductToCart blocks out-of-stock variant", () => {
  const product = variantProduct();
  const result = addProductToCart([], [product], "p1", product.variants[1]);

  assert.equal(result.ok, false);
  assert.equal(result.error, "Product is out of stock");
});

test("variantKey distinguishes product and variant combinations", () => {
  assert.notEqual(variantKey("p1", "v1"), variantKey("p1", "v2"));
  assert.notEqual(variantKey("p1", "v1"), variantKey("p2", "v1"));
  assert.equal(variantKey("p1", null), variantKey("p1", ""));
});

test("formatVariantAttributes renders key value pairs", () => {
  assert.equal(formatVariantAttributes({ Ukuran: "M", Sugar: "Normal" }), "Ukuran: M, Sugar: Normal");
  assert.equal(formatVariantAttributes(null), "");
  assert.equal(formatVariantAttributes({}), "");
});
