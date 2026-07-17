import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings tabs use query parameters with profile fallback", async () => {
  const source = await readFile(new URL("./SettingsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /tab=profile/);
  assert.match(source, /tab=categories/);
  assert.match(source, /tab=units/);
  assert.match(source, /Profil toko/);
  assert.match(source, /MasterDataManager/);
});
