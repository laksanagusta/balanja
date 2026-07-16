import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard showcase documents the production chart-role mapping", async () => {
  const source = await readFile(new URL("./DashboardPatternsShowcase.jsx", import.meta.url), "utf8");

  assert.match(source, /Revenue uses violet/);
  assert.match(source, /top products use green/);
  assert.match(source, /payment methods use violet, mint, and amber/);
  assert.match(source, /labels and values keep every chart readable without color/);
});
