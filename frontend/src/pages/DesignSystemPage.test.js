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
  assert.match(showcase, /settings-workspace/);
  assert.match(showcase, /settings-workspace-layout/);
  assert.match(showcase, /komposisi smartphone/i);
  assert.match(showcase, /44px/);
  assert.match(showcase, /direction-aware transition/i);
  assert.match(showcase, /reduced motion/i);
  assert.doesNotMatch(showcase, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(showcase, /max-w-3xl/);
});

test("design system page includes the production stock overview pattern", async () => {
  const source = await readFile(new URL("./DesignSystemPage.jsx", import.meta.url), "utf8");
  const showcase = await readFile(
    new URL("../components/design/StockPatternsShowcase.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /StockPatternsShowcase/);
  assert.match(showcase, /StockOverview/);
  assert.match(showcase, /StockFilterDrawer/);
  assert.match(showcase, /progress indicator/i);
  assert.match(showcase, /delta bertanda/i);
});

test("design system reuses the production Settings skeleton", async () => {
  const showcase = await readFile(
    new URL("../components/design/SkeletonShowcase.jsx", import.meta.url),
    "utf8",
  );
  assert.match(showcase, /SettingsPageSkeleton/);
});

test("design system documents organization onboarding states", async () => {
  const source = await readFile(new URL("./DesignSystemPage.jsx", import.meta.url), "utf8");

  assert.match(source, /OrganizationOnboardingShowcase/);
  assert.match(source, /<OrganizationOnboardingShowcase \/>/);
});

test("POS showcase documents the compact responsive contract", async () => {
  const showcase = await readFile(new URL("../components/design/POSPatterns.jsx", import.meta.url), "utf8");

  assert.match(showcase, /Satu vertical scroller/);
  assert.match(showcase, /44px/);
  assert.match(showcase, /drawer overlay/i);
  assert.match(showcase, /density visual tetap ringkas/i);
  assert.match(showcase, /action rail dengan stepper di kiri/);
  assert.match(showcase, /text morph singkat/i);
  assert.match(showcase, /dibatasi 420px/);
  assert.match(showcase, /ProductCategoryPills/);
  assert.match(showcase, /mobile-search-control/);
  assert.match(showcase, /Aksi teks Selesai/);
  assert.match(showcase, /spring tanpa bounce/);
  assert.match(showcase, /0 ke auto/);
  assert.match(showcase, /tetap mounted tetapi inert/);
});
