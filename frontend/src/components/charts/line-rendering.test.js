import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("full-series dash styling reaches static and animated line paths", async () => {
  const source = await readFile(new URL("./line.jsx", import.meta.url), "utf8");
  assert.match(source, /function LineSeriesStroke\(\{[\s\S]*strokeDasharray,/);
  assert.equal((source.match(/strokeDasharray=\{strokeDasharray\}/g) || []).length >= 2, true);
  assert.match(source, /export function Line\([\s\S]*strokeDasharray,/);
});
