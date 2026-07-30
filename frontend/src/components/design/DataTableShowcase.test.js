import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system demonstrates six-item load-more collections", async () => {
  const source = await readFile(new URL("./DataTableShowcase.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /TablePagination/);
  assert.match(source, /TransactionFilterDrawer/);
  assert.match(source, /TransactionCardList/);
  assert.match(source, /ProductFilterDrawer/);
  assert.doesNotMatch(source, /ProductCategoryPills/);
  assert.match(source, /ProductList/);
  assert.match(source, /Muat lebih banyak/);
  assert.match(source, /count \+ 6/);
  assert.match(source, /setVisibleTransactionCount\(\(count\) => count \+ 6\)/);
  assert.match(source, /enteringIds=\{enteringProductIds\}/);
  assert.match(source, /mt-2 grid w-full overflow-hidden/);
  assert.doesNotMatch(source, /mt-2 grid max-w-3xl overflow-hidden/);
  assert.doesNotMatch(source, /paginated/);
});

test("design system documents transaction cards and shared table scroll fades", async () => {
  const source = await readFile(new URL("./DataTableShowcase.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");

  assert.match(source, /Transaction cards/);
  assert.match(source, /TransactionCardList/);
  assert.match(design, /light-translucent gradient fades/i);
  assert.match(design, /without `backdrop-filter`/i);
  assert.match(design, /inline-start/);
  assert.match(design, /inline-end/);
});
