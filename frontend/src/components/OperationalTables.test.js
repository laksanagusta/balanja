import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("table headers and values use the same cell inset", async () => {
  const source = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");

  assert.match(source, /className={`h-11 whitespace-nowrap[^`]*px-3/);
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

test("shared tables compose accessible translucent scroll fades", async () => {
  const primitives = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  const scrollEdge = await readFile(new URL("./ScrollEdge.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(primitives, /<ScrollEdge>[\s\S]*<table/);
  assert.match(primitives, /<div className={`data-table-frame min-w-0 w-full \$\{className\}`}>/);
  assert.match(primitives, /<table className="min-w-max w-full border-separate border-spacing-0 text-sm">/);
  assert.match(primitives, /<tr>\s*\{columns\.map/);
  assert.match(primitives, /className={`h-11 whitespace-nowrap border-b border-border px-3/);
  assert.match(primitives, /i === data\.length - 1 \? "border-b-0" : "border-b border-border"/);
  assert.doesNotMatch(primitives, /showEdgeBlur|edgeBlurEnabled/);
  assert.match(scrollEdge, /getScrollEdgeState/);
  assert.match(scrollEdge, /ResizeObserver/);
  assert.match(scrollEdge, /window\.addEventListener\("resize"/);
  assert.match(scrollEdge, /aria-hidden="true"/);
  assert.match(scrollEdge, /data-scroll-edge="inline-start"/);
  assert.match(scrollEdge, /data-scroll-edge="inline-end"/);
  assert.match(css, /\.scroll-edge-overlay/);
  assert.match(css, /inline-size:\s*32px/);
  assert.match(css, /\.data-table-frame[\s\S]*overflow:\s*clip/);
  assert.match(css, /\.data-table-frame,[\s\S]*\.scroll-edge[\s\S]*border-radius:\s*inherit/);
  assert.doesNotMatch(css, /\.data-table-frame::after/);
  assert.doesNotMatch(css, /\.scroll-edge-overlay::before/);
  assert.match(css, /inset-block:\s*0/);
  assert.doesNotMatch(css, /\.scroll-edge-overlay(?:-start|-end)?(?:\s|::before)*\{[^}]*backdrop-filter/s);
  assert.doesNotMatch(css, /\.scroll-edge-overlay(?:-start|-end)?::before/);
  assert.match(css, /inset-inline-start:\s*0/);
  assert.match(css, /inset-inline-end:\s*0/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*\.scroll-edge-overlay/);
  assert.match(css, /@media \(prefers-contrast: more\)[\s\S]*\.scroll-edge-overlay/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.scroll-edge-overlay/);
});
