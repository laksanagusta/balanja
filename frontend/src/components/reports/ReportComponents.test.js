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
  assert.doesNotMatch(metric, /className="[^"]*truncate/);
  assert.match(metric, /overflow-wrap:anywhere/);
  assert.match(trend, /dataKey="current"/);
  assert.match(trend, /dataKey="previous"/);
  assert.match(trend, /xDataKey="date"/);
  assert.match(trend, /xLabelKey="label"/);
  assert.doesNotMatch(trend, /showMarkers/);
  assert.match(trend, /strokeDasharray="6 5"/);
  assert.doesNotMatch(trend, /dashFromIndex/);
  assert.match(trend, /showDots=\{false\}/);
  assert.match(trend, /aspectRatio=\{null\}/);
  assert.match(trend, /h-\[260px\] md:h-\[320px\]/);
  assert.match(trend, /TooltipContent/);
  assert.match(trend, /<table[^>]*className="sr-only"/);
  assert.match(trend, /<caption/);
  assert.match(trend, /data\.map/);
  assert.match(trend, /formatPrice\(point\.current\)/);
  assert.match(trend, /formatPrice\(point\.previous\)/);
  assert.match(trend, /formatPrice/);
  assert.match(trend, /Periode ini/);
  assert.match(trend, /Periode sebelumnya/);
  assert.match(breakdowns, /Penjualan bersih/);
  assert.match(breakdowns, /Transaksi void/);
  assert.doesNotMatch(breakdowns, /showVoids/);
  for (const label of ["Hari ini", "7 hari", "30 hari", "Bulan ini", "Rentang khusus"]) assert.match(toolbar, new RegExp(label));
  assert.match(toolbar, /aria-pressed/);
  assert.match(toolbar, /<form/);
  assert.match(toolbar, /onSubmit/);
  assert.match(toolbar, /type="submit"/);
  assert.match(toolbar, /size="sm" compactVisual/);
  assert.doesNotMatch(toolbar, /h-11 md:h-8/);
  assert.match(toolbar, /Perubahan belum diterapkan/);
  assert.match(toolbar, /aria-expanded=\{filtersExpanded\}/);
  assert.match(toolbar, /aria-controls=\{filterPanelId\}/);
  assert.match(toolbar, /md:hidden/);
  assert.match(toolbar, /max-h-\[min\(70svh,32rem\)\]/);
  assert.match(toolbar, /md:max-h-none/);
  assert.match(toolbar, /refreshError/);
  assert.match(toolbar, /actionsDisabled/);
  assert.match(toolbar, /CSV harian/);
  assert.match(toolbar, /CSV transaksi/);
  assert.match(toolbar, /filter aktif/);
	assert.match(toolbar, /label="Tanggal dari"/);
	assert.match(toolbar, /error=\{error\}/);
	assert.match(toolbar, /aria-label="Ekspor ringkasan harian CSV"/);
	assert.match(toolbar, /aria-label="Ekspor detail transaksi CSV"/);
	const primitives = await readFile(new URL("../primitives.jsx", import.meta.url), "utf8");
	assert.match(primitives, /aria-expanded=\{isOpen\}/);
	assert.match(primitives, /aria-haspopup="listbox"/);
	assert.match(primitives, /aria-controls=\{listboxId\}/);
	assert.match(primitives, /role="listbox"/);
	assert.match(primitives, /role="option"/);
	assert.match(primitives, /aria-selected/);
	assert.match(primitives, /document\.addEventListener\("pointerdown"/);
	assert.match(primitives, /event\.key === "Escape"/);
	assert.match(primitives, /className="flex h-11 w-full items-center bg-transparent p-0 text-left md:h-9/);
	assert.match(primitives, /className={`flex h-9 w-full items-center justify-between/);
	assert.match(primitives, /className="group flex h-11 w-full items-center bg-transparent p-0 text-left"/);
	assert.match(primitives, /className={`flex h-10 w-full items-center rounded-button/);
	assert.doesNotMatch(primitives, /flex h-11 md:h-9 items-center justify-between/);
	assert.match(primitives, /focus-visible:outline-2/);

	const [lineChart, interaction] = await Promise.all([
		readFile(new URL("../charts/line-chart.jsx", import.meta.url), "utf8"),
		readFile(new URL("../charts/use-chart-interaction.js", import.meta.url), "utf8"),
	]);
	assert.match(lineChart, /useReducedMotion/);
	assert.match(lineChart, /reducedMotion \? 0 : animationDuration/);
	assert.match(lineChart, /touchAction: "pan-y"/);
	assert.doesNotMatch(lineChart, /touchAction: "none"/);
	assert.match(interaction, /touchAction: "pan-y"/);
	assert.match(interaction, /TOUCH_INTENT_THRESHOLD = 10/);
	assert.match(interaction, /touchIntentRef/);
	assert.match(interaction, /Math\.abs\(touch\.clientY - intent\.startY\)/);
	assert.doesNotMatch(interaction, /if \(event\.touches\.length === 1\) \{\s*event\.preventDefault\(\)/);
});
