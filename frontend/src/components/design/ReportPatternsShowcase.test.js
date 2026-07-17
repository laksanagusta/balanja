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
  assert.match(design, /one-day sales-report trends use hourly WIB labels/i);
  assert.match(design, /bounded chart height/i);
  assert.match(design, /dashboard revenue.*localized.*Rupiah/i);
  assert.match(showcase, /2026-07-17T\$\{String\(hour\)\.padStart/);
  assert.match(showcase, /Tampilan per jam/);
});
