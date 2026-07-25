import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("master data manager exposes archived, rename, archive, restore, and undo controls", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  for (const label of ["Diarsipkan", "Ubah nama", "Arsipkan", "Pulihkan", "Urungkan"]) assert.match(source, new RegExp(label));
  assert.doesNotMatch(source, /tone="success">Aktif/);
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /toast\.success/);
});

test("master data manager uses flat responsive rows and protects long item names", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  for (const className of [
    "master-data-manager",
    "master-data-create",
    "master-data-list",
    "master-data-item-row",
    "master-data-item-name",
    "master-data-actions",
    "settings-touch-target",
  ]) assert.match(source, new RegExp(className));

  assert.match(css, /\.master-data-manager\s*\{[\s\S]*container-name:\s*master-data/);
  assert.match(css, /\.master-data-item-name\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.settings-touch-target\s*\{[\s\S]*min-block-size:\s*2\.75rem/);
  assert.match(css, /\.master-data-field-action\s*\{[\s\S]*align-items:\s*flex-end/);
  assert.match(css, /@container master-data \(min-width:\s*560px\)/);
  assert.doesNotMatch(source, /rounded-card border border-border bg-surface p-3/);
  assert.equal(source.match(/density="compact"/g)?.length, 2);
  assert.match(source, /variant="primary"\s+size="base"\s+compactVisual/);
  assert.match(source, /size="base"\s+variant="ghost"\s+compactVisual/);
  assert.match(source, /size="base"\s+variant="primary"\s+compactVisual/);
});
