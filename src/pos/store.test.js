import test from "node:test";
import assert from "node:assert/strict";
import { createSavedProduct } from "./product-save.js";

test("createSavedProduct assigns an id to a new product before returning it", () => {
  const product = createSavedProduct(
    {
      id: "",
      name: "Teh Botol",
      barcode: "8991001000999",
      category: "Minuman",
      price: 4500,
      stock: 12,
      unit: "botol",
      active: true,
    },
    new Date("2026-07-10T10:00:00.000Z"),
  );

  assert.equal(product.id, "prod-1783677600000");
  assert.equal(product.updatedAt, "2026-07-10T10:00:00.000Z");
  assert.equal(product.createdAt, "2026-07-10T10:00:00.000Z");
});
