import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("master data manager exposes active, archived, rename, archive, and restore controls", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  for (const label of ["Diarsipkan", "Ubah nama", "Arsipkan", "Pulihkan"]) assert.match(source, new RegExp(label));
});

test("master data manager stacks compact actions and protects long item names", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  for (const className of [
    "master-data-manager",
    "master-data-create",
    "master-data-item-row",
    "master-data-identity",
    "master-data-item-name",
    "master-data-actions",
    "settings-touch-target",
  ]) assert.match(source, new RegExp(className));

  assert.match(css, /\.master-data-manager\s*\{[\s\S]*container-name:\s*master-data/);
  assert.match(css, /\.master-data-item-name\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.settings-touch-target\s*\{[\s\S]*min-block-size:\s*2\.75rem/);
  assert.match(css, /@container master-data \(min-width:\s*560px\)/);
});
