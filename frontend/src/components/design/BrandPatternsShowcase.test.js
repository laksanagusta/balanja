import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system owns the supplied Balanja brand mark", async () => {
  const [shared, showcase, designSystem, guide] = await Promise.all([
    readFile(new URL("../../shared.jsx", import.meta.url), "utf8"),
    readFile(new URL("./BrandPatternsShowcase.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../pages/DesignSystemPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(shared, /src="\/brand\/balanja-logo\.png"/);
  assert.match(shared, /width="260"/);
  assert.match(shared, /height="124"/);
  assert.match(showcase, /original 65:31 ratio/);
  assert.match(designSystem, /<BrandPatternsShowcase \/>/);
  assert.match(guide, /canonical Balanja brand mark/);
  assert.match(guide, /Never stretch, crop, recolor/);
});
