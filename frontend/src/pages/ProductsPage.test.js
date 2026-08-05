import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("product page owns one photo preview and list thumbnail", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");
  const list = await readFile(new URL("../components/product/ProductList.jsx", import.meta.url), "utf8");
  for (const pattern of [/ProductList/, /URL\.createObjectURL/, /URL\.revokeObjectURL/, /imageFile/, /removeImage/]) assert.match(source, pattern);
  assert.match(workspace, /ProductPhotoField/);
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
  const source = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");
  const primitives = await readFile(new URL("../components/primitives.jsx", import.meta.url), "utf8");

  assert.match(source, />Barcode<\/span>/);
  assert.match(source, /inputClassName="font-mono tabular-nums tracking-\[0\.01em\]"/);
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
  const workspace = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");
  assert.match(source, /categoryId/);
  assert.match(source, /unitId/);
  assert.match(workspace, /MasterDataSelectField/);
});

test("product barcode scan action shares the labeled row with manual entry", async () => {
  const source = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");
  const barcodeLabelIndex = source.indexOf(">Barcode</span>");
  const barcodeInputIndex = source.indexOf('placeholder="8991001000011"', barcodeLabelIndex);
  const scanActionIndex = source.indexOf('aria-label="Pindai barcode"', barcodeInputIndex);
  const scanIconIndex = source.indexOf('<Icon name="scan" className="size-5" />', scanActionIndex);

  assert.ok(barcodeLabelIndex >= 0);
  assert.ok(barcodeInputIndex > barcodeLabelIndex);
  assert.ok(scanActionIndex > barcodeInputIndex);
  assert.ok(scanIconIndex > scanActionIndex);
  assert.match(source, /className="flex items-start gap-2"/);
  assert.match(source, /aria-label="Pindai barcode"[\s\S]{0,400}className="grid size-11/);
  assert.doesNotMatch(source, /leftSlot=\{\(/);
  assert.doesNotMatch(source, /<Icon name="barcode"/);
});

test("product creation is a floating action button at bottom-right", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  assert.match(source, /aria-label="Tambah produk"/);
  assert.match(source, /<Icon name="plus" className="size-5" strokeWidth=\{3\} strokeLinecap="round" strokeLinejoin="round" \/>/);
  assert.match(source, /app-shell-floating-action absolute right-4/);
  assert.match(css, /--app-bottom-navigation-clearance: calc\(4\.75rem \+ env\(safe-area-inset-bottom, 0px\)\)/);
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
  const source = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");
  const swap = await readFile(new URL("../components/motion/SwapText.jsx", import.meta.url), "utf8");
  const hook = await readFile(new URL("../hooks/useSwapTransition.js", import.meta.url), "utf8");

  assert.match(source, /className="min-w-28"/);
  assert.match(source, /<SwapText value=\{savingProduct \? "Menyimpan\.\.\." : "Simpan"\}/);
  assert.match(swap, /-translate-y-1 opacity-0 duration-fast/);
  assert.match(swap, /translate-y-1 opacity-0 duration-0/);
  assert.match(swap, /motion-reduce:translate-y-0 motion-reduce:duration-fast/);
  assert.match(hook, /window\.requestAnimationFrame/);
  assert.match(hook, /window\.cancelAnimationFrame/);
});

test("product editor manages attributes and syncs variant matrix on save", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");
  const editor = await readFile(new URL("../components/product/ProductVariantEditor.jsx", import.meta.url), "utf8");

  assert.match(workspace, /ProductVariantEditor/);
  assert.match(workspace, /Produk tanpa variasi/);
  assert.match(workspace, /Harga, stok, dan barcode mengikuti setiap kombinasi pilihan/);
  assert.match(workspace, /Gunakan satu harga dan stok, atau tambahkan variasi jika produk punya ukuran atau warna berbeda/);
  assert.match(workspace, /<Button type="button" size="sm" variant="secondary" className="whitespace-nowrap" disabled=\{savingProduct\} onClick=\{onOpenVariantEditor\}>/);
  assert.match(editor, /Tambah atribut/);
  assert.match(editor, /aria-label="Tambah atribut"/);
  assert.match(workspace, /className="flex h-11 items-center justify-between rounded-button/);
  assert.match(source, /attributesConfig/);
  assert.match(source, /buildVariantMatrix/);
  assert.match(editor, /attributesKey\(variant\.attributes\)/);
  assert.match(editor, /onUpdateVariant\?\.\(key, "price"/);
  assert.match(editor, /onUpdateVariant\?\.\(key, "stock"/);
  assert.match(editor, /onUpdateVariant\?\.\(key, "barcode"/);
  assert.match(source, /setScannerTarget\(\{ kind: "variant", key \}\)/);
  assert.match(source, /scannerTarget\?\.kind === "variant"/);
  assert.doesNotMatch(source, /store\.api\.(?:create|update|delete)Variant/);
  assert.match(source, /variants:\s*rows\.map/);
  assert.match(editor, /Barcode \(opsional\)/);
  assert.doesNotMatch(source, /minimal satu varian aktif/);
  assert.match(source, /validateVariantDraft/);
  assert.match(source, /variantValidation\.variantRows/);
});

test("product editor is one atomic draft split into details and variants", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");

  assert.match(source, /editorStep/);
  assert.match(source, /routes\.productNew/);
  assert.match(source, /productEditPath/);
  assert.match(source, /<ProductEditorWorkspace/);
  assert.doesNotMatch(source, /<Dialog/);
  assert.match(workspace, /Informasi produk/);
  assert.match(workspace, /Atur variasi/);
  assert.match(workspace, /Kembali ke daftar produk/);
  assert.match(workspace, /sticky top-0/);
  assert.match(workspace, /sticky bottom-0/);
  assert.doesNotMatch(workspace, /<Dialog/);
  assert.doesNotMatch(workspace, /Langkah [12] dari 2/);
  assert.doesNotMatch(workspace, /Tahap editor produk/);
  assert.match(workspace, /<h1[^>]*text-sm[^>]*uppercase[^>]*tracking-\[0\.14em\]/);
  assert.match(workspace, /<h2[^>]*text-sm[^>]*>\s*\{isVariantsStep \? "Atur variasi" : "Informasi produk"\}/);
  assert.match(source, /productDraftFingerprint/);
  assert.match(workspace, /Buang perubahan\?/);
  assert.match(workspace, /Perubahan produk yang belum disimpan akan hilang/);
  assert.match(workspace, /Lanjut mengedit/);
  assert.match(workspace, /Buang perubahan/);
  assert.match(source, /focusFirstProductError/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /event\.(?:metaKey|ctrlKey)/);
});

test("product editor keeps setup explicit and validates recoverably", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8");
  const variant = await readFile(new URL("../components/product/ProductVariantEditor.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /function emptyProduct\(\)/);
  assert.doesNotMatch(source, /defaultCategoryId|defaultUnitId/);
  assert.match(source, /primaryFieldRef/);
  assert.match(source, /onBlurField/);
  assert.match(source, /onBlurAttributeField/);
  assert.match(source, /onBlurVariantField/);
  assert.match(workspace, /productErrors\.form/);
  assert.match(source, /Gagal menyimpan produk\. Coba lagi\./);
  assert.doesNotMatch(source, /const openVariantEditor = \(\) => \{[\s\S]{0,150}addAttribute\(/);
  assert.match(workspace, /Kembali ke daftar/);
  assert.match(workspace, /Kembali ke informasi/);
  assert.match(workspace, /primaryFieldRef/);
  assert.match(variant, /Belum ada atribut/);
  assert.match(styles, /\.variant-panel \{[\s\S]{0,220}opacity var\(--duration-fast\)/);
  assert.doesNotMatch(styles, /\.variant-panel \{[\s\S]{0,220}grid-template-rows var\(--duration-fast\)/);
});

test("typing in the product editor does not move focus back to the section heading", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");

  assert.match(source, /const editorHasDraft = Boolean\(editing\);/);
  assert.match(source, /\[discardConfirmOpen, editorHasDraft, editorStep\]/);
  assert.doesNotMatch(source, /\[discardConfirmOpen, editing, editorStep\]/);
});
