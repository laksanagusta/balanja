import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("report components expose comparisons, dual trend, breakdowns, and accessible controls", async () => {
  const [metric, trend, breakdowns, toolbar] = await Promise.all([
    readFile(new URL("./ReportMetricCard.jsx", import.meta.url), "utf8"),
    readFile(new URL("./SalesTrendPanel.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ReportBreakdownPanels.jsx", import.meta.url), "utf8"),
    readFile(new URL("./SalesReportToolbar.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(metric, /comparisonCopy/);
  assert.match(trend, /dataKey="current"/);
  assert.match(trend, /dataKey="previous"/);
  assert.match(trend, /Periode sebelumnya/);
  assert.match(breakdowns, /Penjualan bersih/);
  assert.match(breakdowns, /Transaksi void/);
  for (const label of ["Hari ini", "7 hari", "30 hari", "Bulan ini", "Rentang khusus"]) assert.match(toolbar, new RegExp(label));
  assert.match(toolbar, /aria-pressed/);
  assert.match(toolbar, /CSV harian/);
  assert.match(toolbar, /CSV transaksi/);
  assert.match(toolbar, /filter aktif/);
	assert.match(toolbar, /label="Tanggal dari"/);
	assert.match(toolbar, /error=\{error\}/);
	assert.match(toolbar, /aria-label="Ekspor ringkasan harian CSV"/);
	assert.match(toolbar, /aria-label="Ekspor detail transaksi CSV"/);
	const primitives = await readFile(new URL("../primitives.jsx", import.meta.url), "utf8");
	assert.match(primitives, /aria-expanded=\{isOpen\}/);
	assert.match(primitives, /focus-visible:outline-2/);
});
