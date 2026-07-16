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
  assert.doesNotMatch(source, /showStepper|allowRepeatAdd/);
});
