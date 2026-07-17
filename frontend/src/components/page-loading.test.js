import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings skeleton mirrors the responsive navigation and centered content layout", async () => {
  const source = await readFile(new URL("./page-loading.jsx", import.meta.url), "utf8");
  const settingsSkeleton = source.slice(source.indexOf("export function SettingsPageSkeleton()"));

  assert.match(settingsSkeleton, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(settingsSkeleton, /max-w-3xl/);
  assert.match(settingsSkeleton, /min-h-11/);
  assert.match(settingsSkeleton, /overflow-x-auto/);
  assert.doesNotMatch(settingsSkeleton, /xl:grid-cols-\[minmax\(0,1fr\)_360px\]/);
  assert.doesNotMatch(settingsSkeleton, /<aside/);
});
