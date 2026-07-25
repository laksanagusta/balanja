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
  assert.match(showcase, /container query/i);
  assert.match(showcase, /44px/);
  assert.match(showcase, /direction-aware transition/i);
  assert.match(showcase, /reduced motion/i);
  assert.doesNotMatch(showcase, /md:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(showcase, /max-w-3xl/);
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
  const showcase = await readFile(
    new URL("../components/design/POSPatterns.jsx", import.meta.url),
    "utf8",
  );

  assert.match(showcase, /Satu vertical scroller/);
  assert.match(showcase, /44px/);
  assert.match(showcase, /container query/i);
  assert.match(showcase, /density visual tetap ringkas/i);
  assert.match(showcase, /kontrol jumlah yang dapat diketik/);
  assert.match(showcase, /text morph singkat/i);
  assert.match(showcase, /360–420px/);
  assert.match(showcase, /category-tabs-indicator/);
  assert.match(showcase, /pos-touch-target/);
  assert.match(showcase, /Aksi teks Selesai/);
  assert.match(showcase, /spring tanpa bounce/);
  assert.match(showcase, /position-only layout/);
});
