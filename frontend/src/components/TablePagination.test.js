import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("DataTable no longer slices client data", async () => {
  const source = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data\.slice\(/);
  assert.doesNotMatch(source, /paginated\s*=/);
});

test("TablePagination exposes controlled navigation", async () => {
  const source = await readFile(new URL("./TablePagination.jsx", import.meta.url), "utf8");
  for (const prop of ["canPrevious", "canNext", "onPrevious", "onNext", "onPageSizeChange"]) {
    assert.match(source, new RegExp(prop));
  }
  assert.doesNotMatch(source, /of\s*\{?total/);
});
