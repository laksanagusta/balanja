import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("product page owns one photo preview and list thumbnail", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const list = await readFile(new URL("../components/product/ProductList.jsx", import.meta.url), "utf8");
  for (const pattern of [/ProductPhotoField/, /ProductList/, /URL\.createObjectURL/, /URL\.revokeObjectURL/, /imageFile/, /removeImage/]) {
    assert.match(source, pattern);
  }
  assert.match(list, /ProductThumbnail/);
  assert.match(list, /size="xl"/);
  assert.match(list, /flex min-h-20 min-w-0 self-center flex-col/);
  assert.doesNotMatch(list, /min-w-0 self-stretch flex-col/);
  assert.match(list, /className="divide-y divide-border"/);
  assert.match(list, /tabular-nums/);
  assert.match(list, /font-mono text-xs font-medium tabular-nums tracking-\[0\.01em\]/);
  assert.match(list, /font-mono font-semibold tabular-nums/);
  assert.match(list, /<span className="font-mono tabular-nums">\{formatQuantity\(stock\)\}<\/span>/);
  assert.match(list, /rounded-full px-2 text-\[10px\]/);
  assert.match(list, /replace\(\/\^Rp\//);
  assert.doesNotMatch(source, /DataTable/);
  assert.doesNotMatch(source, /TablePagination/);
});

test("product machine data uses mono without changing human-facing labels", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const primitives = await readFile(new URL("../components/primitives.jsx", import.meta.url), "utf8");

  assert.match(source, /label="Barcode"[\s\S]{0,180}inputClassName="font-mono tabular-nums tracking-\[0\.01em\]"/);
  assert.match(source, /label="Harga"[\s\S]{0,180}inputClassName="font-mono tabular-nums"/);
  assert.match(source, /label="Stok"[\s\S]{0,260}inputClassName="font-mono tabular-nums"/);
  assert.match(primitives, /inputClassName = ""/);
  assert.match(primitives, /\$\{inputClassName\} \$\{inputPropsClassName\}/);
});

test("product page maps storage failures to inline photo feedback", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /IMAGE_STORAGE_UNAVAILABLE/);
  assert.match(source, /throwOnError: true/);
  assert.match(source, /productErrors.*image/s);
});

test("product editor uses category and unit IDs with inline creation", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /categoryId/);
  assert.match(source, /unitId/);
  assert.match(source, /MasterDataSelectField/);
});

test("product barcode scan action is separate from the manual field", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /<Button[\s\S]{0,400}<Icon name="scan" className="size-5" \/>[\s\S]{0,80}Pindai barcode[\s\S]{0,180}<Input[\s\S]{0,80}label="Barcode"/);
  assert.doesNotMatch(source, /leftSlot=\{\(/);
  assert.doesNotMatch(source, /<Icon name="barcode"/);
});

test("product creation is a floating action button at bottom-right", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Tambah produk"/);
  assert.match(source, /<Icon name="plus" className="size-5"/);
  assert.match(source, /absolute bottom-4 right-4/);
  assert.doesNotMatch(source, /mobile-search-control[\s\S]{0,1200}aria-label="Tambah produk"/);
});

test("product sorting, category, and status stay together in the top-bar drawer", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const drawer = await readFile(new URL("../components/product/ProductFilterDrawer.jsx", import.meta.url), "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /app-top-bar-actions/);
  assert.match(source, /<ProductFilterDrawer/);
  assert.match(source, /sort=\{`\$\{table\.sortKey\}:\$\{table\.sortDir\}`\}/);
  assert.match(source, /table\.setSort\(sortKey, sortDir\)/);
  assert.match(source, /category=\{categoryId\}/);
  assert.match(source, /categoryOptions=\{categoryOptions\}/);
  assert.match(source, /onCategoryChange=\{setCategoryId\}/);
  assert.doesNotMatch(source, /ProductCategoryPills/);
  assert.match(source, /label="Filter produk"/);
  assert.doesNotMatch(source, /<TableFilterPopover/);
  assert.doesNotMatch(source, /<header className="border-b border-border/);
  assert.match(drawer, /from "vaul"/);
  assert.match(drawer, /<Drawer\.Overlay/);
  assert.match(drawer, /<Drawer\.Handle/);
  assert.match(drawer, /<Drawer\.Title/);
  assert.doesNotMatch(drawer, /<Drawer\.Description/);
  assert.match(drawer, /aria-describedby=\{undefined\}/);
  assert.match(drawer, /aria-label=\{label\}/);
  assert.match(drawer, /label="Urutkan"/);
  assert.match(drawer, /Terbaru ditambahkan/);
  assert.match(drawer, /Stok paling sedikit/);
  assert.match(drawer, /Harga tertinggi/);
  assert.match(drawer, /label="Kategori"/);
  assert.match(drawer, /Number\(draftSort !== DEFAULT_SORT\)/);
  assert.match(drawer, /onSortChange\?\.\(draftSort\)/);
  assert.match(drawer, /onCategoryChange\?\.\(draftCategory\)/);
  assert.match(drawer, /onStatusChange\?\.\(draftStatus\)/);
  assert.doesNotMatch(drawer, /activeFilterCount > 0/);
});

test("product list loads at most six more items without a pagination footer", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const cursor = await readFile(new URL("../hooks/useCursorTable.js", import.meta.url), "utf8");
  const list = await readFile(new URL("../components/product/ProductList.jsx", import.meta.url), "utf8");

  assert.match(source, /initialPageSize:\s*6/);
  assert.match(source, /table\.hasMore/);
  assert.match(source, /const loadMoreProducts = async/);
  assert.match(source, /await table\.loadMore\(\)/);
  assert.match(source, /onClick=\{loadMoreProducts\}/);
  assert.match(source, /enteringIds=\{enteringProductIds\}/);
  assert.match(source, /Muat lebih banyak/);
  assert.doesNotMatch(source, /TablePagination/);
  assert.match(cursor, /append:\s*true/);
  assert.match(cursor, /const setSort = React\.useCallback/);
  assert.match(cursor, /setSortKey\(key\)/);
  assert.match(cursor, /setSortDir\(direction\)/);
  assert.match(cursor, /append \? \[\.\.\.current, \.\.\.items\] : items/);
  assert.match(list, /translate-y-1 opacity-0/);
  assert.match(list, /duration-base ease-standard/);
  assert.match(list, /motion-reduce:transform-none motion-reduce:duration-fast/);
});

test("product save feedback swaps text without resizing its button", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const swap = await readFile(new URL("../components/motion/SwapText.jsx", import.meta.url), "utf8");
  const hook = await readFile(new URL("../hooks/useSwapTransition.js", import.meta.url), "utf8");

  assert.match(source, /className="min-w-32"/);
  assert.match(source, /<SwapText value=\{savingProduct \? "Menyimpan\.\.\." : "Simpan produk"\}/);
  assert.match(swap, /-translate-y-1 opacity-0 duration-fast/);
  assert.match(swap, /translate-y-1 opacity-0 duration-0/);
  assert.match(swap, /motion-reduce:translate-y-0 motion-reduce:duration-fast/);
  assert.match(hook, /window\.requestAnimationFrame/);
  assert.match(hook, /window\.cancelAnimationFrame/);
});
