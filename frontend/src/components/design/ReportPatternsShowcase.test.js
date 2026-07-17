import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system documents production sales report patterns", async () => {
  const [page, design, showcase] = await Promise.all([
    readFile(new URL("../../pages/DesignSystemPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8"),
    readFile(new URL("./ReportPatternsShowcase.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /ReportPatternsShowcase/);
  assert.match(showcase, /ReportMetricCard/);
  assert.match(showcase, /VoidReportPanel/);
  assert.match(showcase, /<VoidReportPanel[\s\S]*<ReportBreakdownPanels/);
  assert.match(design, /Sales reports/);
  assert.match(design, /last-successful filter snapshot/);
  assert.match(design, /neutral segmented selection/);
  assert.match(design, /harga snapshot × kuantitas/);
  assert.match(design, /pajak.*transaksi/i);
});
