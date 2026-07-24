import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system page includes master data patterns showcase", async () => {
  const source = await readFile(new URL("./DesignSystemPage.jsx", import.meta.url), "utf8");
  assert.match(source, /MasterDataPatternsShowcase/);
  const showcase = await readFile(
    new URL("../components/design/MasterDataPatternsShowcase.jsx", import.meta.url),
    "utf8",
  );
  assert.match(showcase, /SettingsNavigation/);
  assert.match(showcase, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(showcase, /max-w-3xl/);
});

test("design system reuses the production Settings skeleton", async () => {
  const showcase = await readFile(
    new URL("../components/design/SkeletonShowcase.jsx", import.meta.url),
    "utf8",
  );
  assert.match(showcase, /SettingsPageSkeleton/);
});
