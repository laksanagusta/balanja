import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system owns entitlement warning and exhausted states", async () => {
  const guide = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");
  const page = await readFile(new URL("../../pages/DesignSystemPage.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("./EntitlementPatternsShowcase.jsx", import.meta.url), "utf8");

  assert.match(guide, /Transaction entitlement states/);
  assert.match(page, /EntitlementPatternsShowcase/);
  assert.match(showcase, /12 dari 50 transaksi digunakan/);
  assert.match(showcase, /Kuota trial telah habis/);
});
