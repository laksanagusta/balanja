import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("operational search fields use the thin shared focus treatment", async () => {
  const files = ["ProductsPage.jsx", "StockPage.jsx", "TransactionsPage.jsx"];
  const sources = await Promise.all(files.map((file) => readFile(new URL(`./${file}`, import.meta.url), "utf8")));
  sources.push(await readFile(new URL("../components/pos/PosFilterDrawer.jsx", import.meta.url), "utf8"));

  for (const source of sources) {
    assert.match(source, /focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus\/30/);
  }
});

test("stock creation matches the round product add action", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");
  const labelAt = source.indexOf("Pergerakan baru");
  const button = source.slice(source.lastIndexOf("<button", labelAt), source.indexOf("</button>", labelAt));
  assert.match(button, /aria-label="Pergerakan baru"/);
  assert.match(button, /size-11/);
  assert.match(button, /rounded-full bg-accent text-white/);
  assert.match(button, /<Icon name="plus" className="size-5"/);
});

test("stock activity fills the canvas and appends six rows without a footer", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");

  assert.match(source, /initialPageSize: 6/);
  assert.match(source, /table\.loadMore\(\)/);
  assert.match(source, /hasMoreMovements=\{table\.hasMore\}/);
  assert.doesNotMatch(source, /TablePagination/);
  assert.doesNotMatch(source, /max-w-4xl/);
  assert.doesNotMatch(source, /border-b border-border px-4 py-3/);
});

test("stock movement type uses the product-style top-bar filter drawer", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /app-top-bar-actions/);
  assert.match(source, /StockFilterDrawer/);
  assert.doesNotMatch(source, /movementFilterOptions/);
});

test("transaction filters use the product-style draft-and-apply drawer", async () => {
  const source = await readFile(new URL("./TransactionsPage.jsx", import.meta.url), "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /app-top-bar-actions/);
  assert.match(source, /TransactionFilterDrawer/);
  assert.doesNotMatch(source, /TableFilterPopover/);
  assert.match(source, /TransactionCardList/);
  assert.doesNotMatch(source, /DataTable/);
  assert.match(source, /initialPageSize: 6/);
  assert.match(source, /table\.loadMore\(\)/);
  assert.match(source, /Muat lebih banyak/);
  assert.doesNotMatch(source, /TablePagination/);
});

test("product controls keep the smartphone list toolbar at every width", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /lg:grid-cols|lg:w-|lg:ml-auto|lg:justify-self-end/);
  assert.match(source, /mobile-search-control flex h-11/);
  assert.match(source, /aria-label="Tambah produk"/);
  assert.match(source, /ProductFilterDrawer/);
  assert.doesNotMatch(source, /ProductCategoryPills/);
  assert.match(source, /<div className="grid w-full">/);
  assert.match(source, /<div className="grid w-full gap-3">/);
  assert.doesNotMatch(source, /max-w-3xl/);
  assert.doesNotMatch(source, /<header className="border-b border-border/);
  assert.doesNotMatch(source, /DataTable/);
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
