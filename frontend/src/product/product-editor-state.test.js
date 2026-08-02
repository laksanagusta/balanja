import test from "node:test";
import assert from "node:assert/strict";
import { productDraftFingerprint } from "./product-editor-state.js";

test("product draft fingerprint changes when variant data changes", () => {
  const product = {
    id: "p1",
    name: "Teh",
    imageFile: null,
    attributesConfig: [{ name: "Ukuran", options: ["M"] }],
    variants: [{ id: "v1", attributes: { Ukuran: "M" }, price: 8000, stock: 2 }],
  };

  const changed = {
    ...product,
    variants: [{ ...product.variants[0], stock: 3 }],
  };

  assert.notEqual(productDraftFingerprint(product), productDraftFingerprint(changed));
  assert.equal(productDraftFingerprint(product), productDraftFingerprint({ ...product }));
});

test("product draft fingerprint includes selected photo identity", () => {
  const base = { name: "Teh", imageFile: null, attributesConfig: [], variants: [] };
  const withPhoto = {
    ...base,
    imageFile: { name: "teh.jpg", size: 1200, type: "image/jpeg", lastModified: 10 },
  };

  assert.notEqual(productDraftFingerprint(base), productDraftFingerprint(withPhoto));
});
