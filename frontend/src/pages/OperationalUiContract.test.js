import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("operational search fields use the thin shared focus treatment", async () => {
  const files = ["RetailPosPage.jsx", "ProductsPage.jsx", "StockPage.jsx", "TransactionsPage.jsx"];
  const sources = await Promise.all(files.map((file) => readFile(new URL(`./${file}`, import.meta.url), "utf8")));

  for (const source of sources) {
    assert.match(source, /focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus\/30/);
  }
});

test("stock creation is the toolbar primary action", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");
  const labelAt = source.indexOf("Pergerakan baru");
  const button = source.slice(source.lastIndexOf("<Button", labelAt), labelAt);
  assert.match(button, /variant="primary"/);
  assert.match(button, /<Icon name="plus"/);
});

test("transaction filters follow the stock-style responsive toolbar grid", async () => {
  const source = await readFile(new URL("./TransactionsPage.jsx", import.meta.url), "utf8");

  assert.match(source, /lg:grid-cols-\[auto_1fr_auto\]/);
  assert.match(source, /className="w-full lg:w-auto"/);
  assert.match(source, /triggerClassName="w-full justify-center lg:w-auto"/);
  assert.doesNotMatch(source, /<header className="flex flex-wrap/);
});

test("product filters follow the stock-style responsive toolbar grid", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");

  assert.match(source, /lg:grid-cols-\[auto_1fr_auto_auto_auto\]/);
  assert.match(source, /className="w-full lg:w-\[160px\]"/);
  assert.match(source, /className="w-full lg:w-\[130px\]"/);
  assert.match(source, /className="w-full whitespace-nowrap lg:w-auto lg:justify-self-end"/);
  assert.doesNotMatch(source, /<header className="flex flex-wrap/);
});

test("touch-device fields prevent focus zoom without disabling user zoom", async () => {
  const [css, html] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);

  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\)/);
  assert.match(css, /input:not\(\[type="checkbox"\]\)[\s\S]*textarea,[\s\S]*select\s*\{[\s\S]*font-size:\s*16px/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
});
