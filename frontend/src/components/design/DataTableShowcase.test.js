import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system demonstrates controlled cursor pagination", async () => {
  const source = await readFile(new URL("./DataTableShowcase.jsx", import.meta.url), "utf8");
  assert.match(source, /TablePagination/);
  assert.match(source, /TableFilterPopover/);
  assert.doesNotMatch(source, /paginated/);
});
