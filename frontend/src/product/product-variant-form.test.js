import test from "node:test";
import assert from "node:assert/strict";
import {
  applyVariantBulkValues,
  attributesKey,
  buildVariantMatrix,
  clearVariantFieldError,
  commitVariantOption,
  countVariantCombinations,
  duplicateVariantAttribute,
  firstVariantErrorKey,
  moveVariantAttribute,
  renameVariantAttribute,
  validateVariantDraft,
  variantRowKey,
} from "./product-variant-form.js";

test("clearing the final field error removes stale variant-row metadata", () => {
  const key = attributesKey({ Ukuran: "S" });

  assert.deepEqual(clearVariantFieldError({
    [key]: { price: "Harga wajib diisi." },
  }, key, "price"), {});
});

test("clearing one field error preserves other real errors in the same variant", () => {
  const key = attributesKey({ Ukuran: "S" });

  assert.deepEqual(clearVariantFieldError({
    [key]: { price: "Harga wajib diisi.", barcode: "Barcode sudah digunakan." },
  }, key, "price"), {
    [key]: { barcode: "Barcode sudah digunakan." },
  });
});

test("mobile validation ignores variant rows whose errors have been cleared", () => {
  const clearedKey = attributesKey({ Ukuran: "S" });
  const invalidKey = attributesKey({ Ukuran: "M" });

  assert.equal(firstVariantErrorKey({
    [clearedKey]: { price: "", stock: "", barcode: "" },
    [invalidKey]: { stock: "Stok wajib diisi." },
  }), invalidKey);
  assert.equal(firstVariantErrorKey({ [clearedKey]: { price: "" } }), "");
});

test("adding an attribute preserves each existing variant on the first new option", () => {
  const existing = [
    { id: "size-m", attributes: { Ukuran: "M" }, price: 10000, stock: 4, barcode: "M", active: true },
    { id: "size-l", attributes: { Ukuran: "L" }, price: 12000, stock: 2, barcode: "L", active: false },
  ];

  const matrix = buildVariantMatrix([
    { name: "Ukuran", options: ["M", "L"] },
    { name: "Warna", options: ["Merah", "Biru"] },
  ], existing, { price: 5000, stock: 0 });

  assert.deepEqual(matrix.map((variant) => variant.id), ["size-m", "", "size-l", ""]);
  assert.equal(matrix[0].price, 10000);
  assert.equal(matrix[0].stock, 4);
  assert.equal(matrix[2].barcode, "L");
  assert.equal(matrix[2].active, false);
});

test("adding the first attribute reuses the simple product default variant", () => {
  const matrix = buildVariantMatrix(
    [{ name: "Ukuran", options: ["M", "L"] }],
    [{ id: "default", attributes: {}, price: 9000, stock: 7, barcode: "", active: true }],
    { price: 5000, stock: 0 },
  );

  assert.equal(matrix[0].id, "default");
  assert.equal(matrix[0].price, 9000);
  assert.equal(matrix[0].stock, 7);
  assert.equal(matrix[1].id, "");
  assert.equal(matrix[1].stock, 0);
});

test("expanding a stocked simple product never duplicates inventory", () => {
  const matrix = buildVariantMatrix(
    [{ name: "Ukuran", options: ["S", "M", "L"] }],
    [{ id: "default", attributes: {}, price: 9000, stock: 7, barcode: "", active: true }],
    { price: 9000, stock: 7 },
  );

  assert.deepEqual(matrix.map((variant) => variant.stock), [7, 0, 0]);
  assert.equal(matrix.reduce((total, variant) => total + variant.stock, 0), 7);
});

test("variant combination count previews a complete Cartesian matrix", () => {
  assert.equal(countVariantCombinations([
    { name: "Ukuran", options: ["S", "M", "L"] },
    { name: "Warna", options: ["Merah", "Biru"] },
  ]), 6);
  assert.equal(countVariantCombinations([{ name: "Ukuran", options: [] }]), 0);
});

test("bulk values update only the fields the user supplied", () => {
  const variants = [
    { id: "m", attributes: { Ukuran: "M" }, price: 9000, stock: 2 },
    { id: "l", attributes: { Ukuran: "L" }, price: 11000, stock: 4 },
  ];

  assert.deepEqual(
    applyVariantBulkValues(variants, { price: "12.000", stock: "" }),
    [
      { ...variants[0], price: "12.000" },
      { ...variants[1], price: "12.000" },
    ],
  );
});

test("removing an attribute preserves total stock when variants collapse", () => {
  const existing = [
    { id: "m-red", attributes: { Ukuran: "M", Warna: "Merah" }, price: 10000, stock: 2, barcode: "MR", active: true },
    { id: "m-blue", attributes: { Ukuran: "M", Warna: "Biru" }, price: 10000, stock: 3, barcode: "MB", active: true },
    { id: "l-red", attributes: { Ukuran: "L", Warna: "Merah" }, price: 12000, stock: 4, barcode: "LR", active: true },
  ];

  const matrix = buildVariantMatrix(
    [{ name: "Ukuran", options: ["M", "L"] }],
    existing,
    { price: 9000, stock: 0 },
  );

  assert.deepEqual(matrix.map((variant) => variant.stock), [5, 4]);
  assert.deepEqual(matrix.map((variant) => variant.id), ["m-red", "l-red"]);
});

test("renaming an attribute keeps every variant value under the new name", () => {
  const result = renameVariantAttribute(
    [{ name: "Ukuran", options: ["M", "L"] }, { name: "Warna", options: ["Merah"] }],
    [{ id: "m", attributes: { Ukuran: "M", Warna: "Merah" }, price: 10000, stock: 2 }],
    0,
    "Size",
  );

  assert.deepEqual(result.config, [{ name: "Size", options: ["M", "L"] }, { name: "Warna", options: ["Merah"] }]);
  assert.deepEqual(result.variants[0].attributes, { Size: "M", Warna: "Merah" });
  assert.deepEqual(Object.keys(result.variants[0].attributes), ["Size", "Warna"]);
});

test("option tokens trim values and reject empty or case-insensitive duplicates", () => {
  assert.deepEqual(commitVariantOption(["M"], "  L  "), {
    options: ["M", "L"],
    committed: true,
    error: "",
  });
  assert.equal(commitVariantOption(["M"], "   ").error, "Pilihan tidak boleh kosong.");
  assert.equal(commitVariantOption(["M"], "m").error, "Pilihan “m” sudah ada.");
  assert.deepEqual(commitVariantOption(["M", "L"], "Medium", 0).options, ["Medium", "L"]);
});

test("draft row identity survives compatible matrix updates and attribute renames", () => {
  const original = buildVariantMatrix(
    [{ name: "Ukuran", options: ["M"] }],
    [],
    { price: 10000, stock: 0 },
  )[0];
  const expanded = buildVariantMatrix(
    [{ name: "Ukuran", options: ["M", "L"] }],
    [original],
    { price: 10000, stock: 0 },
  );
  const renamed = renameVariantAttribute(
    [{ name: "Ukuran", options: ["M", "L"] }],
    expanded,
    0,
    "Size",
  );

  assert.equal(variantRowKey(expanded[0]), variantRowKey(original));
  assert.equal(variantRowKey(renamed.variants[0]), variantRowKey(original));
  assert.notEqual(variantRowKey(expanded[0]), variantRowKey(expanded[1]));
});

test("duplicate and reorder attribute operations preserve existing variant values", () => {
  const config = [
    { name: "Ukuran", options: ["M", "L"] },
    { name: "Warna", options: ["Merah"] },
  ];
  const variants = buildVariantMatrix(config, [], { price: 10000, stock: 0 });
  variants[0] = { ...variants[0], stock: 7, barcode: "M-RED" };

  const moved = moveVariantAttribute(config, variants, 1, 0);
  assert.deepEqual(moved.config.map((attribute) => attribute.name), ["Warna", "Ukuran"]);
  assert.equal(moved.variants.find((variant) => variant.attributes.Ukuran === "M").stock, 7);

  const duplicated = duplicateVariantAttribute(config, variants, 0, { price: 10000, stock: 0 });
  assert.equal(duplicated.config[1].name, "Ukuran salinan");
  assert.equal(duplicated.variants.length, 4);
  assert.equal(duplicated.variants.filter((variant) => variant.stock === 7).length, 1);
});

test("variant validation requires sold prices and non-negative integer stock", () => {
  const result = validateVariantDraft({
    attributes: [{ name: "Ukuran", options: ["M", "L"] }],
    variants: [
      { attributes: { Ukuran: "M" }, price: "", stock: "1.5", barcode: "", active: true },
      { attributes: { Ukuran: "L" }, price: "", stock: "0", barcode: "", active: false },
    ],
  });

  const soldErrors = result.variantRows[attributesKey({ Ukuran: "M" })];
  const hiddenErrors = result.variantRows[attributesKey({ Ukuran: "L" })] || {};
  assert.equal(soldErrors.price, "Harga wajib diisi untuk variasi yang dijual.");
  assert.equal(soldErrors.stock, "Stok harus berupa bilangan bulat nol atau lebih.");
  assert.equal(hiddenErrors.price, undefined);
});

test("variant validation identifies both sides of a duplicate barcode", () => {
  const result = validateVariantDraft({
    attributes: [{ name: "Ukuran", options: ["M", "L"] }],
    variants: [
      { attributes: { Ukuran: "M" }, price: "10.000", stock: "0", barcode: "same", active: true },
      { attributes: { Ukuran: "L" }, price: "12.000", stock: "0", barcode: "SAME", active: true },
    ],
  });

  assert.equal(
    result.variantRows[attributesKey({ Ukuran: "M" })].barcode,
    "Barcode sudah digunakan oleh variasi Ukuran: L.",
  );
  assert.equal(
    result.variantRows[attributesKey({ Ukuran: "L" })].barcode,
    "Barcode sudah digunakan oleh variasi Ukuran: M.",
  );
});
