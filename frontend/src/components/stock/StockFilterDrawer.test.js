import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("stock filter mirrors the product draft-and-apply bottom drawer", async () => {
  const source = await readFile(new URL("./StockFilterDrawer.jsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../../pages/StockPage.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");

  assert.match(source, /<Drawer\.Root/);
  assert.match(source, /direction="bottom"/);
  assert.match(source, /shouldScaleBackground=\{false\}/);
  assert.match(source, /aria-describedby=\{undefined\}/);
  assert.doesNotMatch(source, /<Drawer\.Description/);
  assert.match(source, /<Icon name="filter"/);
  assert.match(source, /Jenis pergerakan/);
  assert.match(source, /const \[draftType, setDraftType\]/);
  assert.match(source, /if \(!open\) return/);
  assert.match(source, /const applyFilters = \(\) =>/);
  assert.match(source, /onOpenChange\(false\)/);
  assert.match(source, /const resetDraft = \(\) =>/);
  assert.match(source, /Atur ulang/);
  assert.match(source, /Terapkan/);
  assert.match(source, /relative px-6 pt-6/);
  assert.match(source, /absolute right-6 top-4 grid size-11/);
  assert.match(source, /product-filter-drawer-scroll[^"]*px-6 pt-6/);
  assert.match(source, /product-filter-drawer-footer[^"]*px-6 pt-6/);

  assert.match(page, /createPortal/);
  assert.match(page, /app-top-bar-actions/);
  assert.match(page, /<StockFilterDrawer/);
  assert.doesNotMatch(page, /hideLabel\s*\n\s*value=\{typeFilter\}/);
  assert.match(design, /same icon-only Vaul bottom-drawer behavior and geometry as Products/);
});
