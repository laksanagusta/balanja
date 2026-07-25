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
