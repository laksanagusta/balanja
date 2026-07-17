import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MAX_PRODUCT_PHOTO_BYTES, validateProductPhoto } from "./product-photo.js";

test("validates supported product photo type and size", () => {
  assert.equal(validateProductPhoto(new File(["x"], "a.png", { type: "image/png" })), "");
  assert.match(validateProductPhoto(new File(["x"], "a.gif", { type: "image/gif" })), /JPG, PNG, atau WebP/);
  assert.match(validateProductPhoto({ size: MAX_PRODUCT_PHOTO_BYTES + 1, type: "image/png" }), /5 MB/);
});

test("design system publishes product photo patterns", async () => {
  const design = await readFile(new URL("../../pages/DesignSystemPage.jsx", import.meta.url), "utf8");
  const table = await readFile(new URL("../design/DataTableShowcase.jsx", import.meta.url), "utf8");
  const field = await readFile(new URL("./ProductPhotoField.jsx", import.meta.url), "utf8");
  assert.match(design, /ProductPhotoShowcase/);
  assert.match(table, /ProductThumbnail/);
  assert.match(field, /inferFilename/);
  assert.match(field, /capture="environment"/);
  assert.doesNotMatch(field, /Nama file saat ini/);
  assert.doesNotMatch(field, /Nama file/);
});

test("POS and cart share the product image fallback renderer", async () => {
  const product = await readFile(new URL("../pos/ProductCard.jsx", import.meta.url), "utf8");
  const cart = await readFile(new URL("../pos/CartRow.jsx", import.meta.url), "utf8");
  assert.match(product, /import \{ ProductImage \}/);
  assert.match(cart, /import \{ ProductImage \}/);
});
