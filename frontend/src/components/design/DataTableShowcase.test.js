import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system demonstrates controlled cursor pagination", async () => {
  const source = await readFile(new URL("./DataTableShowcase.jsx", import.meta.url), "utf8");
  assert.match(source, /TablePagination/);
  assert.match(source, /TableFilterPopover/);
  assert.doesNotMatch(source, /paginated/);
});

test("design system documents conditional translucent table scroll fades", async () => {
  const source = await readFile(new URL("./DataTableShowcase.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");

  assert.match(source, /max-w-xl/);
  assert.match(source, /Geser horizontal/);
  assert.match(source, /fade transparan/i);
  assert.match(design, /light-translucent gradient fades/i);
  assert.match(design, /without `backdrop-filter`/i);
  assert.match(design, /inline-start/);
  assert.match(design, /inline-end/);
});
