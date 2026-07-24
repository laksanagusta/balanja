import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("master data select preserves inline errors and offers restore", async () => {
  const source = await readFile(new URL("./MasterDataSelectField.jsx", import.meta.url), "utf8");
  assert.match(source, /ARCHIVED_NAME_CONFLICT/);
  assert.match(source, /Pulihkan/);
  assert.match(source, /onCreate/);
});

test("master data creation lives inside the searchable select popover", async () => {
  const source = await readFile(new URL("./MasterDataSelectField.jsx", import.meta.url), "utf8");
  assert.match(source, /role="listbox"/);
  assert.match(source, /Cari \$\{entityLabel\.toLowerCase\(\)\}/);
  assert.match(source, /Tambah/);
  assert.doesNotMatch(source, /bg-surface-muted\/50 p-3/);
});
