import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("table headers and values use the same cell inset", async () => {
  const source = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");

  assert.match(source, /className={`h-11 whitespace-nowrap px-3/);
  assert.match(source, /className={`h-11 px-3 text-text/);
  assert.doesNotMatch(source, /items-center gap-1\.5 rounded-control px-1\.5/);
  assert.doesNotMatch(source, /items-center px-1\.5/);
});

test("operational tables do not repeat page context in card headers", async () => {
  const pageUrls = [
    new URL("../pages/ProductsPage.jsx", import.meta.url),
    new URL("../pages/StockPage.jsx", import.meta.url),
    new URL("../pages/TransactionsPage.jsx", import.meta.url),
  ];
  const sources = await Promise.all(pageUrls.map((url) => readFile(url, "utf8")));

  assert.doesNotMatch(sources[0], /Product catalog|Sortable retail product rows/);
  assert.doesNotMatch(sources[1], /Movement history|Semua perubahan stock tercatat append-only/);
  assert.doesNotMatch(sources[2], /Transaction history|Sortable rows with payment method/);
  sources.forEach((source) => {
    assert.doesNotMatch(source, /className=\{?`?px-2[^\n]*transition-opacity/);
  });
});
