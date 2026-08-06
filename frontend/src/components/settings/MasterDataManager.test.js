import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("master data manager exposes archived, rename, archive, restore, and undo controls", async () => {
  const source = await readFile(new URL("./MasterDataManager.jsx", import.meta.url), "utf8");
  for (const label of ["Diarsipkan", "Ubah nama", "Arsipkan", "Pulihkan", "Urungkan"]) assert.match(source, new RegExp(label));
  assert.doesNotMatch(source, /tone="success">Aktif/);
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /role="menuitem"/);
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
  assert.doesNotMatch(css, /@container master-data \(min-width:\s*560px\)/);
  assert.doesNotMatch(source, /rounded-card border border-border bg-surface p-3/);
  assert.equal(source.match(/density="compact"/g)?.length, 2);
  assert.match(source, /className="settings-touch-target w-full"\s+type="submit"\s+variant="primary"\s+size="sm"\s+radius="rounded-full"/);
  assert.doesNotMatch(source, /master-data-field-action/);
  assert.match(source, /className="header-compact-action settings-touch-target w-full" type="button" size="sm" variant="ghost"/);
  assert.match(source, /className="header-compact-action settings-touch-target w-full"[\s\S]*size="sm"[\s\S]*variant="primary"/);
  assert.match(source, /<form/);
  assert.match(source, /type="submit"/);
  assert.match(source, /aria-busy=\{loading\}/);
  assert.doesNotMatch(source, /opacity-70/);
  assert.match(css, /\.master-data-actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);[^}]*gap:\s*0\.5rem/);
  assert.doesNotMatch(css, /\.master-data-field-action/);
});
