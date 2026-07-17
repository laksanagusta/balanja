import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system exposes the landing-page marketing patterns", async () => {
  const page = await readFile(new URL("../../pages/DesignSystemPage.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");

  assert.match(page, /MarketingPatternsShowcase/);
  assert.match(design, /Public Marketing Pages/);
  assert.match(design, /64px to 72px/);
  assert.match(design, /Marketing rules do not apply to operational screens/);
  assert.match(design, /faithful UI mockups/);
});
