import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard revenue trend stays localized, bounded, and visibly marked", async () => {
  const dashboard = await readFile(new URL("./DashboardCharts.jsx", import.meta.url), "utf8");
  assert.match(dashboard, /xLabelKey="label"/);
  assert.match(dashboard, /TooltipContent/);
  assert.match(dashboard, /formatPrice/);
  assert.match(dashboard, /aspectRatio=\{null\}/);
  assert.match(dashboard, /h-\[250px\] md:h-\[280px\]/);
  assert.match(dashboard, /showMarkers/);
});
