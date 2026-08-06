import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("operational search fields use the thin shared focus treatment", async () => {
  const files = ["ProductsPage.jsx", "StockPage.jsx"];
  const sources = await Promise.all(files.map((file) => readFile(new URL(`./${file}`, import.meta.url), "utf8")));
  const transactions = await readFile(new URL("./TransactionsPage.jsx", import.meta.url), "utf8");
  const products = sources[0];
  sources.push(await readFile(new URL("../components/pos/PosFilterDrawer.jsx", import.meta.url), "utf8"));

  for (const source of sources) {
    assert.match(source, /focus-within:outline-1 focus-within:outline-focus\/30/);
  }
  assert.match(products, /bg-surface px-3\.5 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/20 focus-within:outline-1/);
  assert.match(transactions, /bg-surface px-3\.5 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/20 focus-within:outline-1/);
});

test("stock creation matches the round product add action", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");
  const labelAt = source.indexOf("Pergerakan baru");
  const button = source.slice(source.lastIndexOf("<button", labelAt), source.indexOf("</button>", labelAt));
  assert.match(button, /aria-label="Pergerakan baru"/);
  assert.match(button, /size-11/);
  assert.match(button, /rounded-full bg-accent text-white/);
  assert.match(button, /<Icon name="plus" className="size-5"/);
  assert.match(button, /strokeWidth=\{3\} strokeLinecap="round" strokeLinejoin="round"/);
  assert.match(button, /app-shell-floating-action fixed right-4/);
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

test("stock movement selects and submits a product variant", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");

  assert.match(source, /variantId/);
  assert.match(source, /selectedVariant/);
  assert.match(source, /onSubmit\(\{ productId, variantId/);
});

test("stock movement submit uses the Family-like primary CTA hierarchy", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");

  const submitButtonStart = source.indexOf('<Button type="submit"');
  assert.equal(submitButtonStart, -1);
  assert.match(source, /type="submit"[\s\S]{0,240}size="md"[\s\S]{0,120}className="w-full"/);
});

test("stock movement picker exposes a keyboard combobox and inline recovery states", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");
  const store = await readFile(new URL("../pos/store.jsx", import.meta.url), "utf8");

  assert.match(source, /<label id=\{labelId\} htmlFor=\{inputId\}>\{label\}<\/label>/);
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-activedescendant/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /Mencari…/);
  assert.match(source, /role="alert" className="rounded-control border border-danger/);
  assert.match(store, /return fetchProductSearch\(api, \{ q, limit, signal \}\);/);
});

test("stock keeps filtered, announced, and loading states aligned with the settled ledger", async () => {
  const source = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");
  const overview = await readFile(new URL("../components/stock/StockOverview.jsx", import.meta.url), "utf8");
  const skeleton = await readFile(new URL("../components/page-loading.jsx", import.meta.url), "utf8");

  assert.match(source, /hasMovementFilters=\{hasMovementFilters\}/);
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(source, /getStockErrorMessage/);
  assert.match(overview, /title="Tidak ada aktivitas yang cocok"/);
  assert.match(overview, /role="alert"/);
  assert.match(skeleton, /export function StockPageSkeleton/);
  assert.match(skeleton, /<main className="bg-app-bg p-4">/);
  assert.match(skeleton, /\[5, 6\]/);
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

test("all operational forms use eight-pixel field spacing", async () => {
  const [products, settings, stock, report, scanner] = await Promise.all([
    readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8"),
    readFile(new URL("./SettingsPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("./StockPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/reports/SalesReportToolbar.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/BarcodeScanner.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(products, /<form id="product-form"[^>]*className="grid text-text"/);
  assert.match(products, /max-w-xl gap-2 py-5/);
  assert.match(settings, /<form onSubmit=\{save\} className="settings-profile-form grid gap-4"/);
  assert.match(settings, /settings-profile-form[\s\S]{0,160}<div className="grid gap-2">/);
  assert.match(stock, /<form id="stock-movement-form"[^>]*className="grid gap-2 text-text">\s*<div className="grid gap-2">/);
  assert.match(report, /<form className="grid shrink-0 gap-2/);
  assert.match(report, /<div className="grid gap-2">/);
  assert.match(scanner, /<form onSubmit=\{submitManual\} className="flex gap-2"/);
});

test("stock movement dialog follows shared input radius and borderless preview surface", async () => {
  const stock = await readFile(new URL("./StockPage.jsx", import.meta.url), "utf8");

  assert.match(stock, /mobile-search-control flex h-11 items-center gap-3 rounded-control bg-surface px-3\.5 smooth-shadow-ring-xs/);
  assert.doesNotMatch(stock, /mobile-search-control flex h-11 items-center gap-3 rounded-card border/);
  assert.match(stock, /grid grid-cols-3 gap-2 rounded-card bg-surface-muted p-3/);
  assert.doesNotMatch(stock, /grid grid-cols-3 gap-2 rounded-card border border-border bg-surface-muted p-3/);
});
