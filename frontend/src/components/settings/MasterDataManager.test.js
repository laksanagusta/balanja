import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("master data manager exposes active, archived, rename, archive, and restore controls", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  for (const label of ["Diarsipkan", "Ubah nama", "Arsipkan", "Pulihkan"]) assert.match(source, new RegExp(label));
});
