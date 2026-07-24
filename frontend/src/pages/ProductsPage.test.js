import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("product page owns one photo preview and table thumbnail", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  for (const pattern of [/ProductPhotoField/, /ProductThumbnail/, /URL\.createObjectURL/, /URL\.revokeObjectURL/, /imageFile/, /removeImage/]) {
    assert.match(source, pattern);
  }
});

test("product page maps storage failures to inline photo feedback", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /IMAGE_STORAGE_UNAVAILABLE/);
  assert.match(source, /throwOnError: true/);
  assert.match(source, /productErrors.*image/s);
});

test("product editor uses category and unit IDs with inline creation", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /categoryId/);
  assert.match(source, /unitId/);
  assert.match(source, /MasterDataSelectField/);
});

test("product barcode action uses the scan icon", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /<Icon name="scan" className="size-4" \/>\s*Pindai/);
  assert.doesNotMatch(source, /<Icon name="barcode" className="size-4" \/>\s*Pindai/);
});
