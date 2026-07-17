import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard revenue chart renders visible points and uses a monotone time-series curve", async () => {
  const dashboard = await readFile(new URL("./DashboardCharts.jsx", import.meta.url), "utf8");
  const line = await readFile(new URL("../charts/line.jsx", import.meta.url), "utf8");

  assert.match(dashboard, /<Line[\s\S]*showMarkers/);
  assert.match(line, /curveMonotoneX/);
  assert.doesNotMatch(line, /curveNatural/);
});
