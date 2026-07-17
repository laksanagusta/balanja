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
  assert.match(source, /const blocked = disabled \|\| outOfStock/);
  assert.match(source, /const buttonLabel = outOfStock \? "Stok habis" : actionLabel/);
  assert.doesNotMatch(source, /showStepper|allowRepeatAdd/);
});

test("cart controls and payment choices expose accessible state", async () => {
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const product = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");
  const payment = await readFile(new URL("./PaymentSummary.jsx", import.meta.url), "utf8");

  assert.match(cart, /aria-label="Decrease quantity"/);
  assert.match(cart, /aria-label="Increase quantity"/);
  assert.match(product, /aria-label="Kurangi jumlah"/);
  assert.match(product, /aria-label="Tambah jumlah"/);
  assert.match(payment, /aria-pressed=\{paymentMethod === method\.id\}/);
});

test("product add feedback is announced without exposing decoration", async () => {
  const product = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");

  assert.match(product, /role="status"/);
  assert.match(product, /aria-live="polite"/);
});

test("product catalog defers filtering and contains off-screen cards", async () => {
  const catalog = await readFile(new URL("./ProductCatalog.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  assert.match(catalog, /React\.memo/);
  assert.match(catalog, /React\.useDeferredValue/);
  assert.match(catalog, /React\.useMemo/);
  assert.match(catalog, /const remainingStock = Math\.max\(Number\(product\.stock\) - qtyInCart, 0\)/);
  assert.match(catalog, /disabled=\{remainingStock <= 0 \|\| checkoutPending\}/);
  assert.match(catalog, /<PosProductCard/);
  assert.match(css, /\.pos-product-card[\s\S]*content-visibility:\s*auto/);
});
