import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings skeleton mirrors the responsive navigation and centered content layout", async () => {
  const source = await readFile(new URL("./page-loading.jsx", import.meta.url), "utf8");
  const settingsSkeleton = source.slice(source.indexOf("function SettingsProfileSkeleton"));

  assert.match(settingsSkeleton, /settings-workspace/);
  assert.match(settingsSkeleton, /settings-workspace-layout/);
  assert.match(settingsSkeleton, /settings-navigation/);
  assert.match(settingsSkeleton, /settings-navigation-item/);
  assert.match(settingsSkeleton, /settings-content/);
  assert.match(settingsSkeleton, /master-data-manager/);
  assert.match(settingsSkeleton, /master-data-create/);
  assert.match(settingsSkeleton, /master-data-item-row/);
  assert.match(settingsSkeleton, /SettingsProfileSkeleton/);
  assert.match(settingsSkeleton, /Panel className="mx-1 p-4 !border-0 !smooth-shadow-ring-xs !shadow-black !smooth-ring-neutral-300\/30"/);
  assert.match(settingsSkeleton, /master-data-manager !shadow-none/);
  assert.match(settingsSkeleton, /tab === "profile"/);
  assert.doesNotMatch(settingsSkeleton, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(settingsSkeleton, /max-w-3xl/);
  assert.doesNotMatch(settingsSkeleton, /xl:grid-cols-\[minmax\(0,1fr\)_360px\]/);
  assert.doesNotMatch(settingsSkeleton, /<aside/);
});
