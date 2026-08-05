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
  assert.match(showcase, /ledger flat/i);
  assert.match(showcase, /gambar produk square/i);
  assert.match(showcase, /badge ikon status/i);
  assert.match(showcase, /floating action di kanan bawah/i);
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
  assert.match(showcase, /bottom drawer/i);
  assert.match(showcase, /density visual tetap ringkas/i);
  assert.match(showcase, /action rail dengan stepper di kiri/);
  assert.match(showcase, /text morph singkat/i);
  assert.match(showcase, /memenuhi seluruh viewport/);
  assert.match(showcase, /ProductCategoryPills/);
  assert.match(showcase, /mobile-search-control/);
  assert.match(showcase, /Aksi teks Selesai/);
  assert.match(showcase, /spring tanpa bounce/);
  assert.match(showcase, /0 ke auto/);
  assert.match(showcase, /tetap mounted tetapi inert/);
});

test("design system publishes the production product variant patterns", async () => {
  const source = await readFile(new URL("./DesignSystemPage.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../components/design/ProductVariantShowcase.jsx", import.meta.url), "utf8");

  assert.match(source, /ProductVariantShowcase/);
  assert.match(showcase, /VariantSelector/);
  assert.match(showcase, /ProductList/);
  assert.match(showcase, /ProductVariantEditor/);
  assert.match(showcase, /Simpan parent dan matrix secara atomik/);
  assert.match(showcase, /halaman editor khusus dengan dua tahap/);
  assert.match(showcase, /tanpa step indicator/);
  assert.match(showcase, /heading operasional 14px/);
  assert.match(showcase, /affordance Enter/);
  assert.match(showcase, /ikon plus stroke 2\.8px/);
  assert.match(showcase, /permukaan danger tanpa border/);
  assert.match(showcase, /status produk tanpa variasi/);
  assert.match(showcase, /action `Tambah variasi` berukuran small dengan label satu baris/);
  assert.match(showcase, /disclosure inline/);
});
